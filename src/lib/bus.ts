import type { Channel } from "pusher-js";

// Pusher client events are limited to ~10 KB and 10 messages/second per client.
// Bus chunks big payloads and drains an outgoing queue at a safe rate.
const CHUNK = 4500;
const INTERVAL_MS = 115;
const EVENT = "client-m";

type Chunk = { id: string; i: number; n: number; s: string };
export type BusHandler = (fromId: string, kind: string, payload: any) => void;

let counter = 0;

export class Bus {
  private queue: Chunk[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private partial = new Map<string, { parts: string[]; got: number }>();
  private onEvent = (data: Chunk, meta?: { user_id?: string }) => {
    const from = meta?.user_id;
    if (!from || !data || typeof data.n !== "number") return;
    if (data.n === 1) return this.dispatch(from, data.s);
    const key = `${from}:${data.id}`;
    const entry = this.partial.get(key) ?? { parts: new Array(data.n).fill(""), got: 0 };
    if (!entry.parts[data.i]) entry.got++;
    entry.parts[data.i] = data.s;
    this.partial.set(key, entry);
    if (entry.got === data.n) {
      this.partial.delete(key);
      this.dispatch(from, entry.parts.join(""));
    }
  };

  constructor(private channel: Channel, private handler: BusHandler) {
    channel.bind(EVENT, this.onEvent);
    this.timer = setInterval(() => this.drain(), INTERVAL_MS);
  }

  private dispatch(from: string, raw: string) {
    try {
      const m = JSON.parse(raw) as { k: string; p: unknown };
      this.handler(from, m.k, m.p);
    } catch {
      /* ignore malformed */
    }
  }

  private drain() {
    const next = this.queue.shift();
    if (!next) return;
    try {
      this.channel.trigger(EVENT, next);
    } catch {
      /* channel not subscribed yet / connection down: drop */
    }
  }

  send(kind: string, payload: unknown) {
    const raw = JSON.stringify({ k: kind, p: payload });
    const id = `${Date.now().toString(36)}${(counter++).toString(36)}`;
    const n = Math.max(1, Math.ceil(raw.length / CHUNK));
    for (let i = 0; i < n; i++) this.queue.push({ id, i, n, s: raw.slice(i * CHUNK, (i + 1) * CHUNK) });
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
    this.channel.unbind(EVENT, this.onEvent);
    this.queue = [];
  }
}
