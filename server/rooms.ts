import type { IncomingMessage } from "node:http";
import { randomBytes } from "node:crypto";
import type { WebSocket } from "ws";
import { db } from "../src/lib/db";
import { parseCookie, userFromToken, SESSION_COOKIE } from "../src/lib/session";
import { sha256 } from "../src/lib/codes";
import { verifyPassword } from "../src/lib/password";
import { rateLimit } from "../src/lib/ratelimit";
import { limits } from "../src/lib/config";

type Peer = { id: string; name: string; ws: WebSocket; host: boolean; sharing: boolean; audio: boolean };
type ChatMsg = { id: string; from: string | null; name: string; text: string; ts: number; system?: "joined" | "left" | "started" };
type RoomState = { code: string; title: string | null; expiresAt: Date; peers: Map<string, Peer>; chat: ChatMsg[] };

const rooms = new Map<string, RoomState>();

const publicPeer = (p: Peer) => ({ id: p.id, name: p.name, host: p.host, sharing: p.sharing, audio: p.audio });
const sendJson = (ws: WebSocket, data: unknown) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(data));
const broadcast = (room: RoomState, data: unknown, except?: string) => {
  const raw = JSON.stringify(data);
  for (const p of room.peers.values()) if (p.id !== except && p.ws.readyState === p.ws.OPEN) p.ws.send(raw);
};
const cleanName = (v: unknown) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 40) : "") || "Guest";
const newId = () => randomBytes(6).toString("base64url");

function addChat(room: RoomState, msg: Omit<ChatMsg, "id" | "ts">) {
  const full: ChatMsg = { id: newId(), ts: Date.now(), ...msg };
  room.chat.push(full);
  if (room.chat.length > 200) room.chat.shift();
  broadcast(room, { t: "chat", msg: full });
}

export function handleRoomConnection(ws: WebSocket, req: IncomingMessage, code: string, ip: string) {
  let peer: Peer | null = null;
  let room: RoomState | null = null;
  let joining = false;
  const chatHits: number[] = [];

  const joinTimeout = setTimeout(() => !peer && ws.close(4408, "join-timeout"), 10_000);

  let alive = true;
  ws.on("pong", () => (alive = true));
  const ping = setInterval(() => {
    if (!alive) return ws.terminate();
    alive = false;
    ws.ping();
  }, 25_000);

  async function join(msg: Record<string, unknown>) {
    if (joining || peer) return;
    joining = true;
    try {
      if (!rateLimit(`room-join:${ip}:${code}`, 30, 10 * 60_000)) return reject("tooMany");
      const row = await db.room.findUnique({ where: { code } });
      if (!row || row.expiresAt < new Date()) return reject("notFound");

      if (row.passwordHash) {
        const pw = typeof msg.password === "string" ? msg.password : "";
        if (!pw) return reject("password");
        if (!rateLimit(`room-pw:${ip}:${code}`, 8, 10 * 60_000)) return reject("tooMany");
        if (!(await verifyPassword(pw, row.passwordHash))) return reject("wrongPassword");
      }

      const user = await userFromToken(parseCookie(req.headers.cookie, SESSION_COOKIE));
      const ownerKey = typeof msg.ownerKey === "string" ? msg.ownerKey : "";
      const host = (!!user && row.userId === user.id) || (!!ownerKey && !!row.ownerKeyHash && sha256(ownerKey) === row.ownerKeyHash);

      room = rooms.get(code) ?? { code, title: row.title, expiresAt: row.expiresAt, peers: new Map(), chat: [] };
      if (room.peers.size >= limits.maxRoomPeers) return reject("full");
      rooms.set(code, room);

      peer = { id: newId(), name: cleanName(msg.name), ws, host, sharing: false, audio: false };
      room.peers.set(peer.id, peer);
      clearTimeout(joinTimeout);

      sendJson(ws, {
        t: "joined",
        id: peer.id,
        host,
        title: room.title,
        expiresAt: room.expiresAt,
        peers: Array.from(room.peers.values()).map(publicPeer),
        chat: room.chat,
      });
      broadcast(room, { t: "peer-joined", peer: publicPeer(peer) }, peer.id);
      addChat(room, { from: peer.id, name: peer.name, text: "", system: "joined" });
    } catch (e) {
      console.error("[room] join failed", e);
      reject("error");
    } finally {
      joining = false;
    }
  }

  function reject(reason: string) {
    sendJson(ws, { t: "error", reason });
    ws.close(4401, reason);
  }

  ws.on("message", (raw) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.t === "join") return void join(msg);
    if (!peer || !room) return;

    switch (msg.t) {
      case "signal": {
        const target = typeof msg.to === "string" ? room.peers.get(msg.to) : undefined;
        if (target) sendJson(target.ws, { t: "signal", from: peer.id, data: msg.data });
        break;
      }
      case "sharing": {
        const was = peer.sharing;
        peer.sharing = !!msg.value;
        peer.audio = peer.sharing && !!msg.audio;
        broadcast(room, { t: "sharing", id: peer.id, value: peer.sharing, audio: peer.audio });
        if (peer.sharing && !was) addChat(room, { from: peer.id, name: peer.name, text: "", system: "started" });
        break;
      }
      case "chat": {
        const text = typeof msg.text === "string" ? msg.text.trim().slice(0, 1000) : "";
        const now = Date.now();
        while (chatHits.length && now - chatHits[0] > 10_000) chatHits.shift();
        if (!text || chatHits.length >= 12) break;
        chatHits.push(now);
        addChat(room, { from: peer.id, name: peer.name, text });
        break;
      }
      case "kick": {
        if (!peer.host || typeof msg.id !== "string") break;
        const target = room.peers.get(msg.id);
        if (target && target.id !== peer.id) {
          sendJson(target.ws, { t: "kicked" });
          target.ws.close(4403, "kicked");
        }
        break;
      }
      case "end": {
        if (!peer.host) break;
        const state = room;
        void db.room.deleteMany({ where: { code } }).then(() => endRoom(state));
        break;
      }
    }
  });

  ws.on("close", () => {
    clearTimeout(joinTimeout);
    clearInterval(ping);
    if (!peer || !room) return;
    room.peers.delete(peer.id);
    if (room.peers.size === 0) {
      rooms.delete(code);
      return;
    }
    broadcast(room, { t: "peer-left", id: peer.id });
    addChat(room, { from: peer.id, name: peer.name, text: "", system: "left" });
  });
}

function endRoom(room: RoomState) {
  broadcast(room, { t: "ended" });
  for (const p of room.peers.values()) p.ws.close(4410, "ended");
  rooms.delete(room.code);
}

/** Ends live rooms whose DB row was deleted or expired. */
export async function sweepRooms() {
  for (const room of Array.from(rooms.values())) {
    const row = await db.room.findUnique({ where: { code: room.code }, select: { expiresAt: true } });
    if (!row || row.expiresAt < new Date()) endRoom(room);
  }
}
