import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/admin";
import { json } from "@/lib/http";

export async function POST() {
  (await cookies()).delete(ADMIN_COOKIE);
  return json({ ok: true });
}
