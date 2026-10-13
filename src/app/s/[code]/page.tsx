import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { isValidCode } from "@/lib/codes";
import { RoomClient } from "@/components/RoomClient";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return pageMetadata({ path: "/s", title: "seo.screen.title", description: "seo.screen.desc", noindex: true });
}

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const row = isValidCode(code)
    ? await db.room.findFirst({ where: { code, expiresAt: { gt: new Date() } }, select: { code: true, title: true, passwordHash: true, expiresAt: true, userId: true, ownerKeyHash: true } })
    : null;
  if (!row) notFound();
  const user = await getUser();

  return (
    <RoomClient
      code={row.code}
      title={row.title}
      hasPassword={!!row.passwordHash}
      expiresAt={row.expiresAt.toISOString()}
      ownerSignedIn={!!user && row.userId === user.id}
    />
  );
}
