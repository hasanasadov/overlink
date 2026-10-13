import { az, type DictKey } from "./az";
import { en } from "./en";
import { ru } from "./ru";

export type Locale = "az" | "en" | "ru";
export const LOCALES: Locale[] = ["az", "en", "ru"];
export const DEFAULT_LOCALE: Locale = "az";
export const LOCALE_COOKIE = "ol_lang";
export const LOCALE_LABELS: Record<Locale, { short: string; native: string }> = {
  az: { short: "AZ", native: "Azərbaycanca" },
  en: { short: "EN", native: "English" },
  ru: { short: "RU", native: "Русский" },
};
export const OG_LOCALE: Record<Locale, string> = { az: "az_AZ", en: "en_US", ru: "ru_RU" };

const dicts: Record<Locale, Record<DictKey, string>> = { az, en, ru };
export type { DictKey };

export function isLocale(v: unknown): v is Locale {
  return v === "az" || v === "en" || v === "ru";
}

export type Vars = Record<string, string | number>;

export function translate(locale: Locale, key: DictKey, vars?: Vars): string {
  let s = dicts[locale][key] ?? az[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export type TFn = (key: DictKey, vars?: Vars) => string;

export function makeT(locale: Locale): TFn {
  return (key, vars) => translate(locale, key, vars);
}

export function formatRemaining(ms: number, t: TFn): string {
  if (ms < 60_000) return t("time.lt1m");
  const totalMin = Math.floor(ms / 60_000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  const parts: string[] = [];
  if (d) parts.push(t("time.d", { n: d }));
  if (h) parts.push(t("time.h", { n: h }));
  if (m && !d) parts.push(t("time.m", { n: m }));
  return parts.slice(0, 2).join(" ");
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 || Number.isInteger(v) ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

/** Locale-aware path: az is unprefixed, others get /en or /ru. */
export function localePath(locale: Locale, path: string): string {
  if (locale === DEFAULT_LOCALE) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
