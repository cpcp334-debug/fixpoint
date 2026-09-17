import { SERVICE_FAQ_CATEGORY, SERVICE_FAQ_SLUG_PREFIX } from "@/lib/faq/service-faq";

export function isFaqArticleSlug(slug: string) {
  return slug.startsWith(SERVICE_FAQ_SLUG_PREFIX);
}

export function adminArticleBasePath(slug: string) {
  return isFaqArticleSlug(slug) ? "/admin/faqs" : "/admin/blogs";
}

export function normalizeArticleSlug(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** One slug field; auto-prefix faq- when missing. */
export function normalizeFaqArticleSlug(raw: string) {
  const slug = normalizeArticleSlug(raw);
  if (!slug) return "";
  return slug.startsWith(SERVICE_FAQ_SLUG_PREFIX) ? slug : `${SERVICE_FAQ_SLUG_PREFIX}${slug}`;
}

export function ensureServiceFaqCategories(rawCsv: string) {
  const list = rawCsv
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!list.includes(SERVICE_FAQ_CATEGORY)) list.unshift(SERVICE_FAQ_CATEGORY);
  return list;
}

/** Arabic admin fields are always editable (staff may replace REVIEW_REQUIRED). */
export function isArabicEditable(_ar?: unknown) {
  return true;
}
