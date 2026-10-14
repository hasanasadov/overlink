import * as Y from "yjs";
import { db } from "@/lib/db";
import { CODE_LANGUAGES, resolveExpiry } from "@/lib/config";
import { randomToken, sha256 } from "@/lib/codes";
import { fail, getUser, json, readJson } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { CODE_LEN, uniqueCode } from "@/lib/share-code";
import { str } from "@/lib/validate";

export async function POST(req: Request) {
  const user = await getUser();
  if (!rateLimit(`code:${user?.id ?? clientIp(req.headers)}`, 30, 60 * 60_000)) return fail("tooMany", 429);
  const body = await readJson(req);
  const language = CODE_LANGUAGES.find((l) => l === body?.language) ?? "javascript";

  const doc = new Y.Doc();
  doc.getMap("meta").set("language", language);
  const code = await uniqueCode("code", CODE_LEN.code);
  const ownerKey = user ? null : randomToken(24);
  const row = await db.codeShare.create({
    data: {
      code,
      language,
      state: Buffer.from(Y.encodeStateAsUpdate(doc)),
      title: str(body?.title, 120) || null,
      userId: user?.id ?? null,
      ownerKeyHash: ownerKey ? sha256(ownerKey) : null,
      expiresAt: resolveExpiry(body?.expiresIn, body?.expiresInSeconds),
    },
  });
  return json({ code, ownerKey, expiresAt: row.expiresAt });
}
