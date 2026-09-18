import "./load-env-mysql";
import { prisma } from "../src/server/db";

const AR = /[\u0600-\u06FF]/;
function classifyName(name: string) {
  if (!name || name === "REVIEW_REQUIRED" || name.startsWith("REVIEW_REQUIRED")) return "review";
  if (AR.test(name)) return "arabic";
  return "latin";
}

async function main() {
  const locAr = await prisma.locationI18n.findMany({
    where: { locale: "ar" },
    select: { name: true, location: { select: { slug: true, type: true, status: true, indexable: true, serves: true } } },
  });
  const locBuckets = { review: 0, arabic: 0, latin: 0 };
  const publicBuckets = { review: 0, arabic: 0, latin: 0, total: 0 };
  for (const r of locAr) {
    const k = classifyName(r.name) as keyof typeof locBuckets;
    locBuckets[k] += 1;
    if (r.location.status === "active" && r.location.indexable && r.location.serves) {
      publicBuckets.total += 1;
      publicBuckets[k] += 1;
    }
  }

  const svcAr = await prisma.serviceI18n.findMany({
    where: { locale: "ar" },
    select: { name: true, service: { select: { slug: true, status: true, indexable: true } } },
  });
  const svcBuckets = { review: 0, arabic: 0, latin: 0, total: svcAr.length };
  const svcPublic = { review: 0, arabic: 0, latin: 0, total: 0 };
  for (const r of svcAr) {
    const k = classifyName(r.name) as keyof typeof locBuckets;
    svcBuckets[k] += 1;
    if (r.service.status === "active" && r.service.indexable) {
      svcPublic.total += 1;
      svcPublic[k] += 1;
    }
  }

  const published = await prisma.article.count({ where: { status: "published" } });
  const artArTotal = await prisma.articleI18n.count({ where: { locale: "ar" } });
  const artReviewTitle = await prisma.articleI18n.count({ where: { locale: "ar", title: { contains: "REVIEW_REQUIRED" } } });
  const artReviewBody = await prisma.articleI18n.count({ where: { locale: "ar", body: { contains: "REVIEW_REQUIRED" } } });
  const recentAr = await prisma.articleI18n.findMany({ where: { locale: "ar" }, select: { title: true }, orderBy: { id: "desc" }, take: 200 });
  const recentSample = {
    n: recentAr.length,
    reviewInTitle: recentAr.filter((r) => r.title.includes("REVIEW_REQUIRED")).length,
    hasArabic: recentAr.filter((r) => AR.test(r.title)).length,
    hasAsciiLetters: recentAr.filter((r) => /[A-Za-z]{3,}/.test(r.title)).length,
    examples: recentAr.slice(0, 10).map((r) => r.title),
  };

  console.log(JSON.stringify({
    locations: {
      all: locBuckets,
      publicServing: publicBuckets,
      samples: {
        review: locAr.filter((r) => classifyName(r.name) === "review").slice(0, 10).map((r) => ({ slug: r.location.slug, type: r.location.type, name: r.name })),
        latin: locAr.filter((r) => classifyName(r.name) === "latin").slice(0, 15).map((r) => ({ slug: r.location.slug, type: r.location.type, name: r.name })),
        arabic: locAr.filter((r) => classifyName(r.name) === "arabic").slice(0, 10).map((r) => ({ slug: r.location.slug, name: r.name })),
      },
    },
    services: {
      all: svcBuckets,
      publicActive: svcPublic,
      samples: {
        review: svcAr.filter((r) => classifyName(r.name) === "review").slice(0, 12).map((r) => ({ slug: r.service.slug, name: r.name })),
        latin: svcAr.filter((r) => classifyName(r.name) === "latin").slice(0, 12).map((r) => ({ slug: r.service.slug, name: r.name })),
        arabic: svcAr.filter((r) => classifyName(r.name) === "arabic").slice(0, 8).map((r) => ({ slug: r.service.slug, name: r.name })),
      },
    },
    articles: { published, arRows: artArTotal, titleHasReviewRequired: artReviewTitle, bodyHasReviewRequired: artReviewBody, recentSample },
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
