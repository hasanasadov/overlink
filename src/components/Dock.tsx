"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";
import { useApp } from "./Providers";
import { stripLocale } from "./Header";

type Item = { href: string; icon: IconName; label: "nav.home" | "nav.files" | "nav.code" | "nav.screen" | "nav.account" };
const ITEMS: Item[] = [
  { href: "/", icon: "home", label: "nav.home" },
  { href: "/files", icon: "files", label: "nav.files" },
  { href: "/code", icon: "code", label: "nav.code" },
  { href: "/screen", icon: "screenShare", label: "nav.screen" },
  { href: "/account", icon: "personCircle", label: "nav.account" },
];

function indexFor(path: string): number {
  if (path === "/") return 0;
  if (path === "/files" || path.startsWith("/f/")) return 1;
  if (path === "/code" || path.startsWith("/c/")) return 2;
  if (path === "/screen" || path.startsWith("/s/")) return 3;
  if (/^\/(account|login|register|forgot|reset)/.test(path)) return 4;
  return -1;
}

/** Classic iOS tab bar: full width, flush with the bottom edge, translucent material. */
export function Dock() {
  const { t, lp } = useApp();
  const current = indexFor(stripLocale(usePathname()));

  return (
    <nav className="dock" aria-label="Tabs">
      {ITEMS.map((it, i) => (
        <Link key={it.href} href={lp(it.href)} className={`dock-item ${current === i ? "on" : ""}`} aria-current={current === i ? "page" : undefined}>
          <Icon name={it.icon} size={25} strokeWidth={current === i ? 1.8 : 1.5} />
          {t(it.label)}
        </Link>
      ))}
    </nav>
  );
}
