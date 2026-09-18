import { cache } from "react";
import { prisma } from "@/server/db";
import { parseJson } from "@/lib/utils";
import { parseFaqJson } from "@/lib/faq";
import { blogCategoryLabel } from "@/lib/blog/categories";
import { blogLookupCandidates, blogPathSlug } from "@/lib/slug/blog-slug-map";
import { normalizeRouteSlug } from "@/lib/slug/route-slug";
import { isReviewRequiredText } from "@/lib/catalog/public-i18n";
import { toMasterServiceSlug } from "@/lib/slug/service-slug-map";

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

function scrubReviewRequired(text: string, jobName: string): string {
  if (!text) return text;
  if (!/REVIEW_REQUIRED/i.test(text)) return text;
  const job = jobName.trim() || "الخدمة";
  return text.replace(/REVIEW_REQUIRED/g, job);
}

async function jobDisplayName(relatedServiceSlugs: string, locale: string): Promise<string> {
  const related = parseJson<string[]>(relatedServiceSlugs, []);
  const latin = related.map((s) => toMasterServiceSlug(s)).find((s) => s && !/[\u0600-\u06FF]/.test(s));
  if (!latin) return locale === "ar" ? "الخدمة" : "the service";
  const row = await prisma.service.findFirst({
    where: { slug: latin },
    select: { translations: { select: { locale: true, name: true } } },
  });
  const ar = row?.translations.find((t) => t.locale === "ar")?.name;
  const en = row?.translations.find((t) => t.locale === "en")?.name;
  if (locale === "ar") {
    if (ar && !isReviewRequiredText(ar) && /[\u0600-\u06FF]/.test(ar)) return ar;
    return en || latin;
  }
  return en || latin;
}

