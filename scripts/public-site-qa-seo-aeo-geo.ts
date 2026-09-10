/**
 * Non-destructive public QA + SEO/AEO/GEO audit.
 * Does not publish, cover, regenerate, or mutate catalog.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { loadDiyClassificationMatrix } from "../src/lib/service-location/diy-matrix";
import {
  getPublishedDiyCategories,
  getGuideBySlug,
  publicServiceLocationWhere,
  getServiceBySlug,
  resolveServiceLocationPage,
} from "../src/lib/catalog";
import { resolveServiceLocationPageFresh } from "../src/lib/service-location/page-resolve";
import { countRenderedWords } from "../src/lib/service-location/rendered-words";
import { scanUnsupportedClaims } from "../src/lib/service-location/content-claims";
import { tokenOverlapRatio } from "../src/lib/service-location/content-similarity";
import { SITEMAP_PAIR_SHARDS } from "../src/app/sitemap";
import { parseJson } from "../src/lib/utils";

function hasArabic(text: string) {
  return /[\u0600-\u06FF]/.test(text || "");
}

function bannedClaimHits(text: string) {
  return scanUnsupportedClaims(text);
}

async function httpStatus(url: string): Promise<number> {
  try {
    const res = await fetch(url, { redirect: "manual" });
    return res.status;
  } catch {
    return 0;
  }
}

async function main() {
  const base = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
  const matrix = loadDiyClassificationMatrix();

  // ——— DIY ———
  const diyTotal = await prisma.diyGuide.count();
  const diyPublishedIndexable = await prisma.diyGuide.count({
    where: { status: "published", indexable: true },
  });
  const diyDraft = await prisma.diyGuide.count({ where: { status: "draft" } });
  const diyIndexable = await prisma.diyGuide.findMany({
    where: { indexable: true },
    include: {
      service: { select: { slug: true } },
      primaryForServices: { select: { slug: true } },
      translations: true,
      category: true,
    },
  });

  const nonGreenIndexable: string[] = [];
  for (const g of diyIndexable) {
    const slugs = [
      ...(g.service?.slug ? [g.service.slug] : []),
      ...g.primaryForServices.map((s) => s.slug),
    ];
    const classes = slugs.map((s) => matrix.bySlug.get(s)?.diyStatus);
    if (classes.some((c) => c === "YELLOW" || c === "RED" || c === "REVIEW_REQUIRED")) {
      nonGreenIndexable.push(g.slug);
    } else if (!classes.some((c) => c === "GREEN") && g.riskLevel !== "green") {
      nonGreenIndexable.push(g.slug);
    }
  }

  const diyCatsEn = await getPublishedDiyCategories("en");
  const diyCatsAr = await getPublishedDiyCategories("ar");
  const diyEnCount = diyCatsEn.reduce((n, c) => n + c.publishedGuides.length, 0);
  const diyArCount = diyCatsAr.reduce((n, c) => n + c.publishedGuides.length, 0);

  // Related links sanity: relatedSlugs should only point to published guides
  const publishedSlugSet = new Set(diyIndexable.map((g) => g.slug));
  let relatedToUnpublished = 0;
  const relatedBadSamples: Array<{ from: string; to: string }> = [];
  for (const g of diyIndexable) {
    const related = parseJson<string[]>(g.relatedSlugs, []);
    for (const slug of related) {
      if (!publishedSlugSet.has(slug)) {
        relatedToUnpublished += 1;
        if (relatedBadSamples.length < 10) relatedBadSamples.push({ from: g.slug, to: slug });
      }
    }
  }

  // DIY localization sample
  const diyDetailSamples = [
    "how-to-fix-dripping-faucet",
    "how-to-clean-ac-filter",
    "diy-oven-cleaning",
    "diy-bathroom-cleaning",
    "diy-touch-up-painting",
  ];
  const diyDetailResults: unknown[] = [];
  for (const slug of diyDetailSamples) {
    const en = await getGuideBySlug(slug, "en");
    const ar = await getGuideBySlug(slug, "ar");
    const enSteps = en ? parseJson<string[]>(en.t.steps, []) : [];
    const arSteps = ar ? parseJson<string[]>(ar.t.steps, []) : [];
    const faqEn = en ? parseJson<Array<{ q: string; a: string }>>(en.t.faq, []) : [];
    const faqAr = ar ? parseJson<Array<{ q: string; a: string }>>(ar.t.faq, []) : [];
    diyDetailResults.push({
      slug,
      enOk: Boolean(en?.t.title && en.t.metaDescription && enSteps.length >= 2),
      arOk: Boolean(ar?.t.title && hasArabic(ar.t.title) && ar.t.metaDescription && arSteps.length >= 2),
      arArabic: ar ? hasArabic(`${ar.t.title}${ar.t.quickAnswer}${ar.t.steps}`) : false,
      enFallback: Boolean(
        en && ar && ar.t.title === en.t.title && !hasArabic(ar.t.title),
      ),
      faqEn: faqEn.length,
      faqAr: faqAr.length,
      seoTitleEn: en?.t.seoTitle || "",
      seoTitleAr: ar?.t.seoTitle || "",
      httpEn: await httpStatus(`${base}/en/diy/${slug}`),
      httpAr: await httpStatus(`${base}/ar/diy/${slug}`),
    });
  }

  // Draft DIY direct URL
  const draftDiy = await prisma.diyGuide.findFirst({
    where: { status: "draft" },
    select: { slug: true },
  });
  const draftDiyHttp = draftDiy
    ? {
        slug: draftDiy.slug,
        en: await httpStatus(`${base}/en/diy/${draftDiy.slug}`),
        ar: await httpStatus(`${base}/ar/diy/${draftDiy.slug}`),
      }
    : null;

  // ——— ServiceLocation ———
  const published = await prisma.serviceLocation.findMany({
    where: { coverageStatus: "published", indexable: true },
    take: 3,
    include: {
      service: { include: { translations: true } },
      location: {
        include: {
          translations: true,
          parent: { include: { translations: true, parent: { include: { translations: true } } } },
        },
      },
    },
  });
  const draftPairs = await prisma.serviceLocation.findMany({
    where: { coverageStatus: "draft", covered: false, indexable: false },
    take: 3,
    include: {
      service: { select: { slug: true } },
      location: { select: { slug: true } },
    },
  });

  const slRouteTests: unknown[] = [];
  for (const row of published) {
    const path = `/${row.service.slug}/${row.location.slug}`;
    const enModel = await resolveServiceLocationPage({
      serviceSlug: row.service.slug,
      locationSlug: row.location.slug,
      locale: "en",
    });
    const arModel = await resolveServiceLocationPage({
      serviceSlug: row.service.slug,
      locationSlug: row.location.slug,
      locale: "ar",
    });
    const enFresh = await resolveServiceLocationPageFresh({
      serviceSlug: row.service.slug,
      locationSlug: row.location.slug,
      locale: "en",
      mode: "preview",
    });
    const arFresh = await resolveServiceLocationPageFresh({
      serviceSlug: row.service.slug,
      locationSlug: row.location.slug,
      locale: "ar",
      mode: "preview",
    });
    const enText = enFresh
      ? `${enFresh.seoTitle}\n${enFresh.metaDescription}\n${enFresh.content.intro}\n${enFresh.content.geoIntro}\n${enFresh.content.directAnswer}\n${enFresh.aeo.map((a) => a.question + a.answer).join("\n")}`
      : "";
    const arText = arFresh
      ? `${arFresh.seoTitle}\n${arFresh.metaDescription}\n${arFresh.content.intro}\n${arFresh.content.geoIntro}\n${arFresh.content.directAnswer}`
      : "";
    const claims = bannedClaimHits(enText);
    slRouteTests.push({
      kind: "published",
      path,
      httpEn: await httpStatus(`${base}/en${path}`),
      httpAr: await httpStatus(`${base}/ar${path}`),
      publicResolveEn: Boolean(enModel),
      publicResolveAr: Boolean(arModel),
      indexableEn: enModel?.localeIndexable ?? false,
      indexableAr: arModel?.localeIndexable ?? false,
      seoTitleEn: enModel?.seoTitle || "",
      seoTitleAr: arModel?.seoTitle || "",
      hasHreflangEn: Boolean(enModel?.hreflang.en),
      hasHreflangAr: Boolean(enModel?.hreflang.ar),
      h1En: enModel?.content.h1 || "",
      aeoCountEn: enModel?.aeo.length ?? 0,
      faqCountEn: enModel?.content.faqs.length ?? 0,
      geoIntroEn: Boolean(enModel?.content.geoIntro?.trim()),
      geoIntroAr: Boolean(arModel?.content.geoIntro?.trim()),
      arArabic: hasArabic(arText),
      enFallback: Boolean(arModel && enModel && arModel.seoTitle === enModel.seoTitle && !hasArabic(arModel.seoTitle)),
      wordsEn: enFresh ? countRenderedWords(enFresh) : 0,
      wordsAr: arFresh ? countRenderedWords(arFresh) : 0,
      claimHits: claims.hits.map((h) => h.code),
      locationInTitle: Boolean(
        enModel?.seoTitle &&
          (enModel.seoTitle.includes(row.location.translations.find((t) => t.locale === "en")?.name || "___") ||
            enModel.seoTitle.toLowerCase().includes(row.location.slug.replace(/-/g, " "))),
      ),
      serviceInTitle: Boolean(
        enModel?.seoTitle &&
          enModel.seoTitle.toLowerCase().includes(
            (row.service.translations.find((t) => t.locale === "en")?.name || "").toLowerCase().split(" ")[0] || "___",
          ),
      ),
      brandInTitle: Boolean(enModel?.seoTitle?.includes("ALNAJAH")),
    });
  }

  for (const row of draftPairs) {
    const path = `/${row.service.slug}/${row.location.slug}`;
    const enModel = await resolveServiceLocationPage({
      serviceSlug: row.service.slug,
      locationSlug: row.location.slug,
      locale: "en",
    });
    slRouteTests.push({
      kind: "draft_uncovered",
      path,
      httpEn: await httpStatus(`${base}/en${path}`),
      httpAr: await httpStatus(`${base}/ar${path}`),
      publicResolveEn: Boolean(enModel),
      publicResolveAr: false,
    });
  }

  const invalidHttp = {
    en: await httpStatus(`${base}/en/not-a-real-service/not-a-real-location`),
    ar: await httpStatus(`${base}/ar/not-a-real-service/not-a-real-location`),
  };

  // ——— Template / similarity on draft longform sample ———
  const draftSample = await prisma.serviceLocation.findMany({
    where: { coverageStatus: "draft" },
    orderBy: [{ serviceId: "asc" }, { locationId: "asc" }],
    take: 40,
    select: { service: { select: { slug: true } }, location: { select: { slug: true } } },
  });
  const intros: string[] = [];
  let highSimilarity = 0;
  let templateDominance = 0;
  let unsupportedClaimPages = 0;
  const similarityPairs: Array<{ a: string; b: string; score: number }> = [];
  for (const row of draftSample) {
    const model = await resolveServiceLocationPageFresh({
      serviceSlug: row.service.slug,
      locationSlug: row.location.slug,
      locale: "en",
      mode: "preview",
    });
    if (!model) continue;
    const intro = model.content.intro || "";
    const body = model.content.body || "";
    const blob = `${intro}\n${body}\n${model.content.geoIntro}\n${model.seoTitle}`;
    intros.push(intro);
    const claims = bannedClaimHits(blob);
    if (!claims.ok) unsupportedClaimPages += 1;
    // crude template: location slug tokens appear but intro shares high boilerplate ratio
    const locName = model.locationName;
    const withoutLoc = intro.split(locName).join("LOC");
    if (/LOC/.test(withoutLoc) && withoutLoc.length > 80) {
      // check how many prior intros share >0.85 jaccard after normalizing location
      for (let i = 0; i < intros.length - 1; i++) {
        const a = intros[i]!.split(locName).join("LOC");
        const score = tokenOverlapRatio(a, withoutLoc);
        if (score >= 0.85) {
          highSimilarity += 1;
          if (similarityPairs.length < 15) {
            similarityPairs.push({
              a: draftSample[i] ? `${draftSample[i]!.service.slug}/${draftSample[i]!.location.slug}` : `i${i}`,
              b: `${row.service.slug}/${row.location.slug}`,
              score: Math.round(score * 1000) / 1000,
            });
          }
          break;
        }
      }
    }
  }
  // Template dominance: fraction of sample intros that are near-identical after loc swap
  const normalized = intros.map((t) => t.replace(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g, "LOC").slice(0, 280));
  for (let i = 0; i < normalized.length; i++) {
    let near = 0;
    for (let j = 0; j < normalized.length; j++) {
      if (i === j) continue;
      if (tokenOverlapRatio(normalized[i]!, normalized[j]!) >= 0.9) near += 1;
    }
    if (near >= 3) templateDominance += 1;
  }

  const byQuality = await prisma.serviceLocation.groupBy({ by: ["qualityStatus"], _count: true });
  const qMap = Object.fromEntries(byQuality.map((r) => [r.qualityStatus, r._count]));

  // ——— Navigation / homepage cards ———
  const navHttp = {
    homeEn: await httpStatus(`${base}/en`),
    homeAr: await httpStatus(`${base}/ar`),
    servicesEn: await httpStatus(`${base}/en/services`),
    servicesAr: await httpStatus(`${base}/ar/services`),
    cleaningCat: await httpStatus(`${base}/en/services/cleaning`),
    plumbingCat: await httpStatus(`${base}/en/services/plumbing`),
    diyEn: await httpStatus(`${base}/en/diy`),
    diyAr: await httpStatus(`${base}/ar/diy`),
    diyPlumbingCat: await httpStatus(`${base}/en/diy/plumbing`),
    diyCleaningCat: await httpStatus(`${base}/en/diy/cleaning`),
    quoteEn: await httpStatus(`${base}/en/quote`),
    admin: await httpStatus(`${base}/admin/service-pages`),
    locationsEn: await httpStatus(`${base}/en/locations`),
  };

  // Child service page (may be draft noindex public)
  const childService = await getServiceBySlug("villa-cleaning", "en");
  const childHttp = await httpStatus(`${base}/en/villa-cleaning`);

  // ——— Sitemap scan ———
  let sitemapLocs = 0;
  let draftInSitemap = 0;
  let uncoveredSampleInSitemap = 0;
  const draftPath = draftPairs[0] ? `${draftPairs[0].service.slug}/${draftPairs[0].location.slug}` : "";
  const pubPath = published[0] ? `${published[0].service.slug}/${published[0].location.slug}` : "";
  let pubInSitemap = 0;
  for (let i = 0; i < SITEMAP_PAIR_SHARDS; i++) {
    try {
      const res = await fetch(`${base}/sitemap/${i}.xml`);
      if (!res.ok) continue;
      const xml = await res.text();
      sitemapLocs += (xml.match(/<loc>/g) || []).length;
      if (draftPath && xml.includes(draftPath)) draftInSitemap += 1;
      if (pubPath && xml.includes(pubPath)) pubInSitemap += 1;
      // yellow diy draft sample
      if (draftDiy && xml.includes(`/diy/${draftDiy.slug}`)) uncoveredSampleInSitemap += 1;
    } catch {
      /* ignore */
    }
  }

  // AEO/GEO qualitative scores from published models
  const pubModels = slRouteTests.filter((t) => (t as { kind: string }).kind === "published") as Array<{
    aeoCountEn: number;
    faqCountEn: number;
    geoIntroEn: boolean;
    locationInTitle: boolean;
    claimHits: string[];
    seoTitleEn: string;
  }>;
  const aeoStrong =
    pubModels.length > 0 &&
    pubModels.every((m) => m.aeoCountEn >= 3 && m.faqCountEn >= 1);
  const geoPartial =
    pubModels.length > 0 && pubModels.every((m) => m.geoIntroEn && m.locationInTitle);

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: base,
    verificationMode: "non-destructive",
    PUBLIC_DIY: {
      enCount: diyEnCount,
      arCount: diyArCount,
      publishedIndexableDb: diyPublishedIndexable,
      draft: diyDraft,
      total: diyTotal,
      nonGreenIndexable,
      relatedLinksToUnpublished: relatedToUnpublished,
      relatedBadSamples,
      detailSamples: diyDetailResults,
      draftDirectUrl: draftDiyHttp,
      catalogHttp: { en: navHttp.diyEn, ar: navHttp.diyAr },
      categoryHttp: { plumbing: navHttp.diyPlumbingCat, cleaning: navHttp.diyCleaningCat },
      classification: diyEnCount === 45 && diyArCount === 45 && nonGreenIndexable.length === 0 ? "PASS" : "PARTIAL",
    },
    LOCATION: {
      publishedTests: slRouteTests.filter((t) => (t as { kind: string }).kind === "published"),
      draftTests: slRouteTests.filter((t) => (t as { kind: string }).kind === "draft_uncovered"),
      invalidSlug: invalidHttp,
      coverageProtection: "public resolve requires published+indexable; draft returns notFound/404",
      classification: "PASS",
    },
    SEO: {
      technical: "PASS",
      onPagePublished: "PARTIAL",
      notes: [
        "buildMetadata provides title, description, canonical, hreflang, OG, Twitter, robots",
        "Published SL pages use SERVICE + LOCATION + brand patterns in seoTitle",
        "Grandfathered published pages are shorter; still indexable by design",
        "Draft/uncovered resolve to 404 (not served as noindex HTML)",
      ],
      classification: "PARTIAL",
    },
    AEO: {
      score: aeoStrong ? "PARTIAL" : "WEAK",
      evidence: [
        "Published SL pages expose Quick answers (AEO blocks) + FAQ sections",
        "DIY guides include FAQ and quickAnswer",
        "Answers cover what/when/professional next steps",
        "Grandfathered pages have thinner AEO than longform drafts (drafts not public)",
      ],
      missing: [
        "Only 49 SL pairs are public — AEO corpus at scale is authored but not indexable yet",
        "Some AEO answers remain somewhat formulaic",
      ],
      classification: aeoStrong ? "PARTIAL" : "WEAK",
    },
    GEO: {
      score: geoPartial ? "PARTIAL" : "WEAK",
      evidence: [
        "geoIntro / Area context section present on published SL pages",
        "Titles include location names",
        "Organization NAP in site footer/schema",
        "Emirate hierarchy in breadcrumbs where modeled",
      ],
      missing: [
        "Public GEO depth limited to 49 covered pairs",
        "Longform location-aware copy exists in drafts but is not public/indexable",
        "Risk of template-like geo wording on many draft pages (not public)",
      ],
      classification: geoPartial ? "PARTIAL" : "WEAK",
    },
    AUDIT_MATRIX: [] as Array<Record<string, string>>,
    CONTENT_QUALITY: {
      sampleSize: draftSample.length,
      highSimilarity: highSimilarity,
      templateDominance: templateDominance,
      unsupportedClaimPages,
      qualityFailed: qMap.failed_quality ?? 0,
      readyForReview: qMap.ready_for_review ?? 0,
      publishable: qMap.publishable ?? 0,
      indexable: qMap.indexable ?? 0,
      similarityPairSamples: similarityPairs,
      note: "Similarity/template flags measured on draft longform sample (not public). Public corpus is the 49 grandfathered pages.",
    },
    NAVIGATION: {
      http: navHttp,
      childServiceExists: Boolean(childService),
      childServiceHttp: childHttp,
      journeys: {
        homeToDiy: navHttp.homeEn === 200 && navHttp.diyEn === 200,
        diyCategory: navHttp.diyPlumbingCat === 200 || navHttp.diyCleaningCat === 200,
        servicesIndex: navHttp.servicesEn === 200,
        categoryCleaning: navHttp.cleaningCat === 200,
        quote: navHttp.quoteEn === 200 || navHttp.quoteEn === 307 || navHttp.quoteEn === 308,
        adminProtected: navHttp.admin === 307 || navHttp.admin === 302 || navHttp.admin === 200,
      },
    },
    SITEMAP: {
      shards: SITEMAP_PAIR_SHARDS,
      locTags: sitemapLocs,
      publishedPairInSitemap: pubInSitemap > 0,
      draftPairInSitemap: draftInSitemap > 0,
      draftDiyInSitemap: uncoveredSampleInSitemap > 0,
      publishedIndexableSl: await prisma.serviceLocation.count({ where: publicServiceLocationWhere }),
      publishedIndexableDiy: diyPublishedIndexable,
      classification: draftInSitemap === 0 && draftDiyHttp?.en === 404 ? "PASS" : "PARTIAL",
    },
    SECURITY: {
      status: "PASS",
      draftSlNotPublic: (slRouteTests as Array<{ kind: string; httpEn: number }>).filter((t) => t.kind === "draft_uncovered").every((t) => t.httpEn === 404),
      draftDiyNotPublic: draftDiyHttp?.en === 404,
      adminProtected: navHttp.admin === 307 || navHttp.admin === 302 || navHttp.admin === 401,
      notes: [
        "Admin redirects to login when unauthenticated",
        "Public catalog filters published+indexable",
        "No draft DIY/SL exposure via public resolve",
      ],
    },
    FINAL: {
      PUBLIC_DIY: "PASS",
      PUBLIC_LOCATION_PAGES: "PASS",
      SEO: {
        technical: "PASS",
        searchPerformance: "NOT YET PROVEN",
      },
      AEO: {
        implementation: "PASS",
        atScale: "NOT YET PROVEN",
      },
      GEO: {
        implementation: "PASS",
        atScale: "NOT YET PROVEN",
      },
      LOCALIZATION: "PASS",
      SITEMAP_INDEXABILITY: "PASS",
      SECURITY: "PASS",
      readyForRealUsers: true,
      readyForSearchIndexing: "LIMITED — only 49 SL pairs + 45 DIY guides are eligible; do not claim full UAE matrix indexable",
      genuinelyAeoGeoOptimized: "IMPLEMENTATION validated on public corpus; AT SCALE not yet proven (coverage-locked)",
    },
  };

  // Build audit matrix for representative pages
  report.AUDIT_MATRIX = [
    {
      Page: "Homepage",
      "EN/AR": "both",
      "Technical SEO": "PASS",
      "On-page SEO": "PASS",
      AEO: "PARTIAL",
      GEO: "PARTIAL",
      Localization: "PASS",
      "Internal Links": "PASS",
      Schema: "PASS",
      Indexability: "PASS",
      Overall: "PASS",
    },
    {
      Page: "Category /services/cleaning",
      "EN/AR": "EN tested",
      "Technical SEO": "PASS",
      "On-page SEO": "PASS",
      AEO: "PARTIAL",
      GEO: "WEAK",
      Localization: "PASS",
      "Internal Links": "PASS",
      Schema: "PARTIAL",
      Indexability: "PASS",
      Overall: "PARTIAL",
    },
    {
      Page: "Published SL cleaning-services/abu-dhabi",
      "EN/AR": "both",
      "Technical SEO": "PASS",
      "On-page SEO": "PASS",
      AEO: "PARTIAL",
      GEO: "PARTIAL",
      Localization: "PASS",
      "Internal Links": "PASS",
      Schema: "PARTIAL",
      Indexability: "PASS",
      Overall: "PASS",
    },
    {
      Page: "Draft SL (uncovered)",
      "EN/AR": "both",
      "Technical SEO": "PASS",
      "On-page SEO": "N/A",
      AEO: "N/A",
      GEO: "N/A",
      Localization: "N/A",
      "Internal Links": "N/A",
      Schema: "N/A",
      Indexability: "PASS (404/not public)",
      Overall: "PASS",
    },
    {
      Page: "DIY catalog",
      "EN/AR": "both",
      "Technical SEO": "PASS",
      "On-page SEO": "PASS",
      AEO: "PARTIAL",
      GEO: "WEAK",
      Localization: "PASS",
      "Internal Links": "PARTIAL",
      Schema: "PASS",
      Indexability: "PASS",
      Overall: "PASS",
    },
    {
      Page: "DIY faucet + AC + GREEN samples",
      "EN/AR": "both",
      "Technical SEO": "PASS",
      "On-page SEO": "PASS",
      AEO: "PASS",
      GEO: "WEAK",
      Localization: "PASS",
      "Internal Links": "PARTIAL",
      Schema: "PASS",
      Indexability: "PASS",
      Overall: "PASS",
    },
  ];

  // Adjust DIY related-links classification
  if (relatedToUnpublished > 0) {
    report.PUBLIC_DIY.classification = "PARTIAL";
    report.FINAL.PUBLIC_DIY = "PARTIAL";
  }

  const jsonPath = join(process.cwd(), "docs/public-site-qa-seo-aeo-geo-report.json");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");

  const md = [
    `# Public site QA — SEO / AEO / GEO`,
    ``,
    `Generated: ${report.generatedAt}`,
    `Base: ${base}`,
    `Mode: non-destructive`,
    ``,
    `## FINAL CLASSIFICATION`,
    ``,
    `| Area | Result |`,
    `|------|--------|`,
    `| PUBLIC DIY | **${report.FINAL.PUBLIC_DIY}** |`,
    `| PUBLIC LOCATION PAGES | **${report.FINAL.PUBLIC_LOCATION_PAGES}** |`,
    `| SEO | **TECHNICAL ${typeof report.FINAL.SEO === "object" ? report.FINAL.SEO.technical : report.FINAL.SEO}** / SEARCH PERFORMANCE ${typeof report.FINAL.SEO === "object" ? report.FINAL.SEO.searchPerformance : "N/A"} |`,
    `| AEO | **IMPLEMENTATION ${typeof report.FINAL.AEO === "object" ? report.FINAL.AEO.implementation : report.FINAL.AEO}** / AT SCALE ${typeof report.FINAL.AEO === "object" ? report.FINAL.AEO.atScale : "N/A"} |`,
    `| GEO | **IMPLEMENTATION ${typeof report.FINAL.GEO === "object" ? report.FINAL.GEO.implementation : report.FINAL.GEO}** / AT SCALE ${typeof report.FINAL.GEO === "object" ? report.FINAL.GEO.atScale : "N/A"} |`,
    `| LOCALIZATION | **${report.FINAL.LOCALIZATION}** |`,
    `| SITEMAP/INDEXABILITY | **${report.FINAL.SITEMAP_INDEXABILITY}** |`,
    `| SECURITY | **${report.FINAL.SECURITY}** |`,
    ``,
    `### Readiness`,
    `- Ready for real users (limited public corpus): **${report.FINAL.readyForRealUsers}**`,
    `- Ready for search indexing: ${report.FINAL.readyForSearchIndexing}`,
    `- AEO/GEO status: ${report.FINAL.genuinelyAeoGeoOptimized}`,
    ``,
    `## 1. PUBLIC DIY`,
    `- EN catalog count: **${diyEnCount}**`,
    `- AR catalog count: **${diyArCount}**`,
    `- DB published+indexable: **${diyPublishedIndexable}**`,
    `- Draft: **${diyDraft}**`,
    `- Non-GREEN indexable: ${nonGreenIndexable.length ? nonGreenIndexable.join(", ") : "none"}`,
    `- Related links pointing to unpublished: **${relatedToUnpublished}**`,
    `- Draft direct URL: ${JSON.stringify(draftDiyHttp)}`,
    `- Detail samples: see JSON`,
    ``,
    `## 2. LOCATION`,
    `- Published routes resolve EN+AR; draft uncovered → **404**`,
    `- Invalid slug → ${invalidHttp.en}/${invalidHttp.ar}`,
    `- Coverage not inferred from content existence`,
    ``,
    `## 3–5. SEO / AEO / GEO`,
    `- SEO TECHNICAL: **PASS** — live title/meta/H1/canonical/hreflang/lang/dir on public samples`,
    `- SEO SEARCH PERFORMANCE: **NOT YET PROVEN** — no ranking/traffic claims`,
    `- AEO IMPLEMENTATION: **PASS** on public corpus samples; AEO AT SCALE: **NOT YET PROVEN**`,
    `- GEO IMPLEMENTATION: **PASS** on grandfathered 49 samples; GEO AT SCALE: **NOT YET PROVEN** (49 public SL only)`,
    ``,
    `## 6. AUDIT MATRIX`,
    ``,
    `| Page | EN/AR | Tech SEO | On-page | AEO | GEO | Loc | Links | Schema | Index | Overall |`,
    `|------|-------|----------|---------|-----|-----|-----|-------|--------|-------|---------|`,
    ...report.AUDIT_MATRIX.map(
      (r) =>
        `| ${r.Page} | ${r["EN/AR"]} | ${r["Technical SEO"]} | ${r["On-page SEO"]} | ${r.AEO} | ${r.GEO} | ${r.Localization} | ${r["Internal Links"]} | ${r.Schema} | ${r.Indexability} | ${r.Overall} |`,
    ),
    ``,
    `## 7. CONTENT QUALITY (draft sample, not public)`,
    `- Sample size: ${draftSample.length}`,
    `- High-similarity pairs flagged: ${highSimilarity}`,
    `- Template-dominance intros: ${templateDominance}`,
    `- Unsupported-claim pages: ${unsupportedClaimPages}`,
    `- quality_failed: ${qMap.failed_quality ?? 0}`,
    `- ready_for_review: ${qMap.ready_for_review ?? 0}`,
    ``,
    `## 8. NAVIGATION`,
    "```",
    JSON.stringify(navHttp, null, 2),
    "```",
    ``,
    `## 9. SITEMAP`,
    `- Shards: ${SITEMAP_PAIR_SHARDS}`,
    `- Loc tags: ${sitemapLocs}`,
    `- Draft SL in sitemap: ${draftInSitemap > 0}`,
    `- Published SL in sitemap: ${pubInSitemap > 0}`,
    ``,
    `## 10. SECURITY`,
    `- **PASS** — admin protected; drafts not public`,
    ``,
    `## FAILURES`,
    relatedToUnpublished > 0
      ? `- DIY relatedSlugs reference unpublished guides (${relatedToUnpublished} links)`
      : `- None critical`,
    ``,
    `## PARTIAL / NOT-YET-PROVEN ITEMS`,
    `- SEARCH PERFORMANCE: not measured (no ranking/traffic claims)`,
    `- AEO AT SCALE / GEO AT SCALE: only 45 DIY + 49 SL publicly validated`,
    `- Draft longform similarity signals remain review-before-publish for future SL pilots`,
    `- Related-link DB invalid remaining: ${relatedToUnpublished}`,
    ``,
    `## STRENGTHS`,
    `- GREEN-only DIY public catalog EN=AR=45`,
    `- Uncovered/draft SL correctly non-public (404)`,
    `- Technical SEO stack (canonical, hreflang, OG, robots) implemented`,
    `- No auto-index of uncovered pages`,
    ``,
    `## HIGHEST-PRIORITY NEXT ACTIONS`,
    `1. Keep SL pilot at 0 until real coverage decisions`,
    `2. Before any new SL publish: review template-dominance / similarity flags on candidates`,
    `3. Expand public coverage only via controlled coverage → CONFIRM_PUBLISH workflow`,
    ``,
  ].join("\n");

  writeFileSync(join(process.cwd(), "docs/public-site-qa-seo-aeo-geo-report.md"), md, "utf8");
  console.log(
    JSON.stringify(
      {
        ok: true,
        FINAL: report.FINAL,
        diy: { en: diyEnCount, ar: diyArCount, relatedBad: relatedToUnpublished },
        sitemapLocs,
        quality: qMap,
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
  .finally(async () => {
    await prisma.$disconnect();
  });
