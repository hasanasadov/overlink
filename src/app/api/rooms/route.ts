import { db } from "@/lib/db";
import { resolveExpiry } from "@/lib/config";
import { randomToken, sha256 } from "@/lib/codes";
import { fail, getUser, json, readJson } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { CODE_LEN, uniqueCode } from "@/lib/share-code";
import { str } from "@/lib/validate";

export async function POST(req: Request) {
  const user = await getUser();
  if (!rateLimit(`room:${user?.id ?? clientIp(req.headers)}`, 30, 60 * 60_000)) return fail("tooMany", 429);
  const body = await readJson(req);
  const password = typeof body?.password === "string" ? body.password.slice(0, 200) : "";

  const code = await uniqueCode("room", CODE_LEN.room);
  const ownerKey = user ? null : randomToken(24);
  const row = await db.room.create({
    data: {
      code,
      title: str(body?.title, 120) || null,
      passwordHash: password ? await hashPassword(password) : null,
      userId: user?.id ?? null,
      ownerKeyHash: ownerKey ? sha256(ownerKey) : null,
      expiresAt: resolveExpiry(body?.expiresIn, body?.expiresInSeconds),
    },
  });
  return json({ code, ownerKey, expiresAt: row.expiresAt });
}
