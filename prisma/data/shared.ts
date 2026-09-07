export type LocaleCopy = { en: string; ar: string };

export const ACTIVE_SERVICE_SLUGS = [
  "cleaning-services",
  "building-maintenance",
  "plumbing-maintenance",
  "electrical-maintenance",
  "ac-maintenance",
  "painting-services",
  "wall-maintenance",
] as const;

export const EMIRATE_SLUGS = [
  "dubai",
  "abu-dhabi",
  "sharjah",
  "ajman",
  "umm-al-quwain",
  "ras-al-khaimah",
  "fujairah",
] as const;

export function faq(items: Array<{ q: LocaleCopy; a: LocaleCopy }>, locale: "en" | "ar") {
  return JSON.stringify(items.map((item) => ({ q: item.q[locale], a: item.a[locale] })));
}

export function list(items: LocaleCopy[], locale: "en" | "ar") {
  return JSON.stringify(items.map((item) => item[locale]));
}