function mapCard(
  row: {
    slug: string;
    categorySlugs: string;
    heroImage: string | null;
    publishedAt: Date | null;
    updatedAt: Date;
    relatedServiceSlugs?: string;
    translations: Array<{ locale: string; title: string; excerpt: string; imageAlt: string }>;
  },
  locale: string,
  jobName: string,
): BlogArticleCard | null {
  const t = row.translations.find((x) => x.locale === locale);
  if (!t) return null;
  const cats = parseJson<string[]>(row.categorySlugs, []);
  // EN Latin; AR percent-encoded Arabic (ASCII-safe for Hostinger).
  const publicSlug = blogPathSlug(locale, row.slug);
  return {
    slug: publicSlug,
    title: scrubReviewRequired(t.title, jobName),
    excerpt: scrubReviewRequired(t.excerpt, jobName),
    heroImage: row.heroImage,
    imageAlt: scrubReviewRequired(t.imageAlt || t.title, jobName),
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
  NOT: [
    { slug: { startsWith: "faq-" } },
    { slug: { startsWith: "__restore_faq_" } },
    { slug: { startsWith: "__restore_blog_" } },
    { slug: { startsWith: "أسئلة" } },
    { categorySlugs: { contains: "service-faq" } },
  ],
};

export const getPublishedBlogArticlesPage = cache(
  async (locale: string, opts?: { skip?: number; take?: number; category?: string; q?: string }) => {
    const skip = Math.max(0, opts?.skip ?? 0);
    const take = Math.min(100, Math.max(1, opts?.take ?? 12));
    const category = opts?.category?.trim();
    const q = opts?.q?.trim();

    const where: Parameters<typeof prisma.article.findMany>[0] extends { where?: infer W } | undefined
      ? W
      : never = {
      ...blogWhere,
      ...(category ? { categorySlugs: { contains: category } } : {}),
      translations: {
        some: {
          locale,
          ...(q
            ? {
                OR: [{ title: { contains: q } }, { excerpt: { contains: q } }],
              }
            : {}),
        },
      },
    };

    const [rows, totalRaw] = await Promise.all([
      prisma.article.findMany({
        where,
        select: {
          slug: true,
          categorySlugs: true,
          heroImage: true,
          publishedAt: true,
          updatedAt: true,
          relatedServiceSlugs: true,
          translations: {
            where: { locale },
            select: { locale: true, title: true, excerpt: true, imageAlt: true },
          },
        },
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
        skip,
        take,
      }),
      prisma.article.count({ where }),
    ]);

    const relatedLatin = [
      ...new Set(
        rows.flatMap((r) =>
          parseJson<string[]>(r.relatedServiceSlugs, [])
            .map((s) => toMasterServiceSlug(s))
            .filter((s) => s && !/[\u0600-\u06FF]/.test(s)),
        ),
      ),
    ];
    const serviceRows =
      relatedLatin.length > 0
        ? await prisma.service.findMany({
            where: { slug: { in: relatedLatin } },
            select: { slug: true, translations: { select: { locale: true, name: true } } },
          })
        : [];
    const jobByService = new Map<string, string>();
    for (const svc of serviceRows) {
      const ar = svc.translations.find((t) => t.locale === "ar")?.name;
      const en = svc.translations.find((t) => t.locale === "en")?.name;
      const job =
        locale === "ar"
          ? ar && !isReviewRequiredText(ar) && /[\u0600-\u06FF]/.test(ar)
            ? ar
            : en || svc.slug
          : en || svc.slug;
      jobByService.set(svc.slug, job);
    }

    const items: BlogArticleCard[] = [];
    for (const r of rows) {
      // Skip leftover Arabic primary slugs (should be Latin after restore).
      if (/[\u0600-\u06FF]/.test(r.slug)) continue;
      const first = parseJson<string[]>(r.relatedServiceSlugs, [])
        .map((s) => toMasterServiceSlug(s))
        .find((s) => s && !/[\u0600-\u06FF]/.test(s));
      const job = (first && jobByService.get(first)) || (locale === "ar" ? "الخدمة" : "the service");
      const card = mapCard(r, locale, job);
      if (card) items.push(card);
    }

    return { items, total: totalRaw };
  },
);

export const getPublishedBlogArticles = cache(async (locale: string) => {
  const { items } = await getPublishedBlogArticlesPage(locale, { skip: 0, take: 500 });
  return items;
});

export const getBlogArticleBySlug = cache(async (slug: string, locale: string) => {
  const normalized = normalizeRouteSlug(slug);
  if (
    normalized.startsWith("faq-") ||
    normalized.startsWith("أسئلة") ||
    normalized.startsWith("__restore_faq_") ||
    normalized.startsWith("__restore_blog_")
  ) {
    return null;
  }
  const candidates = blogLookupCandidates(normalized);
  const row = await prisma.article.findFirst({
    where: { slug: { in: candidates }, status: "published", indexable: true },
    include: { translations: true },
  });
  if (!row) return null;
  const cats = parseJson<string[]>(row.categorySlugs, []);
  if (cats.includes("service-faq")) return null;
  const t = row.translations.find((x) => x.locale === locale);
  if (!t) return null;
  const job = await jobDisplayName(row.relatedServiceSlugs, locale);
  const publicSlug = blogPathSlug(locale, row.slug);
  return {
    id: row.id,
    slug: publicSlug,
    heroImage: row.heroImage,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    relatedServiceSlugs: parseJson<string[]>(row.relatedServiceSlugs, []).map((s) => toMasterServiceSlug(s)),
    relatedDiySlugs: parseJson<string[]>(row.relatedDiySlugs, []),
    categories: cats.map((s) => ({
      slug: s,
      label: blogCategoryLabel(s, locale === "ar" ? "ar" : "en"),
    })),
    t: {
      title: scrubReviewRequired(t.title, job),
      excerpt: scrubReviewRequired(t.excerpt, job),
      body: scrubReviewRequired(t.body, job),
      diySection: scrubReviewRequired(t.diySection || "", job),
      faq: parseFaqJson(scrubReviewRequired(t.faq || "[]", job)),
      imageAlt: scrubReviewRequired(t.imageAlt || t.title, job),
      seoTitle: scrubReviewRequired(t.seoTitle, job),
      metaDescription: scrubReviewRequired(t.metaDescription, job),
    },
  };
});

export const getBlogArticlesByCategory = cache(async (categorySlug: string, locale: string) => {
  const all = await getPublishedBlogArticles(locale);
  return all.filter((a) => a.categories.some((c) => c.slug === categorySlug));
});
