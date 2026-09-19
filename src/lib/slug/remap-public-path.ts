/**
 * Remap a locale-stripped public pathname when switching EN ↔ AR.
 * Server-safe (uses fs-backed slug maps). No 301s — Link target only.
 */
import { blogPathSlug } from "@/lib/slug/blog-slug-map";
import { diyPathSlug } from "@/lib/slug/diy-slug-map";
import { faqPathSlug } from "@/lib/slug/faq-slug-map";
import { locationPathSlug, servicePathSlug } from "@/lib/slug/locale-slug";
import { normalizeRouteSlug } from "@/lib/slug/route-slug";

function decodeURIComponentSafe(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function seg(raw: string) {
  return normalizeRouteSlug(decodeURIComponentSafe(raw));
}

const STATIC_TOP = new Set([
  "blog",
  "faq",
  "diy",
  "locations",
  "services",
  "reviews",
  "contact",
  "about",
  "get-a-quote",
  "privacy-policy",
]);

/**
 * @param pathname locale-stripped path (e.g. `/blog/foo`)
 * @param targetLocale `en` | `ar`
 */
export function remapPublicPathForLocale(pathname: string, targetLocale: string): string {
  const bare = String(pathname || "/").replace(/\/+$/, "") || "/";
  if (bare === "/") return "/";

  const parts = bare.split("/").filter(Boolean);
  if (!parts.length) return "/";

  const [a, b, c] = parts;

  if (a === "blog" && b) return `/blog/${blogPathSlug(targetLocale, seg(b))}`;
  if (a === "faq" && b) return `/faq/${faqPathSlug(targetLocale, seg(b))}`;
  if (a === "diy" && b && !c) return `/diy/${diyPathSlug(targetLocale, seg(b))}`;
  if (a === "diy" && b && c) {
    return `/diy/${diyPathSlug(targetLocale, seg(b))}/${diyPathSlug(targetLocale, seg(c))}`;
  }
  if (a === "locations" && b) return `/locations/${locationPathSlug(targetLocale, seg(b))}`;
  if (a === "services") return bare.startsWith("/") ? bare : `/${bare}`;

  if (a && !STATIC_TOP.has(a)) {
    if (b) {
      return `/${servicePathSlug(targetLocale, seg(a))}/${locationPathSlug(targetLocale, seg(b))}`;
    }
    return `/${servicePathSlug(targetLocale, seg(a))}`;
  }

  return bare.startsWith("/") ? bare : `/${bare}`;
}
