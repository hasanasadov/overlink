import { db } from "@/lib/db";
import { fail, getUser, isOwner, json } from "@/lib/http";

export async function DELETE(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const user = await getUser();
  const row = await db.codeShare.findUnique({ where: { code } });
  if (!row) return fail("notFound", 404);
  if (!isOwner(row, user, req.headers.get("x-owner-key"))) return fail("forbidden", 403);
  await db.codeShare.delete({ where: { id: row.id } });
  return json({ ok: true });
}
