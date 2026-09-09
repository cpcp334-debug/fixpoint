import type { ImageInheritance } from "./types";

const APPROVED_FALLBACK = null;

export function isPublishedHeroPath(src: string | null | undefined) {
  if (!src) return false;
  const normalized = src.trim();
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return false;
  if (normalized === "/media/hero.jpg" || normalized.endsWith("/media/hero.jpg")) return false;
  return true;
}

export function resolveImageInheritance(args: {
  heroImageOverride?: string | null;
  serviceHeroImage?: string | null;
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
  return { src: APPROVED_FALLBACK, source: "approved_fallback", alt, gatePass: true };
}
