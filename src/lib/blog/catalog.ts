import { cache } from "react";
import { prisma } from "@/server/db";
import { parseJson } from "@/lib/utils";
import { parseFaqJson } from "@/lib/faq";
import { blogCategoryLabel } from "@/lib/blog/categories";

export type BlogArticleCard = {
  slug: string;
  title: string;
  excerpt: string;
  heroImage: string | null;
  imageAlt: string;
  categories: Array<{ slug: string; label: string }>;
  publishedAt: Date | null;
  updatedAt: Date;
};

function mapCard(
  row: {
    slug: string;
    categorySlugs: string;
    heroImage: string | null;
    publishedAt: Date | null;
    updatedAt: Date;
    translations: Array<{ locale: string; title: string; excerpt: string; imageAlt: string }>;
  },
  locale: string,
): BlogArticleCard | null {
  const t = row.translations.find((x) => x.locale === locale);
  if (!t) return null;
  const cats = parseJson<string[]>(row.categorySlugs, []);
  return {
    slug: row.slug,
    title: t.title,
    excerpt: t.excerpt,
    heroImage: row.heroImage,
    imageAlt: t.imageAlt || t.title,
    categories: cats.map((slug) => ({
      slug,
      label: blogCategoryLabel(slug, locale === "ar" ? "ar" : "en"),
    })),
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
  };
}

export const getPublishedBlogArticles = cache(async (locale: string) => {
  const rows = await prisma.article.findMany({
    where: { status: "published", indexable: true },
    include: { translations: true },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
  });
  return rows.map((r) => mapCard(r, locale)).filter(Boolean) as BlogArticleCard[];
});

export const getBlogArticleBySlug = cache(async (slug: string, locale: string) => {
  const row = await prisma.article.findFirst({
    where: { slug, status: "published", indexable: true },
    include: { translations: true },
  });
  if (!row) return null;
  const t = row.translations.find((x) => x.locale === locale);
  if (!t) return null;
  const cats = parseJson<string[]>(row.categorySlugs, []);
  return {
    id: row.id,
    slug: row.slug,
    heroImage: row.heroImage,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    relatedServiceSlugs: parseJson<string[]>(row.relatedServiceSlugs, []),
    relatedDiySlugs: parseJson<string[]>(row.relatedDiySlugs, []),
    categories: cats.map((s) => ({
      slug: s,
      label: blogCategoryLabel(s, locale === "ar" ? "ar" : "en"),
    })),
    t: {
      title: t.title,
      excerpt: t.excerpt,
      body: t.body,
      diySection: t.diySection,
      faq: parseFaqJson(t.faq),
      imageAlt: t.imageAlt || t.title,
      seoTitle: t.seoTitle,
      metaDescription: t.metaDescription,
    },
  };
});

export const getBlogArticlesByCategory = cache(async (categorySlug: string, locale: string) => {
  const all = await getPublishedBlogArticles(locale);
  return all.filter((a) => a.categories.some((c) => c.slug === categorySlug));
});
