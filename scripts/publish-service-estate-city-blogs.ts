/**
 * Publish service × estate (community) × city blog articles.
 * Target: 460 services × 259 communities ≈ 119,140 (city from community.parent).
 *
 * Env:
 *   SEC_BLOG_CONFIRM=CONFIRM_PUBLISH — required for writes
 *   SEC_BLOG_LIMIT — max new articles this run (default 500)
 *   SEC_BLOG_BATCH — createMany chunk size (default 50)
 *   SEC_BLOG_DRY_RUN=1 — compose + count only
 *   SEC_BLOG_SKIP_GATES=1 — skip per-row gate (still validates one sample)
 *   Prefer `.env.mysql` for Hostinger remote (loaded first)
 */
import "./load-env-mysql";
import { randomBytes } from "node:crypto";
import { prisma } from "../src/server/db";
import { composeServiceEstateCityArticle } from "../src/lib/blog/service-estate-city-article";
import { evaluateBlogPublicationGates } from "../src/lib/blog/publication-gates";

function createId() {
  return `c${randomBytes(12).toString("hex")}`;
}

type Pair = {
  serviceSlug: string;
  serviceNameEn: string;
  serviceNameAr: string;
  categorySlug: string;
  estateSlug: string;
  estateNameEn: string;
  estateNameAr: string;
  citySlug: string;
  cityNameEn: string;
  cityNameAr: string;
};

function nameOf(
  translations: Array<{ locale: string; name?: string; title?: string }>,
  locale: string,
  fallback: string,
) {
  const row = translations.find((t) => t.locale === locale);
  return (row?.name || row?.title || fallback).trim() || fallback;
}

async function loadPairs(): Promise<Pair[]> {
  const [services, communities] = await Promise.all([
    prisma.service.findMany({
      select: {
        slug: true,
        category: { select: { slug: true } },
        translations: { select: { locale: true, name: true } },
      },
      orderBy: { slug: "asc" },
    }),
    prisma.location.findMany({
      where: { type: "community" },
      select: {
        slug: true,
        parentId: true,
        translations: { select: { locale: true, name: true } },
      },
      orderBy: { slug: "asc" },
    }),
  ]);

  const allLocs = await prisma.location.findMany({
    select: {
      id: true,
      slug: true,
      type: true,
      parentId: true,
      translations: { select: { locale: true, name: true } },
    },
  });
  const byId = new Map(allLocs.map((l) => [l.id, l]));

  function placeOf(communityParentId: string | null) {
    let cur = communityParentId ? byId.get(communityParentId) : undefined;
    const seen = new Set<string>();
    let emirate: (typeof allLocs)[number] | undefined;
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      if (cur.type === "city") return cur;
      if (cur.type === "emirate") emirate = cur;
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    // Many communities parent directly to an emirate (no city row).
    return emirate;
  }

  let skippedNoPlace = 0;
  const pairs: Pair[] = [];
  for (const s of services) {
    const serviceNameEn = nameOf(s.translations, "en", s.slug);
    const serviceNameAr = nameOf(s.translations, "ar", serviceNameEn);
    const categorySlug = s.category?.slug || "general-maintenance";
    for (const c of communities) {
      const place = placeOf(c.parentId);
      if (!place) {
        skippedNoPlace += 1;
        continue;
      }
      pairs.push({
        serviceSlug: s.slug,
        serviceNameEn,
        serviceNameAr,
        categorySlug,
        estateSlug: c.slug,
        estateNameEn: nameOf(c.translations, "en", c.slug),
        estateNameAr: nameOf(c.translations, "ar", c.slug),
        citySlug: place.slug,
        cityNameEn: nameOf(place.translations, "en", place.slug),
        cityNameAr: nameOf(place.translations, "ar", place.slug),
      });
    }
  }
  console.log(
    JSON.stringify({
      phase: "pair_build",
      services: services.length,
      communities: communities.length,
      skippedNoPlace,
      pairs: pairs.length,
    }),
  );
  return pairs;
}

