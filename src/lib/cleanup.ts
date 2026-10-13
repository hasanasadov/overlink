import { db } from "./db";
import { deleteObjects } from "./r2";

export type CleanupResult = { shares: number; files: number; codes: number; rooms: number; sessions: number };

/** Removes expired content from Postgres and Cloudflare R2. Safe to run repeatedly. */
export async function cleanupExpired(): Promise<CleanupResult> {
  const now = new Date();
  const staleUnfinished = new Date(Date.now() - 60 * 60 * 1000);

  const shares = await db.share.findMany({
    where: { OR: [{ expiresAt: { lt: now } }, { ready: false, createdAt: { lt: staleUnfinished } }] },
    include: { files: { select: { key: true } } },
    take: 200,
  });

  let files = 0;
  if (shares.length) {
    const keys = shares.flatMap((s) => s.files.map((f) => f.key));
    if (keys.length) {
      await deleteObjects(keys); // R2 first: if this throws we retry next run and never orphan objects
      files = keys.length;
    }
    await db.share.deleteMany({ where: { id: { in: shares.map((s) => s.id) } } });
  }

  const [codes, rooms, sessions] = await Promise.all([
    db.codeShare.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.room.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);
  await db.passwordReset.deleteMany({ where: { expiresAt: { lt: now } } });

  return { shares: shares.length, files, codes: codes.count, rooms: rooms.count, sessions: sessions.count };
}
