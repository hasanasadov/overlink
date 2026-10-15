import { db } from "@/lib/db";
import { ADMIN_COOKIE, adminConfigured, checkPasscode, makeAdminToken } from "@/lib/admin";
import { sha256 } from "@/lib/codes";
import { fail, json, readJson } from "@/lib/http";
import { clientIp } from "@/lib/ratelimit";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const WINDOW_MS = 15 * 60_000;

export async function POST(req: Request) {
  if (!adminConfigured()) return fail("notConfigured", 503);

  // An 8-digit code is guessable, so failed attempts are counted in Postgres: 5 per IP and 40 overall per 15 minutes.
  const ipHash = sha256(clientIp(req.headers));
  const since = new Date(Date.now() - WINDOW_MS);
  const [mine, all] = await Promise.all([
    db.adminAttempt.count({ where: { ipHash, createdAt: { gt: since } } }),
    db.adminAttempt.count({ where: { createdAt: { gt: since } } }),
  ]);
  if (mine >= 5 || all >= 40) return fail("locked", 429);

  const body = await readJson<{ code?: unknown }>(req);
  const code = typeof body?.code === "string" ? body.code : "";
  if (!checkPasscode(code)) {
    await db.adminAttempt.create({ data: { ipHash } });
    return fail("wrong", 401);
  }

  const { token, expires } = makeAdminToken();
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
  return json({ ok: true });
}
