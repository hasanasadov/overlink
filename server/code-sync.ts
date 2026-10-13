import type { IncomingMessage } from "node:http";
import type { WebSocket } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { db } from "../src/lib/db";

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;
const SAVE_DEBOUNCE_MS = 2000;
const IDLE_UNLOAD_MS = 60_000;

type LiveDoc = {
  code: string;
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<WebSocket, Set<number>>;
  saveTimer: NodeJS.Timeout | null;
  idleTimer: NodeJS.Timeout | null;
  dirty: boolean;
};

const live = new Map<string, LiveDoc>();
const loading = new Map<string, Promise<LiveDoc | null>>();

async function load(code: string): Promise<LiveDoc | null> {
  const row = await db.codeShare.findUnique({ where: { code } });
  if (!row || row.expiresAt < new Date()) return null;

  const doc = new Y.Doc();
  if (row.state) Y.applyUpdate(doc, new Uint8Array(row.state));
  const meta = doc.getMap("meta");
  if (!meta.has("language")) meta.set("language", row.language);

  const awareness = new awarenessProtocol.Awareness(doc);
  awareness.setLocalState(null); // the server itself is not a participant
  const entry: LiveDoc = { code, doc, awareness, conns: new Map(), saveTimer: null, idleTimer: null, dirty: false };

  doc.on("update", (update: Uint8Array, origin: unknown) => {
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MSG_SYNC);
    syncProtocol.writeUpdate(enc, update);
    const msg = encoding.toUint8Array(enc);
    for (const c of entry.conns.keys()) send(c, msg);
    void origin;
    entry.dirty = true;
    scheduleSave(entry);
  });

  awareness.on(
    "update",
    ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
      const conn = origin as WebSocket | null;
      if (conn && entry.conns.has(conn)) {
        const ids = entry.conns.get(conn)!;
        added.forEach((id) => ids.add(id));
        removed.forEach((id) => ids.delete(id));
      }
      const changed = added.concat(updated, removed);
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MSG_AWARENESS);
      encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(awareness, changed));
      const msg = encoding.toUint8Array(enc);
      for (const c of entry.conns.keys()) send(c, msg);
    },
  );

  live.set(code, entry);
  return entry;
}

function getLive(code: string): Promise<LiveDoc | null> {
  const existing = live.get(code);
  if (existing) return Promise.resolve(existing);
  let p = loading.get(code);
  if (!p) {
    p = load(code).finally(() => loading.delete(code));
    loading.set(code, p);
  }
  return p;
}

function send(conn: WebSocket, msg: Uint8Array) {
  if (conn.readyState === conn.OPEN) conn.send(msg, (err) => err && conn.close());
}

function scheduleSave(entry: LiveDoc) {
  if (entry.saveTimer) return;
  entry.saveTimer = setTimeout(() => {
    entry.saveTimer = null;
    void persist(entry);
  }, SAVE_DEBOUNCE_MS);
}

async function persist(entry: LiveDoc) {
  if (!entry.dirty) return;
  entry.dirty = false;
  try {
    const text = entry.doc.getText("code").toString();
    const language = String(entry.doc.getMap("meta").get("language") ?? "javascript");
    await db.codeShare.updateMany({
      where: { code: entry.code },
      data: { state: Buffer.from(Y.encodeStateAsUpdate(entry.doc)), preview: text.slice(0, 400), language },
    });
  } catch (e) {
    entry.dirty = true;
    console.error("[code] persist failed", e);
  }
}

function unload(entry: LiveDoc) {
  if (entry.saveTimer) clearTimeout(entry.saveTimer);
  if (entry.idleTimer) clearTimeout(entry.idleTimer);
  entry.awareness.destroy();
  entry.doc.destroy();
  live.delete(entry.code);
}

export async function handleCodeConnection(ws: WebSocket, _req: IncomingMessage, code: string) {
  ws.binaryType = "arraybuffer";
  // Messages that arrive while we load the document from Postgres are buffered.
  const early: ArrayBuffer[] = [];
  const buffer = (d: ArrayBuffer) => early.push(d);
  ws.on("message", buffer);

  const entry = await getLive(code);
  if (!entry || ws.readyState !== ws.OPEN) {
    ws.close(4404, "not-found");
    return;
  }
  ws.off("message", buffer);

  if (entry.idleTimer) {
    clearTimeout(entry.idleTimer);
    entry.idleTimer = null;
  }
  entry.conns.set(ws, new Set());

  const onMessage = (data: ArrayBuffer) => {
    try {
      const decoder = decoding.createDecoder(new Uint8Array(data));
      const enc = encoding.createEncoder();
      switch (decoding.readVarUint(decoder)) {
        case MSG_SYNC:
          encoding.writeVarUint(enc, MSG_SYNC);
          syncProtocol.readSyncMessage(decoder, enc, entry.doc, ws);
          if (encoding.length(enc) > 1) send(ws, encoding.toUint8Array(enc));
          break;
        case MSG_AWARENESS:
          awarenessProtocol.applyAwarenessUpdate(entry.awareness, decoding.readVarUint8Array(decoder), ws);
          break;
      }
    } catch (e) {
      console.error("[code] bad message", e);
    }
  };
  ws.on("message", onMessage);
  early.forEach(onMessage);

  let alive = true;
  ws.on("pong", () => (alive = true));
  const ping = setInterval(() => {
    if (!alive) return ws.terminate();
    alive = false;
    ws.ping();
  }, 25_000);

  ws.on("close", () => {
    clearInterval(ping);
    const ids = entry.conns.get(ws);
    entry.conns.delete(ws);
    if (ids?.size) awarenessProtocol.removeAwarenessStates(entry.awareness, Array.from(ids), null);
    if (entry.conns.size === 0) {
      void persist(entry);
      entry.idleTimer = setTimeout(() => live.has(code) && entry.conns.size === 0 && unload(entry), IDLE_UNLOAD_MS);
    }
  });

  // Handshake: server sync step 1 + current awareness states.
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, MSG_SYNC);
  syncProtocol.writeSyncStep1(enc, entry.doc);
  send(ws, encoding.toUint8Array(enc));
  const states = entry.awareness.getStates();
  if (states.size) {
    const aenc = encoding.createEncoder();
    encoding.writeVarUint(aenc, MSG_AWARENESS);
    encoding.writeVarUint8Array(aenc, awarenessProtocol.encodeAwarenessUpdate(entry.awareness, Array.from(states.keys())));
    send(ws, encoding.toUint8Array(aenc));
  }
}

/** Drops live documents whose DB row was deleted or expired. */
export async function sweepCodeDocs() {
  for (const entry of Array.from(live.values())) {
    const row = await db.codeShare.findUnique({ where: { code: entry.code }, select: { expiresAt: true } });
    if (!row || row.expiresAt < new Date()) {
      for (const c of entry.conns.keys()) c.close(4410, "expired");
      unload(entry);
    }
  }
}

export async function flushCodeDocs() {
  await Promise.all(Array.from(live.values()).map(persist));
}