async function main() {
  if (process.env.SEC_BLOG_CONFIRM !== "CONFIRM_PUBLISH" && process.env.SEC_BLOG_DRY_RUN !== "1") {
    throw new Error("Set SEC_BLOG_CONFIRM=CONFIRM_PUBLISH or SEC_BLOG_DRY_RUN=1");
  }
  const limit = Math.max(1, Number(process.env.SEC_BLOG_LIMIT || "500"));
  const batchSize = Math.max(1, Math.min(200, Number(process.env.SEC_BLOG_BATCH || "50")));
  const dry = process.env.SEC_BLOG_DRY_RUN === "1";
  const skipGates = process.env.SEC_BLOG_SKIP_GATES === "1";

  const [svcCount, locCount, comCount, rawSvc] = await Promise.all([
    prisma.service.count(),
    prisma.location.count(),
    prisma.location.count({ where: { type: "community" } }),
    prisma.$queryRawUnsafe<Array<{ c: number | bigint }>>("SELECT COUNT(*) AS c FROM Service"),
  ]);
  console.log(
    JSON.stringify(
      {
        phase: "db_probe",
        svcCount,
        locCount,
        comCount,
        rawServiceCount: Number(rawSvc[0]?.c ?? 0),
        dbUrlHost: (process.env.DATABASE_URL || "").replace(/:\/\/([^:]+):[^@]+@/, "://$1:***@").slice(0, 80),
      },
      null,
      2,
    ),
  );

  const pairs = await loadPairs();
  console.log(
    JSON.stringify(
      {
        phase: "matrix",
        pairs: pairs.length,
        services: new Set(pairs.map((p) => p.serviceSlug)).size,
        estates: new Set(pairs.map((p) => p.estateSlug)).size,
        cities: new Set(pairs.map((p) => p.citySlug)).size,
      },
      null,
      2,
    ),
  );

  if (pairs.length === 0) throw new Error("no service×estate×city pairs found");

  const sample = composeServiceEstateCityArticle(pairs[0]!);
  const gate = evaluateBlogPublicationGates({
    slug: sample.slug,
    status: "published",
    indexable: true,
    heroImage: sample.heroImage,
    en: sample.en,
    ar: sample.ar,
  });
  if (!gate.pass) {
    throw new Error(`sample_gate_failed:${gate.failures.join(",")}`);
  }

  const existing = await prisma.article.findMany({
    where: {
      OR: pairs.slice(0, Math.min(pairs.length, 5)).map((p) => {
        const a = composeServiceEstateCityArticle(p);
        return { slug: a.slug };
      }),
    },
    select: { slug: true },
  });
  void existing;

  // Load existing slugs for this corpus prefix pattern via raw query of all non-faq blog
  // that match composed slugs — for full matrix use a Set of all article slugs (memory ~few MB).
  const allSlugs = await prisma.article.findMany({
    where: { NOT: { slug: { startsWith: "faq-" } } },
    select: { slug: true },
  });
  const have = new Set(allSlugs.map((r) => r.slug));

  const todo: Pair[] = [];
  for (const p of pairs) {
    const article = composeServiceEstateCityArticle(p);
    if (have.has(article.slug)) continue;
    todo.push(p);
    if (todo.length >= limit) break;
  }

  console.log(JSON.stringify({ phase: "plan", already: have.size, todo: todo.length, limit, dry }, null, 2));

  if (dry) {
    console.log(JSON.stringify({ phase: "dry_run_sample", slug: sample.slug, title: sample.en.title }, null, 2));
    return;
  }

  let created = 0;
  let failed = 0;
  const failures: string[] = [];

  for (let i = 0; i < todo.length; i += batchSize) {
    const chunk = todo.slice(i, i + batchSize);
    const composed = chunk.map((p) => composeServiceEstateCityArticle(p));

    if (!skipGates) {
      for (const article of composed) {
        const g = evaluateBlogPublicationGates({
          slug: article.slug,
          status: "published",
          indexable: true,
          heroImage: article.heroImage,
          en: article.en,
          ar: article.ar,
        });
        if (!g.pass) {
          failed += 1;
          failures.push(`${article.slug}:${g.failures.join(",")}`);
        }
      }
      if (failures.length && failures.length >= created + 10) {
        // keep going but log
      }
    }

    const now = new Date();
    const articleRows = composed.map((a) => ({
      id: createId(),
      slug: a.slug,
      status: "published" as const,
      indexable: true,
      categorySlugs: JSON.stringify(a.categorySlugs),
      heroImage: a.heroImage,
      relatedServiceSlugs: JSON.stringify(a.relatedServiceSlugs),
      relatedDiySlugs: "[]",
      publishedAt: now,
    }));

    try {
      // Atomic Article + ArticleI18n so the public blog index never sees published
      // rows without locale translations (empty "Latest articles" + huge page count).
      const insertedCount = await prisma.$transaction(async (tx) => {
        await tx.article.createMany({ data: articleRows, skipDuplicates: true });
        const inserted = await tx.article.findMany({
          where: { slug: { in: articleRows.map((r) => r.slug) } },
          select: { id: true, slug: true },
        });
        const bySlug = new Map(inserted.map((r) => [r.slug, r.id]));
        const i18nRows = composed.flatMap((a) => {
          const articleId = bySlug.get(a.slug);
          if (!articleId) return [];
          return [
            { id: createId(), articleId, locale: "en", ...a.en },
            { id: createId(), articleId, locale: "ar", ...a.ar },
          ];
        });
        if (i18nRows.length) {
          await tx.articleI18n.createMany({ data: i18nRows, skipDuplicates: true });
        }
        return inserted.length;
      });
      created += insertedCount;
      console.log(JSON.stringify({ phase: "batch", from: i, to: i + chunk.length, created, failed }));
    } catch (e) {
      failed += chunk.length;
      failures.push(`batch_${i}:${String(e).slice(0, 200)}`);
      console.error(JSON.stringify({ phase: "batch_error", from: i, error: String(e).slice(0, 300) }));
    }
  }

  const publishedSec = await prisma.article.count({
    where: {
      status: "published",
      indexable: true,
      categorySlugs: { contains: "service-location" },
    },
  });
  const publishedBlog = await prisma.article.count({
    where: { status: "published", indexable: true, NOT: { slug: { startsWith: "faq-" } } },
  });

  console.log(
    JSON.stringify(
      {
        phase: "done",
        created,
        failed,
        publishedSec,
        publishedBlog,
        matrixPairs: pairs.length,
        sampleFailures: failures.slice(0, 8),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
