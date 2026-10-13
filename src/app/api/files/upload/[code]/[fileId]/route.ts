import { Readable } from "node:stream";
import { db } from "@/lib/db";
import { fail, getUser, isOwner, json } from "@/lib/http";
import { putStream, deleteObject } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request, ctx: { params: Promise<{ code: string; fileId: string }> }) {
  const { code, fileId } = await ctx.params;
  const user = await getUser();
  const share = await db.share.findUnique({ where: { code }, include: { files: { where: { id: fileId } } } });
  const file = share?.files[0];
  if (!share || !file || share.ready || share.expiresAt < new Date()) return fail("notFound", 404);
  if (!isOwner(share, user, req.headers.get("x-owner-key"))) return fail("forbidden", 403);
  if (file.uploaded) return fail("alreadyUploaded", 409);
  if (!req.body) return fail("noBody");

  const declared = Number(file.size);
  const length = Number(req.headers.get("content-length") ?? -1);
  if (length !== declared) return fail("sizeMismatch");

  try {
    await putStream(file.key, Readable.fromWeb(req.body as never), file.mime);
  } catch (e) {
    console.error("[upload] failed", e);
    await deleteObject(file.key).catch(() => {});
    return fail("uploadFailed", 500);
  }
  await db.shareFile.update({ where: { id: file.id }, data: { uploaded: true } });
  return json({ ok: true });
}
