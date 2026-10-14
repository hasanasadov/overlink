import { db } from "@/lib/db";
import { fail, getUser, isOwner, json, readJson } from "@/lib/http";
import { pusherServer } from "@/lib/pusher-server";

// Host-only. The "kick" event is server-sent (clients can only send client-* events), so it can't be spoofed.
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const user = await getUser();
  const row = await db.room.findUnique({ where: { code } });
  if (!row) return fail("notFound", 404);
  if (!isOwner(row, user, req.headers.get("x-owner-key"))) return fail("forbidden", 403);
  const body = await readJson<{ id?: unknown }>(req);
  if (typeof body?.id !== "string") return fail("badRequest", 400);
  await pusherServer().trigger(`presence-room-${code}`, "kick", { id: body.id });
  return json({ ok: true });
}
