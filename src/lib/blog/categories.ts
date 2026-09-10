/**
 * Blog category registry — editorial Blog only (not DIY categories).
 */
export const BLOG_CATEGORIES = [
  { slug: "plumbing", en: "Plumbing", ar: "السباكة" },
  { slug: "air-conditioning", en: "Air Conditioning", ar: "التكييف" },
  { slug: "electrical", en: "Electrical", ar: "الكهرباء" },
  { slug: "cleaning", en: "Cleaning", ar: "التنظيف" },
  { slug: "painting-walls", en: "Painting & Walls", ar: "الدهان والجدران" },
  { slug: "building-maintenance", en: "Building Maintenance", ar: "صيانة المباني" },
  { slug: "home-maintenance", en: "Home Maintenance", ar: "صيانة المنزل" },
  { slug: "diy-safety", en: "DIY & Safety", ar: "الأعمال المنزلية والسلامة" },
  { slug: "uae-local-guides", en: "UAE Local Guides", ar: "أدلة محلية للإمارات" },
] as const;

export type BlogCategorySlug = (typeof BLOG_CATEGORIES)[number]["slug"];

export function blogCategoryLabel(slug: string, locale: "en" | "ar") {
  const row = BLOG_CATEGORIES.find((c) => c.slug === slug);
  if (!row) return slug;
  return locale === "ar" ? row.ar : row.en;
}

export function blogHeroForCategory(slug: string): string {
  if (slug === "plumbing") return "/media/topics/plumbing.webp";
  if (slug === "air-conditioning") return "/media/topics/ac.webp";
  if (slug === "electrical") return "/media/topics/electrical.webp";
  if (slug === "cleaning") return "/media/topics/cleaning.webp";
  if (slug === "painting-walls") return "/media/topics/painting.webp";
  if (slug === "building-maintenance" || slug === "home-maintenance") return "/media/topics/general.webp";
  if (slug === "diy-safety") return "/media/topics/walls.webp";
  if (slug === "uae-local-guides") return "/media/topics/general.webp";
  return "/media/topics/general.webp";
}
