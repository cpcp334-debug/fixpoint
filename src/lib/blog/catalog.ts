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

const blogWhere = {
  status: "published" as const,
  indexable: true,
  NOT: [{ slug: { startsWith: "faq-" } }],
};

/** Paginated list — required once service×estate×city corpus is large. */
export const getPublishedBlogArticlesPage = cache(
  async (locale: string, opts?: { skip?: number; take?: number; category?: string; q?: string }) => {
    const skip = Math.max(0, opts?.skip ?? 0);
    const take = Math.min(100, Math.max(1, opts?.take ?? 12));
    const category = opts?.category?.trim();
    const q = opts?.q?.trim();

    // Require locale i18n in WHERE (not only post-filter) so count and page slices stay aligned.
    // SEC publisher used to insert Article before ArticleI18n; without this, pages can be empty
    // while "Page X of N" still reflects raw published rows.
    const where: Parameters<typeof prisma.article.findMany>[0] extends { where?: infer W } | undefined
      ? W
      : never = {
      ...blogWhere,
      ...(category
        ? { categorySlugs: { contains: category } }
        : {}),
      translations: {
        some: {
          locale,
          ...(q
            ? {
                OR: [
                  { title: { contains: q } },
                  { excerpt: { contains: q } },
                ],
              }
            : {}),
        },
      },
    };

    const [rows, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          translations: {
            where: { locale },
            select: { locale: true, title: true, excerpt: true, imageAlt: true },
          },
        },
        // id tie-break: SEC batches share the same publishedAt stamp
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
        skip,
        take,
      }),
      prisma.article.count({ where }),
    ]);

    const items = rows.map((r) => mapCard(r, locale)).filter(Boolean) as BlogArticleCard[];
    return { items, total };
  },
);

/** @deprecated Prefer getPublishedBlogArticlesPage — caps to 500 to avoid OOM. */
export const getPublishedBlogArticles = cache(async (locale: string) => {
  const { items } = await getPublishedBlogArticlesPage(locale, { skip: 0, take: 500 });
  return items;
});

export const getBlogArticleBySlug = cache(async (slug: string, locale: string) => {
  if (slug.startsWith("faq-")) return null;
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
