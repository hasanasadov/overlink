import { db } from "@/lib/db";
import { fail, getUser, json, readJson } from "@/lib/http";
import { str } from "@/lib/validate";

export async function PATCH(req: Request) {
  const user = await getUser();
  if (!user) return fail("unauthorized", 401);
  const body = await readJson(req);
  const name = str(body?.name, 80);
  if (!name) return fail("nameRequired");
  await db.user.update({ where: { id: user.id }, data: { name } });
  return json({ ok: true, name });
}
