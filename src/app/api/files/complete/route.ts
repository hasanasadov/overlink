import { db } from "@/lib/db";
import { fail, getUser, isOwner, json, readJson } from "@/lib/http";
import { headObject, deleteObjects } from "@/lib/r2";
import { str } from "@/lib/validate";

export async function POST(req: Request) {
  const user = await getUser();
  const body = await readJson(req);
  const code = str(body?.code, 20);
  const share = await db.share.findUnique({ where: { code }, include: { files: true } });
  if (!share || share.expiresAt < new Date()) return fail("notFound", 404);
  if (!isOwner(share, user, req.headers.get("x-owner-key"))) return fail("forbidden", 403);

  // Direct-to-R2 uploads can't be size-checked up front, so verify every object here.
  for (const f of share.files) {
    const head = await headObject(f.key);
    if (!head || head.size !== Number(f.size)) {
      await deleteObjects(share.files.map((x) => x.key)).catch(() => {});
      await db.share.delete({ where: { id: share.id } });
      return fail("incomplete", 409);
    }
    await db.shareFile.update({ where: { id: f.id }, data: { uploaded: true } });
  }
  await db.share.update({ where: { id: share.id }, data: { ready: true } });
  return json({ ok: true, code });
}
