import { cache } from "react";
import { prisma } from "@/server/db";
import { parseJson } from "@/lib/utils";
import { parseFaqJson } from "@/lib/faq";
import { SERVICE_FAQ_CATEGORY, isServiceFaqSlug } from "@/lib/faq/service-faq";

function pickCategory(categorySlugs: string) {
  return parseJson<string[]>(categorySlugs, []).find((slug) => slug !== SERVICE_FAQ_CATEGORY) || "";
}

export const getPublishedServiceFaqs = cache(async (locale: string) => {
  const rows = await prisma.article.findMany({
    where: { status: "published", indexable: true, slug: { startsWith: "faq-" } },
    include: { translations: true },
    orderBy: { slug: "asc" },
  });
  return rows
    .filter((row) => isServiceFaqSlug(row.slug) && parseJson<string[]>(row.categorySlugs, []).includes(SERVICE_FAQ_CATEGORY))
    .map((row) => {
      const t = row.translations.find((item) => item.locale === locale) || row.translations.find((item) => item.locale === "en");
      if (!t) return null;
      return {
        slug: row.slug,
        categorySlug: pickCategory(row.categorySlugs),
        title: t.title,
        excerpt: t.excerpt,
        updatedAt: row.updatedAt,
      };
    })
    .filter(Boolean) as Array<{ slug: string; categorySlug: string; title: string; excerpt: string; updatedAt: Date }>;
});

export const getServiceFaqBySlug = cache(async (slug: string, locale: string) => {
  if (!isServiceFaqSlug(slug)) return null;
  const row = await prisma.article.findFirst({
    where: { slug, status: "published", indexable: true },
    include: { translations: true },
  });
  if (!row || !parseJson<string[]>(row.categorySlugs, []).includes(SERVICE_FAQ_CATEGORY)) return null;
  const t = row.translations.find((item) => item.locale === locale) || row.translations.find((item) => item.locale === "en");
  if (!t) return null;
  return {
    slug: row.slug,
    categorySlug: pickCategory(row.categorySlugs),
    relatedServiceSlugs: parseJson<string[]>(row.relatedServiceSlugs, []),
    relatedDiySlugs: parseJson<string[]>(row.relatedDiySlugs, []),
    updatedAt: row.updatedAt,
    t: {
      title: t.title,
      excerpt: t.excerpt,
      body: t.body,
      faq: parseFaqJson(t.faq),
      seoTitle: t.seoTitle,
      metaDescription: t.metaDescription,
    },
  };
});
