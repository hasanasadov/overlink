import { CodeCreate } from "@/components/CodeCreate";
import { getT } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return pageMetadata({ path: "/code", title: "seo.code.title", description: "seo.code.desc" });
}

export default async function CodePage() {
  const { t } = await getT();
  return (
    <div className="container split">
      <div className="split-head">
        <span className="eyebrow">{t("nav.code")}</span>
        <h1 className="large-title">{t("code.title")}</h1>
        <p className="lead">{t("code.subtitle")}</p>
      </div>
      <div className="split-body">
        <CodeCreate />
      </div>
    </div>
  );
}
