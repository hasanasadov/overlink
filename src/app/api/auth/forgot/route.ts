import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/codes";
import { sendResetEmail } from "@/lib/email";
import { fail, json, readJson } from "@/lib/http";
import { getLocale } from "@/lib/i18n/server";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { EMAIL_RE, str } from "@/lib/validate";

export async function POST(req: Request) {
  const body = await readJson(req);
  const email = str(body?.email, 200).toLowerCase();
  if (!EMAIL_RE.test(email)) return fail("invalidEmail");
  if (!rateLimit(`forgot:${clientIp(req.headers)}`, 10, 60 * 60_000) || !rateLimit(`forgot:${email}`, 3, 60 * 60_000)) {
    return fail("tooMany", 429);
  }

  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    const token = randomToken();
    await db.passwordReset.deleteMany({ where: { userId: user.id } });
    await db.passwordReset.create({
      data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60_000) },
    });
    await sendResetEmail(user.email, user.name, token, await getLocale());
  }
  // Same answer whether or not the account exists (no user enumeration).
  return json({ ok: true });
}
