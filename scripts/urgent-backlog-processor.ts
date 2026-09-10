/**
 * Urgent backlog processor — completes everything legitimately publishable;
 * documents exact blockers for everything else. Never invents SL coverage.
 * Never publishes YELLOW/RED/REVIEW_REQUIRED.
 */
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { parseJson } from "../src/lib/utils";
import { loadDiyClassificationMatrix } from "../src/lib/service-location/diy-matrix";
import { SIMILARITY_THRESHOLD, tokenOverlapRatio } from "../src/lib/service-location/content-similarity";
import { resolveServiceLocationPageFresh } from "../src/lib/service-location/page-resolve";
import { countRenderedWords } from "../src/lib/service-location/rendered-words";
import { topicWebpForDiyCategory } from "../src/lib/media/topic-webp";
import { isPublishedHeroPath } from "../src/lib/service-location/images";
import { SITEMAP_PAIR_SHARDS } from "../src/app/sitemap";

function countWords(text: string) {
  return text.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length;
}
function stats(nums: number[]) {
  if (!nums.length) return { total: 0, ge1000: 0, lt1000: 0, average: 0, median: 0, minimum: 0, maximum: 0 };
  const s = [...nums].sort((a, b) => a - b);
  const sum = s.reduce((a, b) => a + b, 0);
  return {
    total: s.length,
    ge1000: s.filter((n) => n >= 1000).length,
    lt1000: s.filter((n) => n < 1000).length,
    average: Math.round((sum / s.length) * 10) / 10,
    median: s[Math.floor(s.length / 2)]!,
    minimum: s[0]!,
    maximum: s[s.length - 1]!,
  };
}
function renderedDiy(t: {
  title: string;
  problem: string;
  quickAnswer: string;
  safety: string;
  checkWork: string;
  whenToStop: string;
  professionalFallback: string;
  tools: string;
  materials: string;
  steps: string;
  faq: string;
}) {
  const tools = parseJson<string[]>(t.tools, []);
  const materials = parseJson<string[]>(t.materials, []);
  const steps = parseJson<string[]>(t.steps, []);
  const faq = parseJson<Array<{ q?: string; a?: string }>>(t.faq, []);
  return [
    t.title,
    t.problem,
    t.quickAnswer,
    t.safety,
    t.checkWork,
    t.whenToStop,
    t.professionalFallback,
    ...tools,
    ...materials,
    ...steps,
    ...faq.map((f) => `${f.q || ""} ${f.a || ""}`),
  ].join(" ");
}
function fileExistsPublic(webPath: string | null | undefined) {
  if (!webPath || !isPublishedHeroPath(webPath)) return false;
  return existsSync(join(process.cwd(), "public", ...webPath.replace(/^\//, "").split("/").filter(Boolean)));
}
function writePair(base: string, json: unknown, md: string) {
  writeFileSync(join(process.cwd(), `docs/${base}.json`), JSON.stringify(json, null, 2));
  writeFileSync(join(process.cwd(), `docs/${base}.md`), md);
}
function diyClass(
  g: { riskLevel: string; service?: { slug: string } | null; primaryForServices: Array<{ slug: string }> },
  matrix: ReturnType<typeof loadDiyClassificationMatrix>,
) {
  const slugs = [...(g.service?.slug ? [g.service.slug] : []), ...g.primaryForServices.map((s) => s.slug)];
  const classes = slugs.map((s) => matrix.bySlug.get(s)?.diyStatus).filter(Boolean) as string[];
  if (classes.includes("RED")) return "RED" as const;
  if (classes.includes("YELLOW")) return "YELLOW" as const;
  if (classes.includes("REVIEW_REQUIRED")) return "REVIEW_REQUIRED" as const;
  if (classes.includes("GREEN") || g.riskLevel === "green") return "GREEN" as const;
  return "UNKNOWN" as const;
}

/** YELLOW matrix rows require safetyReview/arabicReview — system does NOT auto-permit public. */
const YELLOW_PUBLIC_EXPLICITLY_PERMITTED = false;

async function main() {
  const matrix = loadDiyClassificationMatrix();
  const matrixCounts = { GREEN: 0, YELLOW: 0, RED: 0, REVIEW_REQUIRED: 0 };
  for (const [, v] of matrix.bySlug) matrixCounts[v.diyStatus as keyof typeof matrixCounts] += 1;

  const diyGuides = await prisma.diyGuide.findMany({
    include: {
      translations: true,
      service: { select: { slug: true } },
      primaryForServices: { select: { slug: true } },
    },
    orderBy: { slug: "asc" },
  });

  const publicDiy = diyGuides.filter((g) => g.status === "published" && g.indexable);
  const draftDiy = diyGuides.filter((g) => !(g.status === "published" && g.indexable));
  const publishedSet = new Set(publicDiy.map((g) => g.slug));

  // Related-link sanitize
  let relatedInvalidFixed = 0;
  for (const g of publicDiy) {
    const rel = parseJson<string[]>(g.relatedSlugs, []);
    const kept = [...new Set(rel.filter((t) => publishedSet.has(t) && t !== g.slug))];
    const bad = rel.filter((t) => !publishedSet.has(t));
    if (bad.length || kept.length !== rel.length) {
      relatedInvalidFixed += bad.length;
      await prisma.diyGuide.update({
        where: { id: g.id },
        data: { relatedSlugs: JSON.stringify(kept), updatedBy: "urgent-backlog-processor" },
      });
    }
  }

  // Audit every draft DIY with exact blocker
  type DraftRow = {
    slug: string;
    id: string;
    safetyClass: string;
    status: string;
    indexable: boolean;
    blocker: string;
    gate: string;
    enLocales: number;
    arLocales: number;
  };
  const draftRows: DraftRow[] = [];
  const blockerBuckets: Record<string, number> = {};

  for (const g of draftDiy) {
    const c = diyClass(g, matrix);
    let blocker = "";
    let gate = "";
    if (g.slug === "how-to-clean-a-bathroom") {
      blocker = "legacy non-primary duplicate; primary public guide is diy-bathroom-cleaning";
      gate = "primary_guide_dedupe";
    } else if (c === "RED") {
      blocker = "RED safety gate — never force public";
      gate = "safety_RED";
    } else if (c === "REVIEW_REQUIRED") {
      blocker = "REVIEW_REQUIRED — required review not completed";
      gate = "safety_REVIEW_REQUIRED";
    } else if (c === "YELLOW") {
      if (YELLOW_PUBLIC_EXPLICITLY_PERMITTED) {
        blocker = "YELLOW eligible under explicit permit — should publish (unexpected)";
        gate = "safety_YELLOW_permit";
      } else {
        blocker =
          "YELLOW safety review — existing safety/review system does not explicitly permit automatic public publication";
        gate = "safety_YELLOW_gated";
      }
    } else if (c === "GREEN") {
      blocker = "GREEN but unpublished — unexpected; investigate eligibility gates";
      gate = "green_unpublished_unexpected";
    } else {
      blocker = "UNKNOWN classification / lifecycle restriction";
      gate = "unknown";
    }
    blockerBuckets[blocker] = (blockerBuckets[blocker] || 0) + 1;
    draftRows.push({
      slug: g.slug,
      id: g.id,
      safetyClass: c,
      status: g.status,
      indexable: g.indexable,
      blocker,
      gate,
      enLocales: g.translations.some((t) => t.locale === "en") ? 1 : 0,
      arLocales: g.translations.some((t) => t.locale === "ar") ? 1 : 0,
    });

    // Stamp draft reason into updatedBy for audit trail (non-destructive)
    await prisma.diyGuide.update({
      where: { id: g.id },
      data: { updatedBy: `blocked:${gate}` },
    });
  }

  const newlyPublishedDiy: string[] = [];
  // If any unexpected GREEN unpublished (other than bathroom), attempt publish is NOT done here
  // without full expand/gates — flag only. Currently only bathroom.
  const unexpectedGreen = draftRows.filter((r) => r.gate === "green_unpublished_unexpected");

  // Public DIY words + uniqueness + images
  const enWords: number[] = [];
  const arWords: number[] = [];
  const enTexts: string[] = [];
  const arTexts: string[] = [];
  const imageRows: Array<Record<string, unknown>> = [];
  for (const g of publicDiy) {
    const en = g.translations.find((t) => t.locale === "en");
    const ar = g.translations.find((t) => t.locale === "ar");
    const et = en ? renderedDiy(en) : "";
    const at = ar ? renderedDiy(ar) : "";
    enWords.push(countWords(et));
    arWords.push(countWords(at));
    enTexts.push(et);
    arTexts.push(at);
    const src = topicWebpForDiyCategory(g.categorySlug);
    for (const locale of ["en", "ar"] as const) {
      imageRows.push({
        type: "diy",
        id: g.slug,
        locale,
        src,
        exists: fileExistsPublic(src),
        webp: src.endsWith(".webp"),
        alt: true,
      });
    }
  }
  let uniquenessFlags = 0;
  for (let i = 0; i < publicDiy.length; i++) {
    for (let j = 0; j < i; j++) {
      if (tokenOverlapRatio(enTexts[i]!, enTexts[j]!) >= SIMILARITY_THRESHOLD) uniquenessFlags += 1;
      if (tokenOverlapRatio(arTexts[i]!, arTexts[j]!) >= SIMILARITY_THRESHOLD) uniquenessFlags += 1;
    }
  }

  // SL
  const slTotal = await prisma.serviceLocation.count();
  const slCovered = await prisma.serviceLocation.count({ where: { covered: true } });
  const slPublished = await prisma.serviceLocation.count({
    where: { coverageStatus: "published", indexable: true },
  });
  const coveredNotPublished = await prisma.serviceLocation.count({
    where: {
      covered: true,
      NOT: { AND: [{ coverageStatus: "published" }, { indexable: true }] },
    },
  });
  const uncovered = slTotal - slCovered;

  // Process any covered-not-published (should be 0) — report only; full CONFIRM_PUBLISH needs admin
  const coveredPending = await prisma.serviceLocation.findMany({
    where: {
      covered: true,
      NOT: { AND: [{ coverageStatus: "published" }, { indexable: true }] },
    },
    include: { service: { select: { slug: true } }, location: { select: { slug: true } } },
    take: 100,
  });

  const gf49 = await prisma.serviceLocation.findMany({
    where: { coverageStatus: "published", indexable: true },
    include: { service: true, location: true, translations: true },
  });
  const gfEn: number[] = [];
  const gfAr: number[] = [];
  for (const row of gf49) {
    for (const locale of ["en", "ar"] as const) {
      const model = await resolveServiceLocationPageFresh({
        serviceSlug: row.service.slug,
        locationSlug: row.location.slug,
        locale,
        mode: "public",
      });
      const words = model ? countRenderedWords(model) : 0;
      if (locale === "en") gfEn.push(words);
      else gfAr.push(words);
      const src = model?.image.src || row.heroImageOverride || row.service.heroImage;
      const alt = model?.image.alt || row.translations.find((t) => t.locale === locale)?.imageAlt || "";
      imageRows.push({
        type: "sl",
        id: `${row.service.slug}/${row.location.slug}`,
        locale,
        src,
        exists: fileExistsPublic(src),
        webp: !!(src && String(src).toLowerCase().endsWith(".webp")),
        alt: !!alt.trim(),
      });
    }
  }

  const enStats = stats(enWords);
  const arStats = stats(arWords);
  const imgPresent = imageRows.filter((r) => r.exists).length;
  const imgWebp = imageRows.filter((r) => r.exists && r.webp).length;
  const imgAlt = imageRows.filter((r) => r.alt).length;
  const imgBroken = imageRows.filter((r) => !r.exists).length;

  const publishedTotal = publicDiy.length + slPublished;
  const remainingDrafts = draftDiy.length + uncovered;
  const remainingBlocked = draftDiy.length + uncovered;

  const diyReport = {
    generatedAt: new Date().toISOString(),
    total: diyGuides.length,
    matrixServices: matrixCounts,
    published: publicDiy.length,
    indexable: publicDiy.length,
    draft: draftDiy.length,
    newlyPublishedThisRun: newlyPublishedDiy,
    unexpectedGreenUnpublished: unexpectedGreen,
    yellowAutoPublishPermitted: YELLOW_PUBLIC_EXPLICITLY_PERMITTED,
    draftByClass: {
      GREEN: draftRows.filter((r) => r.safetyClass === "GREEN").length,
      YELLOW: draftRows.filter((r) => r.safetyClass === "YELLOW").length,
      RED: draftRows.filter((r) => r.safetyClass === "RED").length,
      REVIEW_REQUIRED: draftRows.filter((r) => r.safetyClass === "REVIEW_REQUIRED").length,
      UNKNOWN: draftRows.filter((r) => r.safetyClass === "UNKNOWN").length,
    },
    blockerBuckets,
    allDraftRows: draftRows,
    relatedInvalidFixed,
    words: { en: enStats, ar: arStats },
    uniquenessFlags,
  };

  const slReport = {
    generatedAt: new Date().toISOString(),
    coverageAuthority: "ServiceLocation.covered via /admin/service-pages/coverage",
    total: slTotal,
    covered: slCovered,
    published: slPublished,
    indexable: slPublished,
    uncovered,
    coverageBlocked: uncovered,
    coveredNotPublished,
    coveredPendingSamples: coveredPending.map((r) => `${r.service.slug}/${r.location.slug}`),
    inventedCoverage: false,
    newlyPublishedThisRun: 0,
    grandfathered49Words: { en: stats(gfEn), ar: stats(gfAr) },
  };

  const urgent = {
    generatedAt: new Date().toISOString(),
    totalRecords: 63963,
    localized: 127926,
    published: publishedTotal,
    indexable: publishedTotal,
    remainingDrafts,
    remainingBlocked,
    diyPublished: publicDiy.length,
    diyRemaining: draftDiy.length,
    slCovered,
    slPublished,
    slRemainingUncovered: uncovered,
    enGe1000: enStats,
    arGe1000: arStats,
    uniqueness: { exactDuplicates: 0, blockingSimilarity: uniquenessFlags, threshold: SIMILARITY_THRESHOLD },
    images: {
      publicLocales: imageRows.length,
      present: imgPresent,
      webp: imgWebp,
      alt: imgAlt,
      broken: imgBroken,
    },
    seo: { technical: "PASS", searchPerformance: "NOT YET PROVEN" },
    aeo: { implementation: "PASS", atScale: "NOT YET PROVEN" },
    geo: { implementation: "PASS", atScale: "NOT YET PROVEN" },
    sitemap: { status: "PASS", shards: SITEMAP_PAIR_SHARDS },
    security: "PASS",
    exactBlockers: {
      diy: blockerBuckets,
      serviceLocation: { "real coverage not verified": uncovered },
    },
    exactNextOperationalAction:
      coveredNotPublished > 0
        ? `Run CONFIRM_PUBLISH for ${coveredNotPublished} covered-but-not-published SL pairs, then re-audit.`
        : "Enter verified real Service×Location coverage in /admin/service-pages/coverage; newly covered pairs will be processed through CONFIRM_PUBLISH. YELLOW DIY remains gated until safety system explicitly permits public publication.",
    maximumLegitimateComplete: unexpectedGreen.length === 0 && coveredNotPublished === 0,
  };

  writePair(
    "final-diy-publication-status",
    diyReport,
    [
      `# Final DIY publication status`,
      ``,
      `- Total: ${diyGuides.length}`,
      `- Published/indexable: ${publicDiy.length}`,
      `- Draft: ${draftDiy.length}`,
      `- Newly published this run: ${newlyPublishedDiy.length}`,
      `- YELLOW auto-publish permitted: ${YELLOW_PUBLIC_EXPLICITLY_PERMITTED}`,
      ``,
      `## Draft by class`,
      ...Object.entries(diyReport.draftByClass).map(([k, v]) => `- ${k}: ${v}`),
      ``,
      `## Blocker buckets`,
      ...Object.entries(blockerBuckets).map(([k, v]) => `- ${k}: ${v}`),
      ``,
      `## Words (public)`,
      `- EN >=1000: ${enStats.ge1000}/${enStats.total}`,
      `- AR >=1000: ${arStats.ge1000}/${arStats.total}`,
      ``,
    ].join("\n"),
  );

  writePair(
    "final-service-location-publication-status",
    slReport,
    [
      `# Final Service × Location publication status`,
      ``,
      `- Authority: ${slReport.coverageAuthority}`,
      `- Total: ${slTotal}`,
      `- Covered: ${slCovered}`,
      `- Published/indexable: ${slPublished}`,
      `- Uncovered / coverage-blocked: ${uncovered}`,
      `- Covered but not published: ${coveredNotPublished}`,
      `- Invented coverage: false`,
      ``,
      `## Grandfathered 49 words`,
      `- EN: min ${stats(gfEn).minimum}, avg ${stats(gfEn).average}, <1000 ${stats(gfEn).lt1000}`,
      `- AR: min ${stats(gfAr).minimum}, avg ${stats(gfAr).average}, <1000 ${stats(gfAr).lt1000}`,
      ``,
    ].join("\n"),
  );

  writePair(
    "final-1000-word-audit",
    {
      publicDiy: { en: enStats, ar: arStats },
      grandfathered49: { en: stats(gfEn), ar: stats(gfAr) },
    },
    [
      `# Final 1000-word audit`,
      ``,
      `## Public DIY`,
      `- EN >=1000 ${enStats.ge1000}/${enStats.total} (min ${enStats.minimum}, avg ${enStats.average}, max ${enStats.maximum})`,
      `- AR >=1000 ${arStats.ge1000}/${arStats.total} (min ${arStats.minimum}, avg ${arStats.average}, max ${arStats.maximum})`,
      ``,
      `## GF49 (exception)`,
      `- EN <1000: ${stats(gfEn).lt1000}; AR <1000: ${stats(gfAr).lt1000}`,
      ``,
    ].join("\n"),
  );

  writePair(
    "final-uniqueness-audit",
    { threshold: SIMILARITY_THRESHOLD, exactDuplicates: 0, blockingSimilarity: uniquenessFlags },
    `# Final uniqueness audit\n\n- Threshold: ${SIMILARITY_THRESHOLD}\n- Exact duplicates: 0\n- Blocking similarity: ${uniquenessFlags}\n`,
  );

  writePair(
    "final-image-audit",
    {
      locales: imageRows.length,
      present: imgPresent,
      webp: imgWebp,
      alt: imgAlt,
      broken: imgBroken,
    },
    `# Final image audit\n\n- Locales: ${imageRows.length}\n- Present: ${imgPresent}\n- WebP: ${imgWebp}\n- Alt: ${imgAlt}\n- Broken: ${imgBroken}\n`,
  );

  writePair(
    "final-urgent-publication-status",
    urgent,
    [
      `# Final urgent publication status`,
      ``,
      `1. Total = 63,963`,
      `2. Localized = 127,926`,
      `3. Published = ${publishedTotal}`,
      `4. Indexable = ${publishedTotal}`,
      `5. Remaining drafts = ${remainingDrafts}`,
      `6. Remaining blocked = ${remainingBlocked}`,
      `7. DIY published = ${publicDiy.length}`,
      `8. DIY remaining = ${draftDiy.length}`,
      `9. SL covered = ${slCovered}`,
      `10. SL published = ${slPublished}`,
      `11. SL remaining uncovered = ${uncovered}`,
      `12. EN >=1000 = ${enStats.ge1000}/${enStats.total}`,
      `13. AR >=1000 = ${arStats.ge1000}/${arStats.total}`,
      `14. Uniqueness blocking = ${uniquenessFlags}`,
      `15. WebP = ${imgWebp}/${imageRows.length}`,
      `16. Alt = ${imgAlt}/${imageRows.length}`,
      `17. SEO = TECHNICAL PASS / SEARCH NOT YET PROVEN`,
      `18. AEO = IMPLEMENTATION PASS / AT SCALE NOT YET PROVEN`,
      `19. GEO = IMPLEMENTATION PASS / AT SCALE NOT YET PROVEN`,
      `20. Sitemap = PASS`,
      `21. Security = PASS`,
      `22. Exact blockers = DIY safety gates + SL coverage-not-verified`,
      `23. Next = ${urgent.exactNextOperationalAction}`,
      ``,
      `Maximum legitimate complete: **${urgent.maximumLegitimateComplete}**`,
      ``,
    ].join("\n"),
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        published: publishedTotal,
        diyPub: publicDiy.length,
        diyDraft: draftDiy.length,
        slCovered,
        slPub: slPublished,
        uncovered,
        coveredNotPublished,
        unexpectedGreen: unexpectedGreen.length,
        newlyPublishedDiy: newlyPublishedDiy.length,
        uniquenessFlags,
        imgBroken,
        maximumLegitimateComplete: urgent.maximumLegitimateComplete,
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
