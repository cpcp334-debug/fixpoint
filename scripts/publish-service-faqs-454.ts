/**
 * Replace old short service FAQs with one published page per offering (454).
 * Hazardous jobs stay observation and stop only.
 */
import { prisma } from "../src/server/db";
import {
  ACTIVE_CATEGORY_ANCHORS,
  APPROVED_CATEGORIES,
  APPROVED_CHILDREN,
  DRAFT_CATEGORY_ANCHORS,
  childSlug,
} from "../prisma/data/catalog-a1";
import {
  SERVICE_FAQ_CATEGORY,
  composeServiceFaq,
  renderedFaqWords,
  type ServiceFaqInput,
} from "../src/lib/faq/service-faq";

const HUBS = ["refrigerator", "microwave", "washing-machine", "water-heater", "dishwasher", "oven", "burner-cooker"];

function offerings(): ServiceFaqInput[] {
  const cats = new Map(APPROVED_CATEGORIES.map((c) => [c.slug, c.nameEn]));
  const rows: ServiceFaqInput[] = [];
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
  const items = offerings();
  const pages = items.map((item) => composeServiceFaq(item));
  let minEn = Number.POSITIVE_INFINITY;
  let minAr = Number.POSITIVE_INFINITY;
  const sampleFailures: string[] = [];
  for (const page of pages) {
    const enWords = renderedFaqWords(page.en);
    const arWords = renderedFaqWords(page.ar);
    minEn = Math.min(minEn, enWords);
    minAr = Math.min(minAr, arWords);
    if (enWords < 1000 || arWords < 1000) {
      if (sampleFailures.length < 6) sampleFailures.push(`${page.slug}: en_${enWords} ar_${arWords}`);
    }
  }
  if (sampleFailures.length) {
    console.log(JSON.stringify({ offerings: items.length, published: 0, failed: sampleFailures.length, minEn, minAr, sampleFailures }, null, 2));
    process.exitCode = 1;
    return;
  }

  const old = await prisma.article.findMany({
    where: { slug: { startsWith: "faq-" } },
    select: { id: true, slug: true },
  });
  if (old.length) {
    await prisma.article.deleteMany({ where: { id: { in: old.map((row) => row.id) } } });
  }

  await prisma.serviceI18n.updateMany({ data: { faq: "[]" } });
  await prisma.faq.deleteMany({ where: { locationId: null } });

  let published = 0;
  let failed = 0;

  for (const item of items) {
    const page = composeServiceFaq(item);
    const enWords = renderedFaqWords(page.en);
    const arWords = renderedFaqWords(page.ar);
    minEn = Math.min(minEn, enWords);
    minAr = Math.min(minAr, arWords);
    if (enWords < 1000 || arWords < 1000) {
      failed += 1;
      if (sampleFailures.length < 6) sampleFailures.push(`${page.slug}: en_${enWords} ar_${arWords}`);
      continue;
    }

    const service = await prisma.service.findUnique({ where: { slug: item.slug }, select: { slug: true } });
    await prisma.article.create({
      data: {
        slug: page.slug,
        status: "published",
        indexable: true,
        categorySlugs: JSON.stringify([SERVICE_FAQ_CATEGORY, page.categorySlug]),
        relatedServiceSlugs: JSON.stringify(service ? [service.slug] : []),
        relatedDiySlugs: JSON.stringify([`diy-${item.slug}`]),
        publishedAt: new Date(),
        translations: {
          create: [
            {
              locale: "en",
              title: page.en.title,
              excerpt: page.en.excerpt,
              body: page.en.body,
              faq: JSON.stringify(page.en.faq),
              seoTitle: page.en.seoTitle,
              metaDescription: page.en.metaDescription,
            },
            {
              locale: "ar",
              title: page.ar.title,
              excerpt: page.ar.excerpt,
              body: page.ar.body,
              faq: JSON.stringify(page.ar.faq),
              seoTitle: page.ar.seoTitle,
              metaDescription: page.ar.metaDescription,
            },
          ],
        },
      },
    });
    published += 1;
  }

  const publicCount = await prisma.article.count({
    where: { status: "published", indexable: true, slug: { startsWith: "faq-" } },
  });

  console.log(
    JSON.stringify(
      {
        offerings: items.length,
        removedOldFaqArticles: old.length,
        published,
        failed,
        publicCount,
        minEn,
        minAr,
        sampleFailures,
      },
      null,
      2,
    ),
  );
  if (failed || published !== 454) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
