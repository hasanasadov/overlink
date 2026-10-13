import { db } from "@/lib/db";
import { fail, getUser, json, readJson } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return fail("unauthorized", 401);
  if (!rateLimit(`pw:${user.id}`, 10, 15 * 60_000)) return fail("tooMany", 429);
  const body = await readJson(req);
  const current = typeof body?.current === "string" ? body.current : "";
  const next = typeof body?.next === "string" ? body.next : "";
  if (next.length < 8 || next.length > 200) return fail("weakPassword");

  const row = await db.user.findUnique({ where: { id: user.id } });
  if (!row || !(await verifyPassword(current, row.passwordHash))) return fail("wrongCurrent", 400);
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return json({ ok: true });
}
