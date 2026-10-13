import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/server";
import { localePath } from "@/lib/i18n";
import { AccountClient } from "@/components/AccountClient";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return pageMetadata({ path: "/account", title: "account.title", noindex: true });
}

export default async function AccountPage() {
  const [user, locale] = await Promise.all([getUser(), getLocale()]);
  if (!user) redirect(localePath(locale, "/login") + "?next=" + encodeURIComponent(localePath(locale, "/account")));

  const now = new Date();
  const [shares, codes, rooms] = await Promise.all([
    db.share.findMany({ where: { userId: user.id, ready: true, expiresAt: { gt: now } }, orderBy: { createdAt: "desc" }, include: { files: { select: { name: true, size: true, mime: true } } } }),
    db.codeShare.findMany({ where: { userId: user.id, expiresAt: { gt: now } }, orderBy: { createdAt: "desc" }, select: { code: true, title: true, language: true, preview: true, expiresAt: true } }),
    db.room.findMany({ where: { userId: user.id, expiresAt: { gt: now } }, orderBy: { createdAt: "desc" }, select: { code: true, title: true, passwordHash: true, expiresAt: true } }),
  ]);

  return (
    <AccountClient
      shares={shares.map((s) => ({
        code: s.code,
        title: s.title,
        expiresAt: s.expiresAt.toISOString(),
        downloads: s.downloads,
        files: s.files.map((f) => ({ name: f.name, size: Number(f.size), mime: f.mime })),
      }))}
      codes={codes.map((c) => ({ code: c.code, title: c.title, language: c.language, preview: c.preview, expiresAt: c.expiresAt.toISOString() }))}
      rooms={rooms.map((r) => ({ code: r.code, title: r.title, locked: !!r.passwordHash, expiresAt: r.expiresAt.toISOString() }))}
    />
  );
}
