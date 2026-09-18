import { cache } from "react";
import { prisma } from "@/server/db";
import { parseJson } from "@/lib/utils";
import { parseFaqJson } from "@/lib/faq";
import { SERVICE_FAQ_CATEGORY } from "@/lib/faq/service-faq";
import { faqLookupCandidates, toMasterFaqSlug } from "@/lib/slug/faq-slug-map";

function pickCategory(categorySlugs: string) {
  return parseJson<string[]>(categorySlugs, []).find((slug) => slug !== SERVICE_FAQ_CATEGORY) || "";
}

/** Durable FAQ identity: category `service-faq` (not slug prefix alone). */
export const publishedServiceFaqWhere = {
  status: "published" as const,
  indexable: true,
  categorySlugs: { contains: SERVICE_FAQ_CATEGORY },
};

export const getPublishedServiceFaqs = cache(async (locale: string) => {
  const rows = await prisma.article.findMany({
    where: {
      ...publishedServiceFaqWhere,
      NOT: [{ slug: { startsWith: "__restore_faq_" } }],
    },
    include: { translations: true },
    orderBy: { slug: "asc" },
  });
  return rows
    .filter((row) => parseJson<string[]>(row.categorySlugs, []).includes(SERVICE_FAQ_CATEGORY))
    .filter((row) => row.slug.startsWith("faq-") || row.slug.startsWith("أسئلة"))
    .map((row) => {
      const t = row.translations.find((item) => item.locale === locale) || row.translations.find((item) => item.locale === "en");
      if (!t) return null;
      // Hostinger cannot serve Unicode paths — public FAQ hrefs stay Latin for both locales.
      const publicSlug = row.slug.startsWith("faq-") ? row.slug : toMasterFaqSlug(row.slug);
      return {
        slug: publicSlug,
        categorySlug: pickCategory(row.categorySlugs),
        title: t.title,
        excerpt: t.excerpt,
        updatedAt: row.updatedAt,
      };
    })
    .filter(Boolean) as Array<{ slug: string; categorySlug: string; title: string; excerpt: string; updatedAt: Date }>;
});

export const getServiceFaqBySlug = cache(async (slug: string, locale: string) => {
  const candidates = faqLookupCandidates(slug).filter((c) => !c.startsWith("__restore_faq_"));
  const row = await prisma.article.findFirst({
    where: {
      status: "published",
      indexable: true,
      categorySlugs: { contains: SERVICE_FAQ_CATEGORY },
      slug: { in: candidates },
    },
    include: { translations: true },
  });
  if (!row || !parseJson<string[]>(row.categorySlugs, []).includes(SERVICE_FAQ_CATEGORY)) return null;
  if (row.slug.startsWith("__restore_faq_")) return null;
  const t = row.translations.find((item) => item.locale === locale) || row.translations.find((item) => item.locale === "en");
  if (!t) return null;
  const publicSlug = row.slug.startsWith("faq-") ? row.slug : toMasterFaqSlug(row.slug);
  return {
    slug: publicSlug,
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
