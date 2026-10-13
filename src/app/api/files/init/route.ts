import { db } from "@/lib/db";
import { limits, resolveExpiry } from "@/lib/config";
import { randomToken, sha256 } from "@/lib/codes";
import { fail, getUser, json, readJson } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { CODE_LEN, uniqueCode } from "@/lib/share-code";
import { str } from "@/lib/validate";

export async function POST(req: Request) {
  const user = await getUser();
  if (!rateLimit(`files-init:${user?.id ?? clientIp(req.headers)}`, 30, 60 * 60_000)) return fail("tooMany", 429);

  const body = await readJson<{ files?: { name?: unknown; size?: unknown; type?: unknown }[]; expiresIn?: unknown; title?: unknown }>(req);
  const list = Array.isArray(body?.files) ? body.files : [];
  if (!list.length) return fail("noFiles");
  if (list.length > limits.filesPerShare) return fail("tooMany");

  const maxBytes = user ? limits.userFileBytes : limits.anonFileBytes;
  const files = list.map((f) => ({
    name: str(f.name, 200).replace(/[\\/\u0000-\u001f]/g, "_") || "file",
    size: typeof f.size === "number" && Number.isFinite(f.size) ? Math.floor(f.size) : -1,
    mime: str(f.type, 100) || "application/octet-stream",
  }));
  if (files.some((f) => f.size < 0 || f.size > maxBytes)) return fail("tooLarge");

  const code = await uniqueCode("share", CODE_LEN.share);
  const ownerKey = user ? null : randomToken(24);
  const share = await db.share.create({
    data: {
      code,
      userId: user?.id ?? null,
      ownerKeyHash: ownerKey ? sha256(ownerKey) : null,
      title: str(body?.title, 120) || null,
      expiresAt: resolveExpiry(body?.expiresIn, !!user),
      files: { create: files.map((f) => ({ name: f.name, size: BigInt(f.size), mime: f.mime, key: `shares/${code}/${randomToken(9)}` })) },
    },
    include: { files: true },
  });

  return json({
    code,
    ownerKey,
    expiresAt: share.expiresAt,
    files: share.files.map((f) => ({ id: f.id, name: f.name })),
  });
}
