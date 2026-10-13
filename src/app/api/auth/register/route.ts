import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { fail, json, readJson } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { EMAIL_RE, str } from "@/lib/validate";

export async function POST(req: Request) {
  if (!rateLimit(`register:${clientIp(req.headers)}`, 10, 60 * 60_000)) return fail("tooMany", 429);
  const body = await readJson(req);
  const name = str(body?.name, 80);
  const email = str(body?.email, 200).toLowerCase();
  const password = typeof body?.password === "string" ? body.password : "";
  if (!name) return fail("nameRequired");
  if (!EMAIL_RE.test(email)) return fail("invalidEmail");
  if (password.length < 8 || password.length > 200) return fail("weakPassword");
  if (await db.user.findUnique({ where: { email } })) return fail("emailTaken", 409);

  const user = await db.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });
  await createSession(user.id);
  return json({ user: { id: user.id, name: user.name, email: user.email } });
}
