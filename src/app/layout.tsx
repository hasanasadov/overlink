import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Dock } from "@/components/Dock";
import { getUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/server";
import { SITE_NAME, SITE_URL, AUTHOR } from "@/lib/config";
import { translate } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-inter", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: SITE_NAME,
    title: { default: translate(locale, "seo.home.title"), template: `%s | ${SITE_NAME}` },
    description: translate(locale, "seo.home.desc"),
    keywords: [
      "file sharing", "code sharing", "screen sharing", "pair programming", "WebRTC", "short link", "temporary file share",
      "fayl paylaşımı", "ekran paylaşımı", "kod paylaşımı", "Overlink",
      "обмен файлами", "показ экрана", "совместный редактор кода",
    ],
    authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
    creator: AUTHOR.name,
    publisher: SITE_NAME,
    formatDetection: { telephone: false, email: false, address: false },
    appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
    icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], apple: "/apple-icon" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, user, jar] = await Promise.all([getLocale(), getUser(), cookies()]);
  const theme = jar.get("ol_theme")?.value;
  const dataTheme = theme === "light" || theme === "dark" ? theme : undefined;

  return (
    <html lang={locale} data-theme={dataTheme} className={inter.variable} suppressHydrationWarning>
      <body>
        <Providers locale={locale} user={user ? { id: user.id, name: user.name, email: user.email } : null}>
          <Header />
          <main>{children}</main>
          <Footer />
          <Dock />
        </Providers>
      </body>
    </html>
  );
}
