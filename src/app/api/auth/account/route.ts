import { db } from "@/lib/db";
import { destroySession } from "@/lib/auth";
import { fail, getUser, json } from "@/lib/http";
import { deleteObjects } from "@/lib/r2";

export async function DELETE() {
  const user = await getUser();
  if (!user) return fail("unauthorized", 401);

  const files = await db.shareFile.findMany({ where: { share: { userId: user.id } }, select: { key: true } });
  if (files.length) await deleteObjects(files.map((f) => f.key));
  await db.$transaction([
    db.share.deleteMany({ where: { userId: user.id } }),
    db.codeShare.deleteMany({ where: { userId: user.id } }),
    db.room.deleteMany({ where: { userId: user.id } }),
  ]);
  await destroySession();
  await db.user.delete({ where: { id: user.id } });
  return json({ ok: true });
}
