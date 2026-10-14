import type PusherJS from "pusher-js";
import type { Channel } from "pusher-js";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { Bus } from "./bus";
import { createPusher } from "./pusher-client";
import { fromB64, toB64 } from "./b64";

const REMOTE = Symbol("remote");
const FLUSH_MS = 150;
const PERSIST_MS = 2500;

export type YStatus = "connecting" | "connected" | "disconnected";

type Members = { myID: string; count: number; each: (cb: (m: { id: string; info: unknown }) => void) => void };

/**
 * Yjs provider over a Pusher presence channel. Document updates and awareness (cursors)
 * are batched into one client event per flush; Postgres keeps the durable copy.
 */
export class PusherYProvider {
  readonly awareness: awarenessProtocol.Awareness;
  private pusher: PusherJS;
  private channel: Channel;
  private bus: Bus;
  private myId = "";
  private memberIds = new Set<string>();
  private pendingUpdates: Uint8Array[] = [];
  private pendingAwareness = new Set<number>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private dirty = false;

  constructor(
    private code: string,
    private doc: Y.Doc,
    name: string,
    private onStatus: (s: YStatus) => void,
    private onGone: () => void,
  ) {
    this.awareness = new awarenessProtocol.Awareness(doc);
    this.pusher = createPusher({ name });
    this.channel = this.pusher.subscribe(`presence-code-${code}`);
    this.bus = new Bus(this.channel, (from, kind, p) => this.onMessage(from, kind, p));

    this.pusher.connection.bind("state_change", ({ current }: { current: string }) => {
      if (this.destroyed) return;
      this.onStatus(current === "connected" ? "connected" : current === "connecting" || current === "initialized" ? "connecting" : "disconnected");
    });
    this.channel.bind("pusher:subscription_succeeded", (members: Members) => {
      this.myId = members.myID;
      this.memberIds.clear();
      members.each((m) => this.memberIds.add(m.id));
      this.awareness.setLocalStateField("pid", this.myId);
      this.onStatus("connected");
      // Ask peers for what we missed since the Postgres snapshot, and announce ourselves.
      this.bus.send("sync-req", { sv: toB64(Y.encodeStateVector(this.doc)) });
      this.queueAwareness([this.doc.clientID]);
      this.pushState();
    });
    this.channel.bind("pusher:subscription_error", (err: { status?: number }) => {
      if (err?.status === 404) this.onGone();
      else this.onStatus("disconnected");
    });
    this.channel.bind("pusher:member_added", (m: { id: string }) => {
      this.memberIds.add(m.id);
      this.queueAwareness([this.doc.clientID]); // let the newcomer see our cursor
    });
    this.channel.bind("pusher:member_removed", (m: { id: string }) => {
      this.memberIds.delete(m.id);
      const gone: number[] = [];
      this.awareness.getStates().forEach((st, clientId) => {
        if ((st as { pid?: string }).pid === m.id) gone.push(clientId);
      });
      if (gone.length) awarenessProtocol.removeAwarenessStates(this.awareness, gone, REMOTE);
    });

    doc.on("update", this.onDocUpdate);
    this.awareness.on("update", this.onAwarenessUpdate);
    window.addEventListener("pagehide", this.onPageHide);
  }

  private onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === REMOTE) return;
    this.pendingUpdates.push(update);
    this.dirty = true;
    this.scheduleFlush();
    this.schedulePersist();
  };

  private onAwarenessUpdate = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (origin === REMOTE) return;
    this.queueAwareness(added.concat(updated, removed));
  };

  private queueAwareness(ids: number[]) {
    ids.forEach((id) => this.pendingAwareness.add(id));
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.flushTimer || this.destroyed) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      const msg: { u?: string; a?: string } = {};
      if (this.pendingUpdates.length) {
        msg.u = toB64(Y.mergeUpdates(this.pendingUpdates));
        this.pendingUpdates = [];
      }
      if (this.pendingAwareness.size) {
        msg.a = toB64(awarenessProtocol.encodeAwarenessUpdate(this.awareness, Array.from(this.pendingAwareness)));
        this.pendingAwareness.clear();
      }
      if (msg.u || msg.a) this.bus.send("u", msg);
    }, FLUSH_MS);
  }

  private onMessage(from: string, kind: string, p: any) {
    if (kind === "u") {
      if (p.u) Y.applyUpdate(this.doc, fromB64(p.u), REMOTE);
      if (p.a) awarenessProtocol.applyAwarenessUpdate(this.awareness, fromB64(p.a), REMOTE);
    } else if (kind === "sync-req") {
      // Only the peer with the smallest id answers, so the requester gets one reply, not N.
      const others = Array.from(this.memberIds).filter((id) => id !== from).sort();
      if (others[0] !== this.myId) return;
      const diff = Y.encodeStateAsUpdate(this.doc, fromB64(p.sv));
      this.bus.send("u", {
        u: toB64(diff),
        a: toB64(awarenessProtocol.encodeAwarenessUpdate(this.awareness, Array.from(this.awareness.getStates().keys()))),
      });
    }
  }

  /** Loads the durable snapshot from Postgres (call before the editor is shown). */
  async loadSnapshot(): Promise<void> {
    const res = await fetch(`/api/code/${this.code}/state`, { cache: "no-store" });
    if (res.status === 404) return this.onGone();
    const data = await res.json();
    if (data.state) Y.applyUpdate(this.doc, fromB64(data.state), REMOTE);
  }

  private schedulePersist() {
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.pushState();
    }, PERSIST_MS);
  }

  private async pushState(keepalive = false) {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      await fetch(`/api/code/${this.code}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ update: toB64(Y.encodeStateAsUpdate(this.doc)) }),
        keepalive,
      });
    } catch {
      this.dirty = true;
    }
  }

  private onPageHide = () => void this.pushState(true);

  destroy() {
    this.destroyed = true;
    window.removeEventListener("pagehide", this.onPageHide);
    this.doc.off("update", this.onDocUpdate);
    this.awareness.off("update", this.onAwarenessUpdate);
    if (this.flushTimer) clearTimeout(this.flushTimer);
    if (this.persistTimer) clearTimeout(this.persistTimer);
    void this.pushState(true);
    this.awareness.setLocalState(null);
    this.bus.destroy();
    this.pusher.disconnect();
    this.awareness.destroy();
  }
}
