"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { useApp } from "./Providers";
import { LOCALES, LOCALE_COOKIE, LOCALE_LABELS, localePath, type Locale } from "@/lib/i18n";

export function stripLocale(pathname: string): string {
  const p = pathname.replace(/^\/(en|ru|az)(?=\/|$)/, "");
  return p || "/";
}

function Popover({ button, children, label }: { button: ReactNode; children: (close: () => void) => ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="popover-wrap" ref={ref}>
      <button type="button" className="icon-btn" aria-label={label} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {button}
      </button>
      {open && <div className="menu glass strong" role="menu">{children(() => setOpen(false))}</div>}
    </div>
  );
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export const NAV: { href: string; key: "nav.files" | "nav.code" | "nav.screen"; icon: IconName }[] = [
  { href: "/files", key: "nav.files", icon: "files" },
  { href: "/code", key: "nav.code", icon: "code" },
  { href: "/screen", key: "nav.screen", icon: "screenShare" },
];

export function Header() {
  const { locale, t, lp, user, setUser } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const path = stripLocale(pathname);
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");

  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )ol_theme=(light|dark)/);
    setTheme(m ? (m[1] as "light" | "dark") : "system");
  }, []);

  const applyTheme = (v: "system" | "light" | "dark") => {
    setTheme(v);
    if (v === "system") {
      document.cookie = "ol_theme=; path=/; max-age=0";
      document.documentElement.removeAttribute("data-theme");
    } else {
      setCookie("ol_theme", v);
      document.documentElement.setAttribute("data-theme", v);
    }
  };

  const switchLocale = (l: Locale) => {
    setCookie(LOCALE_COOKIE, l);
    router.push(localePath(l, path) + window.location.search);
    router.refresh();
  };

  const active = (href: string) =>
    path === href || (href === "/files" && path.startsWith("/f/")) || (href === "/code" && path.startsWith("/c/")) || (href === "/screen" && path.startsWith("/s/"));

  const themeIcon: IconName = theme === "dark" ? "moon" : theme === "light" ? "sun" : "auto";

  const logout = async (close: () => void) => {
    close();
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push(lp("/"));
    router.refresh();
  };

  return (
    <header className="header">
      <div className="container">
        <Link href={lp("/")} className="brand">Overlink</Link>

        <nav className="nav-links" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={lp(n.href)} className={active(n.href) ? "on" : ""}>
              {t(n.key)}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <Popover label={t("lang.title")} button={<Icon name="globe" size={20} />}>
            {(close) => (
              <>
                <div className="menu-head">{t("lang.title")}</div>
                {LOCALES.map((l) => (
                  <button key={l} className="menu-item" role="menuitem" onClick={() => { close(); switchLocale(l); }}>
                    <span style={{ fontWeight: 500, width: 24 }}>{LOCALE_LABELS[l].short}</span>
                    {LOCALE_LABELS[l].native}
                    {l === locale && <Icon className="check" name="check" size={16} />}
                  </button>
                ))}
              </>
            )}
          </Popover>

          <Popover label={t("theme.title")} button={<Icon name={themeIcon} size={20} />}>
            {(close) => (
              <>
                <div className="menu-head">{t("theme.title")}</div>
                {(["system", "light", "dark"] as const).map((v) => (
                  <button key={v} className="menu-item" role="menuitem" onClick={() => { close(); applyTheme(v); }}>
                    <Icon name={v === "dark" ? "moon" : v === "light" ? "sun" : "auto"} size={18} />
                    {t(`theme.${v}`)}
                    {theme === v && <Icon className="check" name="check" size={16} />}
                  </button>
                ))}
              </>
            )}
          </Popover>

          {user ? (
            <Popover label={t("nav.account")} button={<span className="avatar" style={{ width: 30, height: 30, fontSize: 13 }}>{user.name.slice(0, 1).toUpperCase()}</span>}>
              {(close) => (
                <>
                  <div className="menu-head">
                    <div style={{ fontSize: 15, fontWeight: 500, color: "var(--label)" }}>{user.name}</div>
                    <div>{user.email}</div>
                  </div>
                  <div className="menu-sep" />
                  <Link href={lp("/account")} className="menu-item" role="menuitem" onClick={close}>
                    <Icon name="personCircle" size={18} /> {t("nav.account")}
                  </Link>
                  <button className="menu-item" role="menuitem" onClick={() => logout(close)}>
                    <Icon name="signOut" size={18} /> {t("account.signOut")}
                  </button>
                </>
              )}
            </Popover>
          ) : (
            <Link href={lp("/login")} className="text-link hide-sm">{t("nav.signIn")}</Link>
          )}
        </div>
      </div>
    </header>
  );
}
