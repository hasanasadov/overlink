import { cleanupExpired } from "@/lib/cleanup";
import { fail, json } from "@/lib/http";

async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return fail("unauthorized", 401);
  return json(await cleanupExpired());
}

export const POST = run;
export const GET = run;
