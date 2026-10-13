import { db } from "@/lib/db";
import { sha256 } from "@/lib/codes";
import { hashPassword } from "@/lib/password";
import { fail, json, readJson } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { str } from "@/lib/validate";

export async function POST(req: Request) {
  if (!rateLimit(`reset:${clientIp(req.headers)}`, 20, 60 * 60_000)) return fail("tooMany", 429);
  const body = await readJson(req);
  const token = str(body?.token, 200);
  const password = typeof body?.password === "string" ? body.password : "";
  if (password.length < 8 || password.length > 200) return fail("weakPassword");

  const reset = token ? await db.passwordReset.findUnique({ where: { tokenHash: sha256(token) } }) : null;
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) return fail("invalidToken", 400);

  await db.$transaction([
    db.user.update({ where: { id: reset.userId }, data: { passwordHash: await hashPassword(password) } }),
    db.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: reset.userId } }), // sign out everywhere
  ]);
  return json({ ok: true });
}
