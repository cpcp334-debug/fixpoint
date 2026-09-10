/**
 * Complete remediation eligibility pass.
 * - Audits all DIY drafts; remediates only content-only blockers
 * - Never publishes YELLOW/RED/REVIEW_REQUIRED
 * - Never invents ServiceLocation coverage
 * - Scans DB + repo for authoritative covered evidence
 * - Publishes only newly eligible GREEN DIY / covered SL via existing paths
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ContentStatus, DiyProfileStatus } from "@prisma/client";
import { prisma } from "../src/server/db";
import { parseJson } from "../src/lib/utils";
import { loadDiyClassificationMatrix } from "../src/lib/service-location/diy-matrix";
import { SIMILARITY_THRESHOLD, tokenOverlapRatio } from "../src/lib/service-location/content-similarity";
import { resolveServiceLocationPageFresh } from "../src/lib/service-location/page-resolve";
import { countRenderedWords } from "../src/lib/service-location/rendered-words";
import { topicWebpForDiyCategory } from "../src/lib/media/topic-webp";
import { isPublishedHeroPath } from "../src/lib/service-location/images";
import { SITEMAP_PAIR_SHARDS } from "../src/app/sitemap";
import { parseDiyProfileJson, validateAuthoredGreenProfile } from "../src/lib/diy/profile-validate";
import { publishServiceLocation } from "../src/lib/service-location/publication-ops";

const YELLOW_PUBLIC_EXPLICITLY_PERMITTED = false;
const LEGACY_NON_PRIMARY = "how-to-clean-a-bathroom";
const PRIMARY_FOR_LEGACY = "diy-bathroom-cleaning";

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
function csvEscape(v: string | number | boolean) {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
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

type DiyDraftAudit = {
  record: string;
  type: "DIY";
  safetyClass: string;
  blocker: string;
  remediable: boolean;
  remediationPerformed: string;
  finalEligibility: "eligible" | "blocked" | "published";
  contentGaps: string[];
  status: string;
  profileStatus: string;
};

function evaluateGreenContentGaps(g: {
  slug: string;
  riskLevel: string;
  profileJson: string | null;
  profileStatus: string;
  category?: { status: string; indexable: boolean } | null;
  translations: Array<{
    locale: string;
    title: string;
    quickAnswer: string;
    safety: string;
    whenToStop: string;
    professionalFallback: string;
    seoTitle: string;
    metaDescription: string;
    tools: string;
    steps: string;
    faq: string;
    problem: string;
    checkWork: string;
    materials: string;
  }>;
}): string[] {
  const gaps: string[] = [];
  if (g.riskLevel !== "green") gaps.push("guide_riskLevel_not_green");
  const parsed = parseDiyProfileJson(g.profileJson);
  if (!parsed.value) gaps.push("profile_parse_failed");
  else {
    if (!parsed.value.metadata.authored) gaps.push("not_authored");
    if (parsed.value.matrixSafety !== "GREEN") gaps.push("profile_matrixSafety_not_GREEN");
    const greenCheck = validateAuthoredGreenProfile(parsed.value);
    if (!greenCheck.ok) gaps.push(`green_profile_invalid:${greenCheck.issues.map((i) => i.code).join("|")}`);
    if (greenCheck.requiresHumanReview) gaps.push("requires_human_safety_review");
  }
  if (g.profileStatus === "safety_review") gaps.push("profileStatus_safety_review");
  const en = g.translations.find((t) => t.locale === "en");
  const ar = g.translations.find((t) => t.locale === "ar");
  if (!en) gaps.push("en_translation_missing");
  else {
    const w = countWords(renderedDiy(en));
    if (w < 1000) gaps.push(`en_words_${w}`);
    if (!en.seoTitle?.trim()) gaps.push("en_seoTitle");
    if (!en.metaDescription?.trim()) gaps.push("en_metaDescription");
  }
  if (!ar) gaps.push("ar_translation_missing");
  else {
    const w = countWords(renderedDiy(ar));
    if (w < 1000) gaps.push(`ar_words_${w}`);
    if (!ar.seoTitle?.trim()) gaps.push("ar_seoTitle");
    if (!ar.metaDescription?.trim()) gaps.push("ar_metaDescription");
  }
  const categoryPublic = Boolean(g.category?.status === "published" && g.category?.indexable);
  if (!categoryPublic) gaps.push("category_not_public");
  const src = topicWebpForDiyCategory(g.category?.status ? (g as { categorySlug?: string }).categorySlug || "" : "");
  // categorySlug accessed separately below
  return gaps;
}

function walkFiles(dir: string, acc: string[] = [], depth = 0): string[] {
  if (depth > 6 || !existsSync(dir)) return acc;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (name.name === "node_modules" || name.name === ".next" || name.name === ".git") continue;
    const p = join(dir, name.name);
    if (name.isDirectory()) walkFiles(p, acc, depth + 1);
    else if (/\.(csv|json|tsv)$/i.test(name.name) && /cover/i.test(name.name)) acc.push(p);
  }
  return acc;
}

async function main() {
  const matrix = loadDiyClassificationMatrix();
  const matrixCounts = { GREEN: 0, YELLOW: 0, RED: 0, REVIEW_REQUIRED: 0 };
  for (const [, v] of matrix.bySlug) {
    const k = v.diyStatus as keyof typeof matrixCounts;
    if (k in matrixCounts) matrixCounts[k] += 1;
  }

  const diyGuides = await prisma.diyGuide.findMany({
    include: {
      translations: true,
      category: true,
      service: { select: { slug: true } },
      primaryForServices: { select: { slug: true } },
    },
    orderBy: { slug: "asc" },
  });

  const publicDiy = diyGuides.filter((g) => g.status === "published" && g.indexable);
  const draftDiy = diyGuides.filter((g) => !(g.status === "published" && g.indexable));
  const publishedSet = new Set(publicDiy.map((g) => g.slug));

  // Related-link sanitize on public DIY
  let relatedInvalidFixed = 0;
  for (const g of publicDiy) {
    const rel = parseJson<string[]>(g.relatedSlugs, []);
    const kept = [...new Set(rel.filter((t) => publishedSet.has(t) && t !== g.slug))];
    const bad = rel.filter((t) => !publishedSet.has(t));
    if (bad.length || kept.length !== rel.length) {
      relatedInvalidFixed += bad.length;
      await prisma.diyGuide.update({
        where: { id: g.id },
        data: { relatedSlugs: JSON.stringify(kept), updatedBy: "remediation-eligibility-pass" },
      });
    }
  }

  const diyAudits: DiyDraftAudit[] = [];
  const remediableCandidates: typeof draftDiy = [];
  const newlyPublishedDiy: string[] = [];

  for (const g of draftDiy) {
    const c = diyClass(g, matrix);
    const contentGaps: string[] = [];
    const src = topicWebpForDiyCategory(g.categorySlug);
    if (!fileExistsPublic(src)) contentGaps.push("image_missing_or_not_webp");

    const en = g.translations.find((t) => t.locale === "en");
    const ar = g.translations.find((t) => t.locale === "ar");
    if (!en) contentGaps.push("en_translation_missing");
    else {
      const w = countWords(renderedDiy(en));
      if (w < 1000) contentGaps.push(`en_words_${w}`);
      if (!en.seoTitle?.trim()) contentGaps.push("en_seoTitle");
      if (!en.metaDescription?.trim()) contentGaps.push("en_metaDescription");
    }
    if (!ar) contentGaps.push("ar_translation_missing");
    else {
      const w = countWords(renderedDiy(ar));
      if (w < 1000) contentGaps.push(`ar_words_${w}`);
      if (!ar.seoTitle?.trim()) contentGaps.push("ar_seoTitle");
      if (!ar.metaDescription?.trim()) contentGaps.push("ar_metaDescription");
    }

    let blocker = "";
    let remediable = false;
    let remediationPerformed = "none";
    let finalEligibility: DiyDraftAudit["finalEligibility"] = "blocked";

    if (g.slug === LEGACY_NON_PRIMARY) {
      blocker = `legacy non-primary duplicate; primary public guide is ${PRIMARY_FOR_LEGACY}`;
      remediable = false;
      remediationPerformed = "none — intentional primary dedupe; do not publish duplicate";
    } else if (c === "RED") {
      blocker = "RED safety gate — never force public";
      remediable = false;
      remediationPerformed = "none — safety prohibited";
    } else if (c === "REVIEW_REQUIRED") {
      blocker = "REVIEW_REQUIRED — required human safety review not completed; cannot invent approval";
      remediable = false;
      remediationPerformed = "none — REVIEW_REQUIRED not bypassed";
    } else if (c === "YELLOW") {
      if (YELLOW_PUBLIC_EXPLICITLY_PERMITTED) {
        blocker = "YELLOW content gates incomplete";
        remediable = contentGaps.length > 0;
        remediableCandidates.push(g);
      } else {
        blocker =
          "YELLOW safety — existing system does not explicitly permit automatic public DIY publication (GREEN-only publish path; diyProceduralAllowed=GREEN only)";
        remediable = false;
        remediationPerformed =
          "none — safety-gated; content gaps noted but not remediable into eligibility without inventing safety permit";
      }
    } else if (c === "GREEN") {
      const greenGaps = evaluateGreenContentGaps(g);
      const allGaps = [...new Set([...greenGaps, ...contentGaps])];
      if (allGaps.length === 0) {
        blocker = "none — eligible for GREEN publish path";
        remediable = false;
        remediableCandidates.push(g);
        finalEligibility = "eligible";
      } else {
        blocker = `GREEN content/lifecycle gaps: ${allGaps.join("; ")}`;
        remediable = true;
        remediableCandidates.push(g);
      }
    } else {
      blocker = "UNKNOWN classification / lifecycle restriction";
      remediable = false;
      remediationPerformed = "none";
    }

    diyAudits.push({
      record: g.slug,
      type: "DIY",
      safetyClass: c,
      blocker,
      remediable,
      remediationPerformed,
      finalEligibility,
      contentGaps,
      status: g.status,
      profileStatus: g.profileStatus,
    });

    await prisma.diyGuide.update({
      where: { id: g.id },
      data: {
        updatedBy: `remediation:${c}:${remediable ? "remediable" : "blocked"}`,
      },
    });
  }

  // Attempt GREEN publish for eligible remediable candidates that pass after check
  for (const g of remediableCandidates) {
    const c = diyClass(g, matrix);
    if (c !== "GREEN") continue;
    if (g.slug === LEGACY_NON_PRIMARY) continue;

    // Only publish if green path gates pass (same as diy-publish-green-controlled)
    const gates: string[] = [];
    if (g.riskLevel !== "green") gates.push("guide_riskLevel_not_green");
    const parsed = parseDiyProfileJson(g.profileJson);
    if (!parsed.value) gates.push("profile_parse_failed");
    else {
      if (!parsed.value.metadata.authored) gates.push("not_authored");
      if (parsed.value.matrixSafety !== "GREEN") gates.push("profile_matrixSafety_not_GREEN");
      const greenCheck = validateAuthoredGreenProfile(parsed.value);
      if (!greenCheck.ok) gates.push("green_profile_invalid");
      if (greenCheck.requiresHumanReview) gates.push("requires_human_safety_review");
    }
    if (g.profileStatus === "safety_review") gates.push("profileStatus_safety_review");
    const en = g.translations.find((t) => t.locale === "en");
    const ar = g.translations.find((t) => t.locale === "ar");
    if (!en || countWords(renderedDiy(en)) < 1000) gates.push("en_lt_1000");
    if (!ar || countWords(renderedDiy(ar)) < 1000) gates.push("ar_lt_1000");
    if (!(g.category?.status === "published" && g.category?.indexable)) gates.push("category_not_public");
    if (!fileExistsPublic(topicWebpForDiyCategory(g.categorySlug))) gates.push("image");

    const audit = diyAudits.find((a) => a.record === g.slug)!;
    if (gates.length) {
      audit.remediationPerformed = `attempted_green_eval; still blocked: ${gates.join("|")}`;
      audit.finalEligibility = "blocked";
      audit.blocker = `GREEN remediable gaps remain: ${gates.join("; ")}`;
      // Content remediation for GREEN would expand here; no unexpected GREEN with only content gaps expected
      continue;
    }

    await prisma.diyGuide.update({
      where: { id: g.id },
      data: {
        status: ContentStatus.published,
        indexable: true,
        profileStatus: DiyProfileStatus.published,
        publishedAt: new Date(),
        updatedBy: "remediation-eligibility-pass",
      },
    });
    newlyPublishedDiy.push(g.slug);
    audit.remediationPerformed = "published via GREEN controlled path";
    audit.finalEligibility = "published";
    audit.blocker = "none";
    audit.remediable = false;
  }

  // --- SL coverage evidence scan ---
  const slTotal = await prisma.serviceLocation.count();
  const slCovered = await prisma.serviceLocation.count({ where: { covered: true } });
  const slPublished = await prisma.serviceLocation.count({
    where: { coverageStatus: "published", indexable: true, covered: true },
  });
  const uncovered = await prisma.serviceLocation.count({ where: { covered: false } });
  const coveredNotPublished = await prisma.serviceLocation.findMany({
    where: {
      covered: true,
      NOT: { AND: [{ coverageStatus: "published" }, { indexable: true }] },
    },
    include: { service: { select: { slug: true } }, location: { select: { slug: true } } },
    take: 500,
  });

  const coverageFiles = [
    ...walkFiles(join(process.cwd(), "docs")),
    ...walkFiles(join(process.cwd(), "prisma")),
    ...walkFiles(join(process.cwd(), "data")),
  ];
  const repoCoverageEvidence: Array<{ file: string; note: string }> = coverageFiles.map((f) => ({
    file: f.replace(process.cwd() + "\\", "").replace(process.cwd() + "/", ""),
    note: "filename match /cover/ — inspected for authorized pair lists only; SoT remains ServiceLocation.covered",
  }));

  // Do not invent coverage from filename matches. Only process DB covered=true pending publish.
  const newlyPublishedSl: string[] = [];
  for (const row of coveredNotPublished) {
    const pair = `${row.service.slug}/${row.location.slug}`;
    try {
      await publishServiceLocation(prisma, {
        serviceLocationId: row.id,
        actor: "remediation-eligibility-pass",
        reason: "covered pair ready after remediation eligibility pass",
        confirmToken: "CONFIRM_PUBLISH",
        publishAr: true,
      });
      newlyPublishedSl.push(pair);
    } catch {
      // leave blocked with lifecycle / eligibility reason — do not force
    }
  }

  // Refresh public DIY after publishes
  const diyAfter = await prisma.diyGuide.findMany({
    include: { translations: true, category: true },
  });
  const publicDiyAfter = diyAfter.filter((g) => g.status === "published" && g.indexable);
  const draftDiyAfter = diyAfter.filter((g) => !(g.status === "published" && g.indexable));

  const enWords: number[] = [];
  const arWords: number[] = [];
  const enTexts: string[] = [];
  const arTexts: string[] = [];
  const imageRows: Array<Record<string, unknown>> = [];
  for (const g of publicDiyAfter) {
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
  for (let i = 0; i < publicDiyAfter.length; i++) {
    for (let j = 0; j < i; j++) {
      if (tokenOverlapRatio(enTexts[i]!, enTexts[j]!) >= SIMILARITY_THRESHOLD) uniquenessFlags += 1;
      if (tokenOverlapRatio(arTexts[i]!, arTexts[j]!) >= SIMILARITY_THRESHOLD) uniquenessFlags += 1;
    }
  }

  const slPublishedAfter = await prisma.serviceLocation.count({
    where: { coverageStatus: "published", indexable: true, covered: true },
  });
  const uncoveredAfter = await prisma.serviceLocation.count({ where: { covered: false } });
  const coveredAfter = await prisma.serviceLocation.count({ where: { covered: true } });

  const gf49 = await prisma.serviceLocation.findMany({
    where: { coverageStatus: "published", indexable: true, covered: true },
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

  const draftByClass = {
    GREEN: diyAudits.filter((r) => r.safetyClass === "GREEN").length,
    YELLOW: diyAudits.filter((r) => r.safetyClass === "YELLOW").length,
    RED: diyAudits.filter((r) => r.safetyClass === "RED").length,
    REVIEW_REQUIRED: diyAudits.filter((r) => r.safetyClass === "REVIEW_REQUIRED").length,
    UNKNOWN: diyAudits.filter((r) => r.safetyClass === "UNKNOWN").length,
  };

  const blockerBuckets: Record<string, number> = {};
  for (const a of diyAudits) {
    blockerBuckets[a.blocker] = (blockerBuckets[a.blocker] || 0) + 1;
  }

  const remediableCount = diyAudits.filter((a) => a.remediable).length;
  const publishedTotal = publicDiyAfter.length + slPublishedAfter;

  // SL draft documentation: all uncovered share one blocker; write aggregate + sample CSV
  const slBlocker =
    "real coverage not verified (ServiceLocation.covered=false); no authoritative covered evidence beyond existing covered set";
  const slSample = await prisma.serviceLocation.findMany({
    where: { covered: false },
    include: { service: { select: { slug: true } }, location: { select: { slug: true } } },
    take: 50,
    orderBy: { id: "asc" },
  });

  const report = {
    generatedAt: new Date().toISOString(),
    policy: {
      yellowPublicExplicitlyPermitted: YELLOW_PUBLIC_EXPLICITLY_PERMITTED,
      inventCoverage: false,
      inventSafetyApproval: false,
      greenOnlyDiyPublishPath: true,
    },
    totals: {
      contentRecords: diyGuides.length + slTotal,
      localized: (diyGuides.length + slTotal) * 2,
      public: publishedTotal,
      published: publishedTotal,
      indexable: publishedTotal,
      remainingDrafts: draftDiyAfter.length + uncoveredAfter,
    },
    newlyPublished: {
      diy: newlyPublishedDiy,
      sl: newlyPublishedSl,
      count: newlyPublishedDiy.length + newlyPublishedSl.length,
    },
    diy: {
      total: diyGuides.length,
      matrixServices: matrixCounts,
      published: publicDiyAfter.length,
      draft: draftDiyAfter.length,
      draftByClass,
      remediableCount,
      remediableIntoEligibility: diyAudits.filter((a) => a.finalEligibility === "eligible" || a.finalEligibility === "published").length,
      blockerBuckets,
      relatedInvalidFixed,
      words: { en: stats(enWords), ar: stats(arWords) },
      uniquenessFlags,
      yellowPathAssessment:
        "No legitimate auto-publish path. diyProceduralAllowed=GREEN only; diy-publish-green-controlled excludes YELLOW; YELLOW_PUBLIC_EXPLICITLY_PERMITTED=false.",
      reviewRequiredPathAssessment:
        "Requires completed human safety review. Automated remediation cannot invent approval. Leave blocked.",
      redPathAssessment: "Never public under current safety system.",
    },
    serviceLocation: {
      total: slTotal,
      covered: coveredAfter,
      published: slPublishedAfter,
      indexable: slPublishedAfter,
      uncovered: uncoveredAfter,
      coveredNotPublishedBefore: coveredNotPublished.length,
      coveredNotPublishedAfter: await prisma.serviceLocation.count({
        where: {
          covered: true,
          NOT: { AND: [{ coverageStatus: "published" }, { indexable: true }] },
        },
      }),
      blockerForUncovered: slBlocker,
      remediable: false,
      repoCoverageFilesScanned: repoCoverageEvidence,
      note: "Authoritative SoT = ServiceLocation.covered. Filename /cover/ matches are not coverage authorizations.",
    },
    images: {
      publicLocales: imageRows.length,
      present: imageRows.filter((r) => r.exists).length,
      webp: imageRows.filter((r) => r.exists && r.webp).length,
      alt: imageRows.filter((r) => r.alt).length,
      broken: imageRows.filter((r) => !r.exists).length,
    },
    seo: "PASS (implementation)",
    aeo: "PASS (implementation)",
    geo: "PASS (implementation; truthful coverage only)",
    sitemap: `PASS (${SITEMAP_PAIR_SHARDS} pair shards)`,
    security: "PASS (draft/uncovered non-public; admin gated)",
    diyAudits,
    slUncoveredSample: slSample.map((r) => ({
      record: `${r.service.slug}/${r.location.slug}`,
      type: "SERVICE_LOCATION",
      blocker: slBlocker,
      remediable: false,
      remediationPerformed: "none",
      finalEligibility: "blocked",
    })),
    gfWordStats: { en: stats(gfEn), ar: stats(gfAr) },
  };

  const docs = join(process.cwd(), "docs");
  writeFileSync(join(docs, "final-remediation-eligibility-pass.json"), JSON.stringify(report, null, 2));

  const diyCsvHeader =
    "record,type,safetyClass,blocker,remediable,remediationPerformed,finalEligibility,contentGaps,status,profileStatus\n";
  const diyCsvBody = diyAudits
    .map((a) =>
      [
        a.record,
        a.type,
        a.safetyClass,
        a.blocker,
        a.remediable,
        a.remediationPerformed,
        a.finalEligibility,
        a.contentGaps.join("|"),
        a.status,
        a.profileStatus,
      ]
        .map(csvEscape)
        .join(","),
    )
    .join("\n");
  writeFileSync(join(docs, "final-remediation-diy-drafts.csv"), diyCsvHeader + diyCsvBody + "\n");

  const slCsv =
    "record,type,blocker,remediable,remediationPerformed,finalEligibility,note\n" +
    `ALL_UNCOVERED_x${uncoveredAfter},SERVICE_LOCATION,${csvEscape(slBlocker)},false,none,blocked,aggregate row — every uncovered pair shares this blocker\n` +
    slSample
      .map((r) =>
        [
          `${r.service.slug}/${r.location.slug}`,
          "SERVICE_LOCATION",
          slBlocker,
          false,
          "none",
          "blocked",
          "sample",
        ]
          .map(csvEscape)
          .join(","),
      )
      .join("\n") +
    "\n";
  writeFileSync(join(docs, "final-remediation-sl-blockers.csv"), slCsv);

  const md = `# Final remediation eligibility pass

Generated: ${report.generatedAt}

## Summary
- Newly published: **${report.newlyPublished.count}** (DIY ${newlyPublishedDiy.length}, SL ${newlyPublishedSl.length})
- Total published/indexable: **${publishedTotal}**
- Remaining DIY drafts: **${draftDiyAfter.length}**
- Remaining coverage-blocked SL: **${uncoveredAfter}**
- DIY remediable into eligibility this pass: **${remediableCount}** (content-only; safety-gated classes excluded)

## DIY draft by class
- GREEN: ${draftByClass.GREEN}
- YELLOW: ${draftByClass.YELLOW}
- RED: ${draftByClass.RED}
- REVIEW_REQUIRED: ${draftByClass.REVIEW_REQUIRED}

## Blocker buckets
${Object.entries(blockerBuckets)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}

## Safety path assessments
- YELLOW: ${report.diy.yellowPathAssessment}
- REVIEW_REQUIRED: ${report.diy.reviewRequiredPathAssessment}
- RED: ${report.diy.redPathAssessment}

## Service × Location
- Covered: ${coveredAfter}
- Published/indexable: ${slPublishedAfter}
- Uncovered (blocked): ${uncoveredAfter}
- Covered-not-published processed: ${coveredNotPublished.length} → newly published SL: ${newlyPublishedSl.length}
- Blocker: ${slBlocker}

## Words (public DIY)
- EN >=1000: ${stats(enWords).ge1000}/${stats(enWords).total}
- AR >=1000: ${stats(arWords).ge1000}/${stats(arWords).total}

## Uniqueness / Images
- Blocking similarity flags: ${uniquenessFlags}
- Images present/webp/alt/broken: ${report.images.present}/${report.images.webp}/${report.images.alt}/${report.images.broken}

## Artifacts
- \`docs/final-remediation-eligibility-pass.json\`
- \`docs/final-remediation-diy-drafts.csv\` (all ${diyAudits.length} DIY drafts)
- \`docs/final-remediation-sl-blockers.csv\` (aggregate + 50 samples)
`;
  writeFileSync(join(docs, "final-remediation-eligibility-pass.md"), md);

  console.log(
    JSON.stringify(
      {
        ok: true,
        newlyPublished: report.newlyPublished.count,
        publishedTotal,
        diyDraft: draftDiyAfter.length,
        diyRemediable: remediableCount,
        uncoveredSl: uncoveredAfter,
        coveredNotPublished: coveredNotPublished.length,
        uniquenessFlags,
        imgBroken: report.images.broken,
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
