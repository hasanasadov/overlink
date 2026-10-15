import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { fail, json, readJson } from "@/lib/http";
import { pusherConfigured, pusherServer } from "@/lib/pusher-server";
import { deleteObjects } from "@/lib/r2";

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return fail("unauthorized", 401);
  const body = await readJson<{ kind?: unknown; code?: unknown }>(req);
  const code = typeof body?.code === "string" ? body.code : "";
  if (!code) return fail("badRequest", 400);

  if (body?.kind === "share") {
    const share = await db.share.findUnique({ where: { code }, include: { files: { select: { key: true } } } });
    if (!share) return fail("notFound", 404);
    await deleteObjects(share.files.map((f) => f.key));
    await db.share.delete({ where: { id: share.id } });
  } else if (body?.kind === "code") {
    await db.codeShare.deleteMany({ where: { code } });
  } else if (body?.kind === "room") {
    await db.room.deleteMany({ where: { code } });
    if (pusherConfigured()) await pusherServer().trigger(`presence-room-${code}`, "ended", {}).catch(() => {}); // kicks everyone out
  } else {
    return fail("badRequest", 400);
  }
  return json({ ok: true });
}
