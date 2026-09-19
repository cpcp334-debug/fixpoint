import { NextResponse } from "next/server";
import { remapPublicPathForLocale } from "@/lib/slug/remap-public-path";

export const runtime = "nodejs";

/**
 * GET /api/locale-path?path=/blog/foo&locale=ar
 * Returns remapped locale-stripped path for the language switcher (no redirects).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path") || "/";
  const locale = url.searchParams.get("locale") === "ar" ? "ar" : "en";
  if (!path.startsWith("/") || path.includes("://") || path.includes("..")) {
    return NextResponse.json({ href: "/" }, { status: 400 });
  }
  const href = remapPublicPathForLocale(path, locale);
  return NextResponse.json({ href });
}
