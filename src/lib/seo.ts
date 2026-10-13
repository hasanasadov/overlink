import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, AUTHOR } from "./config";
import { LOCALES, OG_LOCALE, localePath, type DictKey } from "./i18n";
import { getT } from "./i18n/server";

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path === "/" ? "" : path}` || SITE_URL;
}

export async function pageMetadata(opts: {
  path: string;
  title: DictKey;
  description?: DictKey;
  noindex?: boolean;
  absoluteTitle?: boolean;
}): Promise<Metadata> {
  const { locale, t } = await getT();
  const title = t(opts.title);
  const description = t(opts.description ?? "seo.home.desc");
  const url = absoluteUrl(localePath(locale, opts.path));

  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = absoluteUrl(localePath(l, opts.path));
  languages["x-default"] = absoluteUrl(opts.path);

  return {
    title: opts.absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages },
    robots: opts.noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: opts.absoluteTitle ? title : `${title} | ${SITE_NAME}`,
      description,
      url,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
    },
    twitter: { card: "summary_large_image", title: opts.absoluteTitle ? title : `${title} | ${SITE_NAME}`, description },
  };
}

export function siteJsonLd(description: string, inLanguage: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description,
        inLanguage,
        publisher: { "@id": `${SITE_URL}/#author` },
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        url: SITE_URL,
        description,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires a modern browser with JavaScript and WebRTC",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        author: { "@id": `${SITE_URL}/#author` },
        inLanguage: ["az", "en", "ru"],
        featureList: ["File sharing with expiry", "Live collaborative code editor", "Screen and audio sharing with chat"],
      },
      { "@type": "Person", "@id": `${SITE_URL}/#author`, name: AUTHOR.name, url: AUTHOR.url },
    ],
  };
}
