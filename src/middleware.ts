import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const handleI18n = createMiddleware(routing);

/**
 * Hostinger / PSI test the apex (`fixpoint.ae`), not `/en`.
 * next-intl with localePrefix "always" would 307 `/` → `/en` and tank LCP/FCP.
 * Rewrite internally so the URL stays `/` with zero Location redirects.
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}`;
    const response = NextResponse.rewrite(url);
    response.cookies.set("NEXT_LOCALE", routing.defaultLocale, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  }

  return handleI18n(request);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|admin|login|.*\\..*).*)"],
};
