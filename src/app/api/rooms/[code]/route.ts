import { db } from "@/lib/db";
import { fail, getUser, isOwner, json } from "@/lib/http";
import { pusherConfigured, pusherServer } from "@/lib/pusher-server";

export async function DELETE(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const user = await getUser();
  const row = await db.room.findUnique({ where: { code } });
  if (!row) return fail("notFound", 404);
  if (!isOwner(row, user, req.headers.get("x-owner-key"))) return fail("forbidden", 403);
  await db.room.delete({ where: { id: row.id } });
  if (pusherConfigured()) await pusherServer().trigger(`presence-room-${code}`, "ended", {}).catch(() => {});
  return json({ ok: true });
}
