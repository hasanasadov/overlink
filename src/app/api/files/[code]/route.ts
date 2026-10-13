import { db } from "@/lib/db";
import { fail, getUser, isOwner, json } from "@/lib/http";
import { deleteObjects } from "@/lib/r2";

export async function DELETE(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const user = await getUser();
  const share = await db.share.findUnique({ where: { code }, include: { files: { select: { key: true } } } });
  if (!share) return fail("notFound", 404);
  if (!isOwner(share, user, req.headers.get("x-owner-key"))) return fail("forbidden", 403);

  await deleteObjects(share.files.map((f) => f.key));
  await db.share.delete({ where: { id: share.id } });
  return json({ ok: true });
}
