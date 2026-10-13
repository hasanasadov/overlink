import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { isValidCode } from "@/lib/codes";
import { CodeRoom } from "@/components/CodeRoom";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return pageMetadata({ path: "/c", title: "seo.code.title", description: "seo.code.desc", noindex: true });
}

export default async function CodeSessionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const row = isValidCode(code)
    ? await db.codeShare.findFirst({ where: { code, expiresAt: { gt: new Date() } }, select: { code: true, title: true, language: true, expiresAt: true, userId: true, ownerKeyHash: true } })
    : null;
  if (!row) notFound();
  const user = await getUser();

  return (
    <CodeRoom
      code={row.code}
      title={row.title}
      language={row.language}
      expiresAt={row.expiresAt.toISOString()}
      ownerSignedIn={!!user && row.userId === user.id}
      anonOwned={!!row.ownerKeyHash}
    />
  );
}
