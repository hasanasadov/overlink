import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { LOCALES, localePath } from "@/lib/i18n";

const PAGES: { path: string; priority: number; freq: "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, freq: "weekly" },
  { path: "/files", priority: 0.9, freq: "monthly" },
  { path: "/code", priority: 0.9, freq: "monthly" },
  { path: "/screen", priority: 0.9, freq: "monthly" },
  { path: "/login", priority: 0.4, freq: "monthly" },
  { path: "/register", priority: 0.5, freq: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PAGES.flatMap((p) =>
    LOCALES.map((l) => ({
      url: `${SITE_URL}${localePath(l, p.path) === "/" ? "" : localePath(l, p.path)}`,
      lastModified: now,
      changeFrequency: p.freq,
      priority: p.priority,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((x) => [x, `${SITE_URL}${localePath(x, p.path) === "/" ? "" : localePath(x, p.path)}`]),
        ),
      },
    })),
  );
}
