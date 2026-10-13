import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { isValidCode } from "@/lib/codes";
import { FileShareView } from "@/components/FileShareView";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return pageMetadata({ path: "/f", title: "seo.share.title", noindex: true });
}

export default async function SharePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const share = isValidCode(code)
    ? await db.share.findFirst({ where: { code, ready: true, expiresAt: { gt: new Date() } }, include: { files: { orderBy: { name: "asc" } } } })
    : null;
  if (!share) notFound();

  const user = await getUser();
  return (
    <FileShareView
      code={share.code}
      title={share.title}
      expiresAt={share.expiresAt.toISOString()}
      downloads={share.downloads}
      ownerSignedIn={!!user && share.userId === user.id}
      anonOwned={!!share.ownerKeyHash}
      files={share.files.map((f) => ({ id: f.id, name: f.name, size: Number(f.size), mime: f.mime }))}
    />
  );
}
