import { ScreenCreate } from "@/components/ScreenCreate";
import { getT } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return pageMetadata({ path: "/screen", title: "seo.screen.title", description: "seo.screen.desc" });
}

export default async function ScreenPage() {
  const { t } = await getT();
  return (
    <div className="container split">
      <div className="split-head">
        <span className="eyebrow">{t("nav.screen")}</span>
        <h1 className="large-title">{t("screen.title")}</h1>
        <p className="lead">{t("screen.subtitle")}</p>
      </div>
      <div className="split-body">
        <ScreenCreate />
      </div>
    </div>
  );
}
