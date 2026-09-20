import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const handleI18n = createMiddleware(routing);

const APEX_HOST = "fixpoint.ae";

function hostnameOf(request: NextRequest) {
  const raw = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  return raw.split(":")[0]?.toLowerCase() || "";
}

/**
 * Hostinger / PSI test the apex (`fixpoint.ae`), not `/en`.
 * next-intl with localePrefix "always" would 307 `/` → `/en` and tank LCP/FCP.
 * Rewrite internally so the URL stays `/` with zero Location redirects.
 *
 * Also collapse www → apex in one 301 (Hostinger may not). Prefer panel
 * "force HTTPS + redirect www to non-www" so http://www never chains 3 hops.
 */
export default function middleware(request: NextRequest) {
  const host = hostnameOf(request);
  const { pathname, search } = request.nextUrl;

  // www → apex (preserve path). Apex `/` then rewrites to EN with no further hop.
  if (host === `www.${APEX_HOST}`) {
    const target = new URL(`https://${APEX_HOST}${pathname}${search}`);
    return NextResponse.redirect(target, 301);
  }

  if (pathname === "/" || pathname === "") {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}`;
    const response = NextResponse.rewrite(url);
    response.cookies.set("NEXT_LOCALE", routing.defaultLocale, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    return response;
  }

  return handleI18n(request);
}

export const config = {
  // Explicit `/` — some Next matcher forms skip the apex path.
  matcher: ["/", "/(en|ar)/:path*", "/((?!api|trpc|_next|_vercel|admin|login|.*\\..*).*)"],
};
