import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { localePath, type DictKey } from "@/lib/i18n";

export async function NotFoundCard({ title, desc }: { title?: DictKey; desc: DictKey }) {
  const { locale, t } = await getT();
  return (
    <div className="container fullpage">
      <span className="eyebrow">404</span>
      <h1 className="display">{t(title ?? "view.expired.title")}</h1>
      <p className="lead">{t(desc)}</p>
      <Link href={localePath(locale, "/")} className="btn primary lg">{t("nav.home")}</Link>
    </div>
  );
}
