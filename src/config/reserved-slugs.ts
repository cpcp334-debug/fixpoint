export const reservedSlugs = [
  "about",
  "services",
  "diy",
  "projects",
  "reviews",
  "faq",
  "locations",
  "contact",
  "blog",
  "admin",
  "api",
  "login",
  "account",
  "get-a-quote",
  "book-a-service",
  "privacy-policy",
  "terms",
  "cancellation-policy",
  "cookie-policy",
  "en",
  "ar",
  "ur",
  "bn",
] as const;

export function isReservedSlug(slug: string) {
  return (reservedSlugs as readonly string[]).includes(slug);
}
