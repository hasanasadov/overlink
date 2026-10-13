import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { getT } from "@/lib/i18n/server";
import { localePath, type DictKey } from "@/lib/i18n";
import { pageMetadata, siteJsonLd } from "@/lib/seo";

export async function generateMetadata() {
  return pageMetadata({ path: "/", title: "seo.home.title", description: "seo.home.desc", absoluteTitle: true });
}

export default async function Home() {
  const { locale, t } = await getT();
  const lp = (p: string) => localePath(locale, p);

  const tools: { href: string; icon: IconName; color: string; title: DictKey; desc: DictKey }[] = [
    { href: "/files", icon: "files", color: "bg-blue", title: "home.files.title", desc: "home.files.desc" },
    { href: "/code", icon: "code", color: "bg-indigo", title: "home.code.title", desc: "home.code.desc" },
    { href: "/screen", icon: "screenShare", color: "bg-green", title: "home.screen.title", desc: "home.screen.desc" },
  ];
  const features: { icon: IconName; color: string; title: DictKey; desc: DictKey }[] = [
    { icon: "link", color: "bg-blue", title: "home.feat1.title", desc: "home.feat1.desc" },
    { icon: "trashClock", color: "bg-orange", title: "home.feat2.title", desc: "home.feat2.desc" },
    { icon: "person", color: "bg-teal", title: "home.feat3.title", desc: "home.feat3.desc" },
    { icon: "lock", color: "bg-red", title: "home.feat4.title", desc: "home.feat4.desc" },
    { icon: "people", color: "bg-purple", title: "home.feat5.title", desc: "home.feat5.desc" },
    { icon: "globe", color: "bg-indigo", title: "home.feat6.title", desc: "home.feat6.desc" },
  ];

  return (
    <div className="container">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd(t("seo.home.desc"), locale)) }} />

      <section className="hero">
        <h1 className="display">{t("home.title")}</h1>
        <p className="lead">{t("home.subtitle")}</p>
      </section>

      <section className="tools" aria-label="Tools">
        {tools.map((x) => (
          <Link key={x.href} href={lp(x.href)} className="tool-card">
            <span className={`tile-icon xl ${x.color}`}><Icon name={x.icon} size={34} strokeWidth={1.4} /></span>
            <h2 className="title2" style={{ marginTop: 18 }}>{t(x.title)}</h2>
            <p className="muted" style={{ fontSize: 16 }}>{t(x.desc)}</p>
            <span className="more">{t("common.open")} <Icon name="chevronRight" size={16} strokeWidth={2} /></span>
          </Link>
        ))}
      </section>

      <section className="section">
        <h2 className="large-title" style={{ marginBottom: "clamp(28px, 5vw, 56px)" }}>{t("home.feat.title")}</h2>
        <div className="features">
          {features.map((f) => (
            <div key={f.title} className="feature">
              <span className={`tile-icon ${f.color}`}><Icon name={f.icon} size={21} /></span>
              <h3>{t(f.title)}</h3>
              <p>{t(f.desc)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
