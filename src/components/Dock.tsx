"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

/**
 * Floating glass tab bar. A glass "lens" marks the current tab, glides to the new tab on
 * navigation, and can be pressed and dragged across the bar (release to switch).
 */
export function Dock() {
  const { t, lp } = useApp();
  const router = useRouter();
  const path = stripLocale(usePathname());
  const current = indexFor(path);

  const trackRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [pending, setPending] = useState<number | null>(null);
  const [dragX, setDragX] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const dragging = dragX !== null;

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth / ITEMS.length);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => setPending(null), [current]);

  const lensIdx = pending ?? current;
  const shown = over ?? lensIdx;
  const maxX = w * (ITEMS.length - 1);

  const locate = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    const x = clientX - rect.left;
    return { x, idx: Math.max(0, Math.min(ITEMS.length - 1, Math.floor(x / w))) };
  };
  const follow = (clientX: number) => {
    const { x, idx } = locate(clientX);
    setDragX(Math.max(0, Math.min(maxX, x - w / 2)));
    setOver(idx);
  };

  const go = (idx: number) => {
    if (idx === current && pending === null) return;
    setPending(idx);
    router.push(lp(ITEMS[idx].href));
  };

  const lensX = dragX ?? Math.max(0, lensIdx) * w;
  const lensHidden = lensIdx < 0 && !dragging;

  return (
    <nav
      className={`dock glass ${dragging ? "dragging" : ""}`}
      aria-label="Tabs"
      onPointerDown={(e) => {
        if (!w) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        follow(e.clientX);
      }}
      onPointerMove={(e) => dragging && follow(e.clientX)}
      onPointerUp={(e) => {
        if (!dragging) return;
        const { idx } = locate(e.clientX);
        setDragX(null);
        setOver(null);
        go(idx);
      }}
      onPointerCancel={() => { setDragX(null); setOver(null); }}
    >
      <div className="dock-items" ref={trackRef}>
        <span
          className="dock-lens"
          aria-hidden="true"
          style={{ width: w, opacity: lensHidden ? 0 : 1, transform: `translateX(${lensX}px) scale(${dragging ? 1.14 : 1})` }}
        />
        {ITEMS.map((it, i) => (
          <Link
            key={it.href}
            href={lp(it.href)}
            className={`dock-item ${shown === i ? "on" : ""}`}
            draggable={false}
            onClick={(e) => {
              e.preventDefault();
              if (e.detail === 0) go(i); // keyboard activation; pointer taps are handled on pointer-up
            }}
          >
            <Icon name={it.icon} size={25} strokeWidth={shown === i ? 1.8 : 1.5} />
            {t(it.label)}
          </Link>
        ))}
      </div>
    </nav>
  );
}
