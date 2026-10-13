import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, makeT, type Locale } from "./index";

export async function getLocale(): Promise<Locale> {
  const h = await headers();
  const fromPath = h.get("x-locale");
  if (isLocale(fromPath)) return fromPath;
  const jar = await cookies();
  const c = jar.get(LOCALE_COOKIE)?.value;
  return isLocale(c) ? c : DEFAULT_LOCALE;
}

export async function getT() {
  const locale = await getLocale();
  return { locale, t: makeT(locale) };
}
