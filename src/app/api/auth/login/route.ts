import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { fail, json, readJson } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { str } from "@/lib/validate";

export async function POST(req: Request) {
  const body = await readJson(req);
  const email = str(body?.email, 200).toLowerCase();
  const password = typeof body?.password === "string" ? body.password : "";
  if (!rateLimit(`login:${clientIp(req.headers)}`, 20, 15 * 60_000) || !rateLimit(`login:${email}`, 8, 15 * 60_000)) {
    return fail("tooMany", 429);
  }
  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  // Always run a verification so timing doesn't reveal whether the account exists.
  const ok = await verifyPassword(password, user?.passwordHash ?? "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
  if (!user || !ok) return fail("invalidCredentials", 401);
  await createSession(user.id);
  return json({ user: { id: user.id, name: user.name, email: user.email } });
}
