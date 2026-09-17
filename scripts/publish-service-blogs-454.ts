/**
 * Publish one visitor blog per approved offering (454).
 * Does not overwrite editorial articles. Does not invent coverage.
 * Hazardous jobs: observation and stop rules only — no repair procedures.
 */
import { prisma } from "../src/server/db";
import {
  ACTIVE_CATEGORY_ANCHORS,
  APPROVED_CATEGORIES,
  APPROVED_CHILDREN,
  DRAFT_CATEGORY_ANCHORS,
  childSlug,
} from "../prisma/data/catalog-a1";
import { composeServiceOfferingArticle, renderedWordCount, type OfferingArticleInput } from "../src/lib/blog/service-offering-article";
import { evaluateBlogPublicationGates } from "../src/lib/blog/publication-gates";

const HUBS = ["refrigerator", "microwave", "washing-machine", "water-heater", "dishwasher", "oven", "burner-cooker"];

function offerings(): OfferingArticleInput[] {
  const cats = new Map(APPROVED_CATEGORIES.map((c) => [c.slug, c.nameEn]));
  const rows: OfferingArticleInput[] = [];
  for (const a of [...ACTIVE_CATEGORY_ANCHORS, ...DRAFT_CATEGORY_ANCHORS]) {
    rows.push({
      slug: a.slug,
      nameEn: a.nameEn,
      categorySlug: a.categorySlug,
      categoryNameEn: cats.get(a.categorySlug) || a.nameEn,
      href: `/${a.slug}`,
    });
  }
  for (const slug of HUBS) {
    rows.push({
      slug,
      nameEn: cats.get(slug) || slug,
      categorySlug: slug,
      categoryNameEn: cats.get(slug) || slug,
      href: `/services/${slug}`,
    });
  }
  for (const child of APPROVED_CHILDREN) {
    const slug = childSlug(child);
    rows.push({
      slug,
      nameEn: child.nameEn,
      categorySlug: child.categorySlug,
      categoryNameEn: cats.get(child.categorySlug) || child.categorySlug,
      href: `/${slug}`,
    });
  }
  return rows;
}

async function main() {
  const list = offerings();
  if (list.length !== 454) throw new Error(`expected 454 offerings, got ${list.length}`);
  const slugs = new Set(list.map((r) => r.slug));
  if (slugs.size !== 454) throw new Error("duplicate offering slugs");

  let published = 0;
  let failed = 0;
  const failures: string[] = [];
  let minEn = 99999;
  let minAr = 99999;

  for (const item of list) {
    const article = composeServiceOfferingArticle(item);
    const enWords = renderedWordCount(article.en.body, article.en.diySection, article.en.faq);
    const arWords = renderedWordCount(article.ar.body, article.ar.diySection, article.ar.faq);
    minEn = Math.min(minEn, enWords);
    minAr = Math.min(minAr, arWords);
    const gate = evaluateBlogPublicationGates({
      slug: article.slug,
      status: "published",
      indexable: true,
      heroImage: article.heroImage,
      en: article.en,
      ar: article.ar,
    });
    if (!gate.pass) {
      failed += 1;
      failures.push(`${article.slug}: ${gate.failures.join(",")}`);
      continue;
    }
    const data = {
      status: "published" as const,
      indexable: true,
      categorySlugs: JSON.stringify(article.categorySlugs),
      heroImage: article.heroImage,
      relatedServiceSlugs: JSON.stringify(article.relatedServiceSlugs),
      relatedDiySlugs: "[]",
      publishedAt: new Date(),
    };
    const existing = await prisma.article.findUnique({ where: { slug: article.slug }, select: { id: true, publishedAt: true } });
    if (existing && !article.slug.startsWith("guide-")) {
      throw new Error(`refusing to overwrite non-guide article ${article.slug}`);
    }
    const translations = {
      create: [
        { locale: "en", ...article.en },
        { locale: "ar", ...article.ar },
      ],
    };
    if (existing) {
      await prisma.articleI18n.deleteMany({ where: { articleId: existing.id } });
      await prisma.article.update({
        where: { id: existing.id },
        data: { ...data, publishedAt: existing.publishedAt ?? new Date(), translations },
      });
    } else {
      await prisma.article.create({ data: { slug: article.slug, ...data, translations } });
    }
    published += 1;
  }

  const publicCount = await prisma.article.count({ where: { status: "published", indexable: true, slug: { startsWith: "guide-" } } });
  console.log(JSON.stringify({ offerings: list.length, published, failed, publicCount, minEn, minAr, sampleFailures: failures.slice(0, 8) }, null, 2));
  if (failed) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
