import { revalidatePath } from "next/cache";

const LOCALES = ["en", "ar"] as const;

function paths(pathsToRevalidate: string[]) {
  for (const path of pathsToRevalidate) revalidatePath(path);
  revalidatePath("/sitemap.xml");
}

export function revalidatePublicService(slug: string, categorySlug?: string | null) {
  const next = LOCALES.flatMap((locale) => [
    `/${locale}/${slug}`,
    `/${locale}`,
    `/${locale}/services`,
    ...(categorySlug ? [`/${locale}/services/${categorySlug}`] : []),
  ]);
  paths(next);
}

export function revalidatePublicLocation(slug: string) {
  paths(LOCALES.flatMap((locale) => [`/${locale}/locations/${slug}`, `/${locale}`, `/${locale}/locations`]));
}

export function revalidatePublicDiy(slug: string) {
  paths(LOCALES.flatMap((locale) => [`/${locale}/diy/${slug}`, `/${locale}/diy`]));
}

export function revalidatePublicArticle(slug: string) {
  const kind = slug.startsWith("faq-") || slug.startsWith("أسئلة") ? "faq" : "blog";
  paths(LOCALES.flatMap((locale) => [`/${locale}/${kind}/${slug}`, `/${locale}/${kind}`]));
}
