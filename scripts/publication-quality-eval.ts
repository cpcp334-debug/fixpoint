/**
 * Publication quality evaluation for draft ServiceLocation rows.
 * Promotes to qualityStatus=publishable (READY_FOR_PUBLISH) when gates pass.
 * Never sets covered/published/indexable. Never mutates published rows.
 *
 * Env:
 *   PUB_QUALITY_LIMIT (default 500)
 *   PUB_QUALITY_OFFSET (default 0)
 *   PUB_QUALITY_SERVICE (optional slug filter)
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { scanUnsupportedClaims, flattenContentTexts } from "../src/lib/service-location/content-claims";
import { tokenOverlapRatio, SIMILARITY_THRESHOLD } from "../src/lib/service-location/content-similarity";
import { UNMAPPED_LEGACY_DRAFT_SLUGS } from "../prisma/data/catalog-a1";

function stripPlaceNames(text: string, names: string[]): string {
  let out = text.toLowerCase();
  for (const name of names) {
    if (!name.trim()) continue;
    out = out.split(name.toLowerCase()).join(" ");
  }
  return out.replace(/\s+/g, " ").trim();
}

function faqCount(raw: string): number {
  try {
    const arr = JSON.parse(raw || "[]") as unknown[];
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

async function main() {
  const limit = Number(process.env.PUB_QUALITY_LIMIT || "500");
  const offset = Number(process.env.PUB_QUALITY_OFFSET || "0");
  const serviceFilter = process.env.PUB_QUALITY_SERVICE?.trim() || "";
  const legacy = new Set(UNMAPPED_LEGACY_DRAFT_SLUGS as readonly string[]);

  const rows = await prisma.serviceLocation.findMany({
    where: {
      coverageStatus: { not: "published" },
      ...(serviceFilter ? { service: { slug: serviceFilter } } : {}),
    },
    select: {
      id: true,
      covered: true,
      coverageStatus: true,
      qualityStatus: true,
      qualityScore: true,
      indexable: true,
      service: {
        select: {
          slug: true,
          riskLevel: true,
          translations: { where: { locale: "en" }, select: { longDescription: true, name: true } },
        },
      },
      location: {
        select: {
          slug: true,
          translations: { select: { locale: true, name: true } },
        },
      },
      translations: true,
    },
    orderBy: [{ service: { slug: "asc" } }, { location: { slug: "asc" } }],
    skip: offset,
    take: limit,
  });

  const report = {
    offset,
    limit,
    selected: rows.length,
    publishable: 0,
    ready_for_review: 0,
    failed_quality: 0,
    incomplete: 0,
    skippedPublished: 0,
    claimFlags: 0,
    thinFlags: 0,
    duplicateFlags: 0,
    templateFlags: 0,
    uncoveredKeptNoindex: 0,
  };

  // Build per-service normalized corpus for similarity within this batch
  const byServiceNorm: Map<string, string[]> = new Map();

  for (const row of rows) {
    if (row.coverageStatus === "published") {
      report.skippedPublished += 1;
      continue;
    }

    const en = row.translations.find((t) => t.locale === "en");
    const ar = row.translations.find((t) => t.locale === "ar");
    const locNames = row.location.translations.map((t) => t.name).filter(Boolean);
    const serviceName = row.service.translations[0]?.name || row.service.slug;

    const enOk = Boolean(en?.h1?.trim() && en?.intro?.trim() && en?.seoTitle?.trim() && en?.metaDescription?.trim());
    const arOk = Boolean(ar?.h1?.trim() && ar?.intro?.trim() && ar?.seoTitle?.trim() && ar?.metaDescription?.trim());
    const geoOk = Boolean(en?.geoIntro?.trim() && ar?.geoIntro?.trim());
    const aeoOk = Boolean(en?.directAnswer?.trim() && ar?.directAnswer?.trim());
    const faqOk = faqCount(en?.faq || "[]") >= 3 && faqCount(ar?.faq || "[]") >= 3;
    const altOk = Boolean(en?.imageAlt?.trim() && ar?.imageAlt?.trim());

    if (!enOk) {
      await prisma.serviceLocation.update({
        where: { id: row.id },
        data: { qualityStatus: "incomplete", qualityScore: 20, indexable: false },
      });
      report.incomplete += 1;
      continue;
    }

    const flatEn = flattenContentTexts({
      seoTitle: en?.seoTitle,
      metaDescription: en?.metaDescription,
      h1: en?.h1,
      intro: en?.intro,
      localInfo: en?.localInfo,
      body: en?.body,
      directAnswer: en?.directAnswer,
      geoIntro: en?.geoIntro,
    });
    const claims = scanUnsupportedClaims(flatEn, ar?.intro, ar?.body, ar?.seoTitle);
    const thinReasons: string[] = [];
    if ((en?.intro || "").trim().length < 40) thinReasons.push("intro_thin");
    if ((en?.localInfo || "").trim().length < 20) thinReasons.push("local_info_thin");
    if ((en?.directAnswer || "").trim().length < 40) thinReasons.push("direct_answer_thin");
    if ((en?.body || "").trim().length < 80) thinReasons.push("body_thin");
    const thinOk = thinReasons.length === 0;

    const normalized = stripPlaceNames(`${en?.intro || ""}\n${en?.body || ""}`, [...locNames, serviceName]);
    const corpus = byServiceNorm.get(row.service.slug) || [];
    let dupOk = true;
    let maxSim = 0;
    for (const prior of corpus) {
      const ratio = tokenOverlapRatio(normalized, prior);
      if (ratio > maxSim) maxSim = ratio;
      if (ratio >= SIMILARITY_THRESHOLD) dupOk = false;
    }
    // Seed corpus with first few norms (keep bounded)
    if (corpus.length < 8 && normalized.length > 40) {
      corpus.push(normalized);
      byServiceNorm.set(row.service.slug, corpus);
    }

    const canonical = row.service.translations[0]?.longDescription || "";
    const vsCanonical = canonical
      ? tokenOverlapRatio(normalized, stripPlaceNames(canonical, [serviceName]))
      : 0;
    // High overlap vs canonical after stripping place names = template dominance (warning, not hard fail)
    const templateDominant = vsCanonical >= 0.92 || (!dupOk && maxSim >= SIMILARITY_THRESHOLD);

    if (!claims.ok) report.claimFlags += 1;
    if (!thinOk) report.thinFlags += 1;
    if (!dupOk) report.duplicateFlags += 1;
    if (templateDominant) report.templateFlags += 1;

    let nextQuality: "publishable" | "ready_for_review" | "failed_quality" | "incomplete" = "ready_for_review";
    let score = 60;

    if (!claims.ok || !thinOk) {
      nextQuality = "failed_quality";
      score = 25;
    } else if (!arOk || !geoOk || !aeoOk || !faqOk || !altOk || templateDominant || !dupOk) {
      // Content exists but needs review (template/AR/local differentiation) — NOT auto READY_FOR_PUBLISH
      nextQuality = "ready_for_review";
      score = templateDominant || !dupOk ? 55 : 65;
    } else if (enOk && arOk && geoOk && aeoOk && faqOk && altOk && claims.ok && thinOk && dupOk && !templateDominant) {
      nextQuality = "publishable";
      score = 85;
    }

    // Legacy outside matrix: never auto-publishable without explicit review
    if (legacy.has(row.service.slug) && nextQuality === "publishable") {
      nextQuality = "ready_for_review";
      score = Math.min(score, 60);
    }

    // Uncovered always stays noindex; lifecycle stays draft (content-ready is qualityStatus only)
    await prisma.serviceLocation.update({
      where: { id: row.id },
      data: {
        qualityStatus: nextQuality,
        qualityScore: score,
        indexable: false,
        // do not touch covered / coverageStatus / published
      },
    });

    if (!row.covered) report.uncoveredKeptNoindex += 1;
    if (nextQuality === "publishable") report.publishable += 1;
    else if (nextQuality === "failed_quality") report.failed_quality += 1;
    else report.ready_for_review += 1;
  }

  const out = join(process.cwd(), "docs/publication-quality-eval.json");
  writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
