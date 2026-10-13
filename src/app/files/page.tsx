import { FilesClient } from "@/components/FilesClient";
import { limits } from "@/lib/config";
import { getT } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return pageMetadata({ path: "/files", title: "seo.files.title", description: "seo.files.desc" });
}

export default async function FilesPage() {
  const { t } = await getT();
  return (
    <div className="container split">
      <div className="split-head">
        <span className="eyebrow">{t("nav.files")}</span>
        <h1 className="large-title">{t("files.title")}</h1>
        <p className="lead">{t("files.subtitle")}</p>
      </div>
      <div className="split-body">
        <FilesClient anonMax={limits.anonFileBytes} userMax={limits.userFileBytes} maxFiles={limits.filesPerShare} />
      </div>
    </div>
  );
}
