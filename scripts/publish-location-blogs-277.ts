/**
 * Publish one visitor blog per approved UAE place (277).
 * Does not overwrite service guides or editorial articles.
 */
import { prisma } from "../src/server/db";
import { composeLocationArticle, locationBlogTargets, renderedBlogWords } from "../src/lib/blog/location-article";
import { evaluateBlogPublicationGates } from "../src/lib/blog/publication-gates";

async function main() {
  const places = locationBlogTargets();
  if (places.length !== 277) throw new Error(`expected 277 places, got ${places.length}`);

  let published = 0;
  let failed = 0;
  const failures: string[] = [];
  let minEn = 99999;
  let minAr = 99999;

  for (const place of places) {
    const article = composeLocationArticle(place);
    if (!article.slug.startsWith("place-")) throw new Error(`bad slug ${article.slug}`);
    const enWords = renderedBlogWords(article.en.body, article.en.diySection, article.en.faq);
    const arWords = renderedBlogWords(article.ar.body, article.ar.diySection, article.ar.faq);
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
      relatedServiceSlugs: "[]",
      relatedDiySlugs: "[]",
      publishedAt: new Date(),
    };
    const existing = await prisma.article.findUnique({
      where: { slug: article.slug },
      select: { id: true, publishedAt: true },
    });
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

  const publicCount = await prisma.article.count({
    where: { status: "published", indexable: true, slug: { startsWith: "place-" } },
  });
  console.log(JSON.stringify({ places: places.length, published, failed, publicCount, minEn, minAr, sampleFailures: failures.slice(0, 6) }, null, 2));
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
