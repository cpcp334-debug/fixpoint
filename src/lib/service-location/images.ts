import type { ImageInheritance } from "./types";

const APPROVED_FALLBACK = null;

export function isPublishedHeroPath(src: string | null | undefined) {
  if (!src) return false;
  const normalized = src.trim();
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return false;
  if (normalized === "/media/hero.jpg" || normalized.endsWith("/media/hero.jpg")) return false;
  return true;
}

/**
 * Inheritance: ServiceLocation override → Service hero → category fallback (when asset exists) → approved null policy.
 * Callers must not invent binary assets. Category paths only apply when categoryAssetExists=true.
 */
export function resolveImageInheritance(args: {
  heroImageOverride?: string | null;
  serviceHeroImage?: string | null;
  categoryHeroImage?: string | null;
  categorySlug?: string | null;
  /** When true, `/media/categories/{slug}.jpg` (or categoryHeroImage) may be used. */
  categoryAssetExists?: boolean;
  imageAlt?: string | null;
  serviceName: string;
  locationName: string;
  locale: string;
}): ImageInheritance {
  const alt =
    args.imageAlt?.trim() ||
    (args.locale === "ar"
      ? `${args.serviceName} في ${args.locationName}`
      : `${args.serviceName} in ${args.locationName}`);
  if (isPublishedHeroPath(args.heroImageOverride)) {
    return { src: args.heroImageOverride!.trim(), source: "override", alt, gatePass: true };
  }
  if (isPublishedHeroPath(args.serviceHeroImage)) {
    return { src: args.serviceHeroImage!.trim(), source: "service", alt, gatePass: true };
  }
  const categoryPath =
    args.categoryHeroImage?.trim() ||
    (args.categorySlug ? `/media/categories/${args.categorySlug}.jpg` : null);
  if (args.categoryAssetExists && isPublishedHeroPath(categoryPath)) {
    return { src: categoryPath!.trim(), source: "category", alt, gatePass: true };
  }
  return { src: APPROVED_FALLBACK, source: "approved_fallback", alt, gatePass: true };
}
