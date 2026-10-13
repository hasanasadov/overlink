import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signedDownloadUrl } from "@/lib/r2";

export const dynamic = "force-dynamic";

// Short download links: /f/<code>/d/<fileId>  (add ?inline=1 to preview in the browser)
export async function GET(req: Request, ctx: { params: Promise<{ code: string; fileId: string }> }) {
  const { code, fileId } = await ctx.params;
  const file = await db.shareFile.findFirst({
    where: { id: fileId, share: { code, ready: true, expiresAt: { gt: new Date() } } },
  });
  if (!file) return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

  const inline = new URL(req.url).searchParams.get("inline") === "1";
  if (!inline) await db.share.update({ where: { code }, data: { downloads: { increment: 1 } } });

  const safeInline = inline && /^(image\/(png|jpe?g|gif|webp|avif)|video\/(mp4|webm)|audio\/|application\/pdf|text\/plain)/.test(file.mime);
  const url = await signedDownloadUrl(file.key, file.name, file.mime, safeInline);
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "no-store" } });
}
