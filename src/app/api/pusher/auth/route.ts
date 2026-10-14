import { db } from "@/lib/db";
import { isValidCode, randomToken, sha256 } from "@/lib/codes";
import { limits } from "@/lib/config";
import { fail, getUser, json } from "@/lib/http";
import { verifyPassword } from "@/lib/password";
import { pusherConfigured, pusherServer } from "@/lib/pusher-server";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// pusher-js can only surface the HTTP status of a failed auth, so each reason has its own status:
// 401 password required · 403 wrong password · 404 not found / expired · 409 room full · 429 too many
export async function POST(req: Request) {
  if (!pusherConfigured()) return fail("realtimeNotConfigured", 503);
  const form = await req.formData().catch(() => null);
  const socketId = String(form?.get("socket_id") ?? "");
  const channel = String(form?.get("channel_name") ?? "");
  const rawName = String(form?.get("name") ?? "");
  const name = rawName.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 40) || "Guest";

  const m = channel.match(/^presence-(room|code)-(.+)$/);
  if (!socketId || !m || !isValidCode(m[2])) return fail("badChannel", 400);
  const [, kind, code] = m;
  const ip = clientIp(req.headers);
  if (!rateLimit(`pusher-auth:${ip}:${code}`, 60, 10 * 60_000)) return fail("tooMany", 429);

  const pusher = pusherServer();
  const userId = randomToken(9);
  let info: Record<string, unknown> = { name };

  if (kind === "code") {
    const row = await db.codeShare.findUnique({ where: { code }, select: { expiresAt: true } });
    if (!row || row.expiresAt < new Date()) return fail("notFound", 404);
  } else {
    const room = await db.room.findUnique({ where: { code } });
    if (!room || room.expiresAt < new Date()) return fail("notFound", 404);

    if (room.passwordHash) {
      const pw = String(form?.get("password") ?? "");
      if (!pw) return fail("password", 401);
      if (!rateLimit(`room-pw:${ip}:${code}`, 8, 10 * 60_000)) return fail("tooMany", 429);
      if (!(await verifyPassword(pw, room.passwordHash))) return fail("wrongPassword", 403);
    }

    const user = await getUser();
    const ownerKey = String(form?.get("ownerKey") ?? "");
    const host = (!!user && room.userId === user.id) || (!!ownerKey && !!room.ownerKeyHash && sha256(ownerKey) === room.ownerKeyHash);
    info = { name, host };

    try {
      const res = await pusher.get({ path: `/channels/${channel}/users` });
      if (res.ok) {
        const { users } = (await res.json()) as { users: unknown[] };
        if (users.length >= limits.maxRoomPeers) return fail("full", 409);
      }
    } catch {
      /* channel info unavailable: don't block joining */
    }
  }

  return json(pusher.authorizeChannel(socketId, channel, { user_id: userId, user_info: info }));
}
