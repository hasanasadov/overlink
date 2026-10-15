import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { fail, json } from "@/lib/http";
import { pusherConfigured, pusherServer } from "@/lib/pusher-server";

export const dynamic = "force-dynamic";

/** Presence channels that currently have people in them: { "presence-room-abc12": 3, ... } */
async function liveChannels(): Promise<{ ok: boolean; counts: Record<string, number> }> {
  if (!pusherConfigured()) return { ok: false, counts: {} };
  try {
    const res = await pusherServer().get({ path: "/channels", params: { filter_by_prefix: "presence-", info: "user_count" } });
    if (!res.ok) return { ok: false, counts: {} };
    const data = (await res.json()) as { channels?: Record<string, { user_count?: number }> };
    return { ok: true, counts: Object.fromEntries(Object.entries(data.channels ?? {}).map(([k, v]) => [k, v.user_count ?? 0])) };
  } catch {
    return { ok: false, counts: {} };
  }
}

export async function GET() {
  if (!(await isAdmin())) return fail("unauthorized", 401);
  const now = new Date();
  const owner = { select: { email: true, name: true } };

  const [shares, codes, rooms, totals, fileTotals, users, live] = await Promise.all([
    db.share.findMany({ where: { ready: true }, orderBy: { createdAt: "desc" }, take: 200, include: { user: owner, files: { select: { name: true, size: true } } } }),
    db.codeShare.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { user: owner } }),
    db.room.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { user: owner } }),
    Promise.all([db.share.count({ where: { ready: true } }), db.codeShare.count(), db.room.count()]),
    db.shareFile.aggregate({ where: { share: { ready: true } }, _sum: { size: true }, _count: true }),
    db.user.count(),
    liveChannels(),
  ]);

  const who = (u: { email: string; name: string } | null) => (u ? { name: u.name, email: u.email } : null);
  const codeRows = codes.map((c) => ({
    code: c.code, title: c.title, language: c.language, preview: c.preview, owner: who(c.user),
    createdAt: c.createdAt, expiresAt: c.expiresAt, live: live.counts[`presence-code-${c.code}`] ?? 0, expired: c.expiresAt < now,
  }));
  const roomRows = rooms.map((r) => ({
    code: r.code, title: r.title, locked: !!r.passwordHash, owner: who(r.user),
    createdAt: r.createdAt, expiresAt: r.expiresAt, live: live.counts[`presence-room-${r.code}`] ?? 0, expired: r.expiresAt < now,
  }));

  return json({
    liveAvailable: live.ok,
    stats: {
      shares: totals[0], files: fileTotals._count, bytes: Number(fileTotals._sum.size ?? 0), users,
      codes: totals[1], rooms: totals[2],
      liveCodes: codeRows.filter((c) => c.live > 0).length, liveRooms: roomRows.filter((r) => r.live > 0).length,
      liveCodePeople: codeRows.reduce((n, c) => n + c.live, 0), liveRoomPeople: roomRows.reduce((n, r) => n + r.live, 0),
    },
    shares: shares.map((s) => ({
      code: s.code, title: s.title, owner: who(s.user), downloads: s.downloads, createdAt: s.createdAt, expiresAt: s.expiresAt,
      bytes: s.files.reduce((n, f) => n + Number(f.size), 0), files: s.files.slice(0, 5).map((f) => f.name), fileCount: s.files.length,
      expired: s.expiresAt < now,
    })),
    codes: codeRows,
    rooms: roomRows,
  });
}
