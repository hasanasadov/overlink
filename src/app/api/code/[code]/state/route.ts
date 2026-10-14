import * as Y from "yjs";
import { db } from "@/lib/db";
import { isValidCode } from "@/lib/codes";
import { limits } from "@/lib/config";
import { fail, json, readJson } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

async function live(code: string) {
  if (!isValidCode(code)) return null;
  const row = await db.codeShare.findUnique({ where: { code } });
  return row && row.expiresAt > new Date() ? row : null;
}

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  if (!rateLimit(`code-state-get:${clientIp(req.headers)}`, 120, 60_000)) return fail("tooMany", 429);
  const row = await live(code);
  if (!row) return fail("notFound", 404);
  return json({ state: row.state ? Buffer.from(row.state).toString("base64") : null, language: row.language });
}

// Clients push their full document; we CRDT-merge it into the stored copy so concurrent writers never clobber each other.
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  if (!rateLimit(`code-state-post:${clientIp(req.headers)}:${code}`, 40, 60_000)) return fail("tooMany", 429);
  const row = await live(code);
  if (!row) return fail("notFound", 404);

  const body = await readJson<{ update?: unknown }>(req);
  if (typeof body?.update !== "string" || body.update.length > limits.maxCodeBytes * 2) return fail("badRequest", 400);
  const incoming = new Uint8Array(Buffer.from(body.update, "base64"));

  let merged: Uint8Array;
  const doc = new Y.Doc();
  try {
    merged = row.state ? Y.mergeUpdates([new Uint8Array(row.state), incoming]) : incoming;
    Y.applyUpdate(doc, merged);
  } catch {
    return fail("badUpdate", 400);
  }
  const text = doc.getText("code").toString();
  if (text.length > limits.maxCodeBytes) return fail("tooLarge", 413);
  const language = String(doc.getMap("meta").get("language") ?? row.language);

  await db.codeShare.update({ where: { id: row.id }, data: { state: Buffer.from(merged), preview: text.slice(0, 400), language } });
  return json({ ok: true });
}
