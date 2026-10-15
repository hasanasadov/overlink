import { cookies } from "next/headers";
import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "ol_admin";
const TTL_MS = 8 * 60 * 60 * 1000;

const passcode = () => process.env.ADMIN_PASSCODE || "";
export const adminConfigured = () => /^\d{8}$/.test(passcode());

// Signing key is derived from the passcode itself, so changing the passcode signs everyone out.
const key = () => createHash("sha256").update(`overlink-admin:${passcode()}:${process.env.CRON_SECRET || ""}`).digest();
const sign = (payload: string) => createHmac("sha256", key()).update(payload).digest("base64url");

export function checkPasscode(input: string): boolean {
  if (!adminConfigured() || !/^\d{8}$/.test(input)) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(passcode()).digest();
  return timingSafeEqual(a, b);
}

export function makeAdminToken(): { token: string; expires: Date } {
  const exp = Date.now() + TTL_MS;
  return { token: `${exp}.${sign(String(exp))}`, expires: new Date(exp) };
}

function validToken(token: string | undefined): boolean {
  if (!token || !adminConfigured()) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = Buffer.from(sign(exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return validToken(jar.get(ADMIN_COOKIE)?.value);
}
