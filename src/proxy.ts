import { NextResponse, type NextRequest } from "next/server";

// /en/... and /ru/... are locale-prefixed URLs (good for SEO / hreflang).
// They are rewritten to the unprefixed route and the locale travels in a header + cookie.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const m = pathname.match(/^\/(en|ru|az)(\/.*)?$/);
  if (!m) return NextResponse.next();

  const locale = m[1];
  const rest = m[2] || "/";
  const maxAge = 60 * 60 * 24 * 365;

  if (locale === "az") {
    const url = req.nextUrl.clone();
    url.pathname = rest;
    const res = NextResponse.redirect(url, 308);
    res.cookies.set("ol_lang", "az", { path: "/", maxAge, sameSite: "lax" });
    return res;
  }

  const url = req.nextUrl.clone();
  url.pathname = rest;
  const headers = new Headers(req.headers);
  headers.set("x-locale", locale);
  const res = NextResponse.rewrite(url, { request: { headers } });
  res.cookies.set("ol_lang", locale, { path: "/", maxAge, sameSite: "lax" });
  return res;
}

export const config = { matcher: ["/(en|ru|az)", "/(en|ru|az)/:path*"] };
