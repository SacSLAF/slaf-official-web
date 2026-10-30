import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, isLocale, locales, type Locale } from "@/lib/i18n";

/** Sends locale-less URLs to /en, /si or /ta: saved choice first, then browser language. */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split("/")[1];

  if (isLocale(first)) return NextResponse.next();

  const saved = req.cookies.get("locale")?.value;
  const preferred = req.headers
    .get("accept-language")
    ?.split(",")
    .map((p) => p.split(";")[0].trim().slice(0, 2).toLowerCase())
    .find((code): code is Locale => (locales as readonly string[]).includes(code));

  const locale = saved && isLocale(saved) ? saved : (preferred ?? defaultLocale);
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
