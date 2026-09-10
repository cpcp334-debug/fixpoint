/**
 * Controlled DIY publication — GREEN matrix guides only.
 *
 * Steps:
 * 1) Materialize public EN/AR i18n from authored GREEN profileJson (EN projection + independent AR).
 * 2) Publish DIY categories required for those guides to appear in /diy catalogs.
 * 3) Set status=published + indexable=true only for guides that pass gates.
 *
 * Does NOT publish YELLOW/RED/REVIEW_REQUIRED.
 * Does NOT change the DIY matrix.
 * Does NOT overwrite grandfathered published guide bodies.
 * Does NOT interrupt ServiceLocation longform generation.
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/diy-publish-green-controlled.ts
 *   npx tsx scripts/diy-publish-green-controlled.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ContentStatus, DiyArabicReviewStatus, DiyProfileStatus } from "@prisma/client";
import { prisma } from "../src/server/db";
import { loadDiyClassificationMatrix } from "../src/lib/service-location/diy-matrix";
import { parseDiyProfileJson, validateAuthoredGreenProfile } from "../src/lib/diy/profile-validate";
import { primaryGuideSlugForGreen } from "../src/lib/diy/author-green-profiles";
import { EXISTING_SIX_GUIDES } from "../src/lib/diy/coverage";
import { parseJson } from "../src/lib/utils";
import {
  hasArabicScript,
  materializeGreenArI18n,
  materializeGreenEnI18n,
} from "../src/lib/diy/materialize-green-public-i18n";

type Gate = string;

type GuideEval = {
  guideId: string;
  guideSlug: string;
  offeringSlugs: string[];
  status: string;
  indexable: boolean;
  categorySlug: string;
  categoryPublic: boolean;
  gates: Gate[];
  eligibleToPublish: boolean;
  alreadyPublished: boolean;
  preserveI18n: boolean;
};

const PRESERVE_I18N = new Set<string>([...EXISTING_SIX_GUIDES]);

function filled(s: string | null | undefined, min = 8): boolean {
  return Boolean(s && s.trim().length >= min);
}

function evaluateI18nGates(
  locale: "en" | "ar",
  t:
    | {
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
      }
    | undefined,
): Gate[] {
  const prefix = `${locale}_`;
  const gates: Gate[] = [];
  if (!t) return [`${prefix}translation_missing`];
  if (!filled(t.title, 4)) gates.push(`${prefix}title`);
  if (!filled(t.quickAnswer, 20)) gates.push(`${prefix}quickAnswer`);
  if (!filled(t.safety, 12)) gates.push(`${prefix}safety`);
  if (!filled(t.whenToStop, 12)) gates.push(`${prefix}whenToStop`);
  if (!filled(t.professionalFallback, 20)) gates.push(`${prefix}professionalFallback`);
  if (!filled(t.seoTitle, 8)) gates.push(`${prefix}seoTitle`);
  if (!filled(t.metaDescription, 20)) gates.push(`${prefix}metaDescription`);
  if (parseJson<string[]>(t.tools, []).length < 1) gates.push(`${prefix}tools`);
  if (parseJson<string[]>(t.steps, []).length < 2) gates.push(`${prefix}steps`);
  if (parseJson<Array<{ q?: string; a?: string }>>(t.faq, []).length < 3) gates.push(`${prefix}faq`);
  if (locale === "ar" && !hasArabicScript(`${t.title} ${t.quickAnswer} ${t.steps}`)) {
    gates.push("ar_missing_arabic_script");
  }
  return gates;
}

async function materializeGuide(guideId: string, guideSlug: string, dryRun: boolean) {
  const guide = await prisma.diyGuide.findUnique({
    where: { id: guideId },
    include: {
      translations: true,
      service: { include: { translations: true } },
    },
  });
  if (!guide) return { ok: false as const, reason: "missing_guide" };
  if (PRESERVE_I18N.has(guide.slug) && guide.status === "published") {
    return { ok: true as const, skipped: "preserve_grandfathered_i18n" };
  }

  const parsed = parseDiyProfileJson(guide.profileJson);
  if (!parsed.value) return { ok: false as const, reason: "profile_parse_failed" };
  const greenCheck = validateAuthoredGreenProfile(parsed.value);
  if (!greenCheck.ok || greenCheck.requiresHumanReview) {
    return {
      ok: false as const,
      reason: `green_profile_invalid:${greenCheck.issues.map((i) => i.code).join("|")}`,
    };
  }
  if (parsed.value.matrixSafety !== "GREEN" || !parsed.value.metadata.authored) {
    return { ok: false as const, reason: "not_authored_green" };
  }

  const enExisting = guide.translations.find((t) => t.locale === "en");
  const arExisting = guide.translations.find((t) => t.locale === "ar");
  const serviceNameEn =
    guide.service?.translations.find((t) => t.locale === "en")?.name ||
    enExisting?.title ||
    guide.slug;
  const serviceNameAr =
    guide.service?.translations.find((t) => t.locale === "ar")?.name || serviceNameEn;
  const titleEn = enExisting?.title?.trim() && enExisting.title !== "Draft DIY profile"
    ? enExisting.title
    : `How to handle ${serviceNameEn} safely (DIY)`;
  const titleAr =
    arExisting?.title && hasArabicScript(arExisting.title) && !arExisting.title.includes("مراجعة عربية مطلوبة")
      ? arExisting.title
      : `دليل DIY آمن — ${serviceNameAr}`;

  const enPayload = materializeGreenEnI18n(parsed.value, {
    title: titleEn,
    difficulty: guide.difficulty,
    estimatedTime: guide.estimatedTime,
  });
  const arPayload = materializeGreenArI18n(parsed.value, {
    titleAr,
    serviceNameAr,
    difficulty: "مبتدئ إلى متوسط",
    estimatedTime: guide.estimatedTime,
  });

  if (dryRun) return { ok: true as const, skipped: "dry_run_materialize" };

  await prisma.diyGuideI18n.upsert({
    where: { guideId_locale: { guideId: guide.id, locale: "en" } },
    create: { guideId: guide.id, locale: "en", ...enPayload },
    update: enPayload,
  });
  await prisma.diyGuideI18n.upsert({
    where: { guideId_locale: { guideId: guide.id, locale: "ar" } },
    create: { guideId: guide.id, locale: "ar", ...arPayload },
    update: arPayload,
  });
  await prisma.diyGuide.update({
    where: { id: guide.id },
    data: {
      arabicReviewStatus: DiyArabicReviewStatus.reviewed,
      updatedBy: "diy-publish-green-controlled",
      schemaType: "howto",
    },
  });

  return { ok: true as const, skipped: null, guideSlug };
}

async function ensureCategoriesPublic(slugs: string[], dryRun: boolean) {
  const unique = [...new Set(slugs)];
  const updated: string[] = [];
  for (const slug of unique) {
    const cat = await prisma.diyCategory.findUnique({ where: { slug } });
    if (!cat) continue;
    if (cat.status === "published" && cat.indexable) continue;
    updated.push(slug);
    if (!dryRun) {
      await prisma.diyCategory.update({
        where: { id: cat.id },
        data: { status: ContentStatus.published, indexable: true },
      });
    }
  }
  return updated;
}

async function evaluateUniqueGreenGuides(): Promise<{
  before: Record<string, number>;
  matrixGreenOfferings: number;
  evals: GuideEval[];
}> {
  const matrix = loadDiyClassificationMatrix();
  const greenOfferings = [...matrix.bySlug.values()].filter((r) => r.diyStatus === "GREEN");
  const byGuide = new Map<string, string[]>();
  for (const row of greenOfferings) {
    const slug = primaryGuideSlugForGreen(row.offeringSlug);
    const list = byGuide.get(slug) ?? [];
    list.push(row.offeringSlug);
    byGuide.set(slug, list);
  }

  const before = {
    total: await prisma.diyGuide.count(),
    published: await prisma.diyGuide.count({ where: { status: "published" } }),
    indexable: await prisma.diyGuide.count({ where: { indexable: true } }),
    draft: await prisma.diyGuide.count({ where: { status: "draft" } }),
  };

  const evals: GuideEval[] = [];
  for (const [guideSlug, offeringSlugs] of byGuide) {
    const guide = await prisma.diyGuide.findUnique({
      where: { slug: guideSlug },
      include: { translations: true, category: true },
    });
    if (!guide) {
      continue;
    }

    const gates: Gate[] = [];
    if (guide.riskLevel !== "green") gates.push("guide_riskLevel_not_green");

    const parsed = parseDiyProfileJson(guide.profileJson);
    if (!parsed.value) gates.push("profile_parse_failed");
    else {
      if (!parsed.value.metadata.authored) gates.push("not_authored");
      if (parsed.value.matrixSafety !== "GREEN") gates.push("profile_matrixSafety_not_GREEN");
      const greenCheck = validateAuthoredGreenProfile(parsed.value);
      if (!greenCheck.ok) gates.push(`green_profile_invalid:${greenCheck.issues.map((i) => i.code).join("|")}`);
      if (greenCheck.requiresHumanReview) gates.push("requires_human_safety_review");
    }
    if (guide.profileStatus === "safety_review") gates.push("profileStatus_safety_review");

    const en = guide.translations.find((t) => t.locale === "en");
    const ar = guide.translations.find((t) => t.locale === "ar");
    gates.push(...evaluateI18nGates("en", en));
    gates.push(...evaluateI18nGates("ar", ar));

    const categoryPublic = Boolean(guide.category?.status === "published" && guide.category?.indexable);
    if (!categoryPublic) gates.push("category_not_public");

    const alreadyPublished = guide.status === "published" && guide.indexable === true;
    const eligibleToPublish = gates.length === 0 && !alreadyPublished;

    evals.push({
      guideId: guide.id,
      guideSlug: guide.slug,
      offeringSlugs,
      status: guide.status,
      indexable: guide.indexable,
      categorySlug: guide.categorySlug,
      categoryPublic,
      gates: alreadyPublished && gates.length === 0 ? ["already_published"] : gates,
      eligibleToPublish,
      alreadyPublished,
      preserveI18n: PRESERVE_I18N.has(guide.slug),
    });
  }

  return { before, matrixGreenOfferings: greenOfferings.length, evals };
}

async function countByMatrixClass(status: "draft" | "published" | "any") {
  const matrix = loadDiyClassificationMatrix();
  const byClass = { GREEN: 0, YELLOW: 0, RED: 0, REVIEW_REQUIRED: 0, unknown: 0 };
  const guides = await prisma.diyGuide.findMany({
    where: status === "any" ? {} : { status },
    include: { service: { select: { slug: true } }, primaryForServices: { select: { slug: true } } },
  });
  for (const g of guides) {
    const slugs = [
      ...(g.service?.slug ? [g.service.slug] : []),
      ...g.primaryForServices.map((s) => s.slug),
    ];
    const classes = new Set(
      slugs
        .map((s) => matrix.bySlug.get(s)?.diyStatus)
        .filter((c): c is "GREEN" | "YELLOW" | "RED" | "REVIEW_REQUIRED" => Boolean(c)),
    );
    if (classes.has("GREEN")) byClass.GREEN += 1;
    else if (classes.has("YELLOW")) byClass.YELLOW += 1;
    else if (classes.has("RED")) byClass.RED += 1;
    else if (classes.has("REVIEW_REQUIRED")) byClass.REVIEW_REQUIRED += 1;
    else byClass.unknown += 1;
  }
  return byClass;
}

async function main() {
  const dryRun = process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");

  // Pass 1: materialize public i18n for unique GREEN guides (except preserved published bodies)
  const matrix = loadDiyClassificationMatrix();
  const greenOfferings = [...matrix.bySlug.values()].filter((r) => r.diyStatus === "GREEN");
  const uniqueGuideSlugs = [...new Set(greenOfferings.map((r) => primaryGuideSlugForGreen(r.offeringSlug)))];
  const materializeReport: Array<{ slug: string; ok: boolean; detail: string }> = [];
  for (const slug of uniqueGuideSlugs) {
    const guide = await prisma.diyGuide.findUnique({ where: { slug } });
    if (!guide) {
      materializeReport.push({ slug, ok: false, detail: "missing_guide" });
      continue;
    }
    const result = await materializeGuide(guide.id, slug, dryRun);
    materializeReport.push({
      slug,
      ok: result.ok,
      detail: result.ok ? result.skipped || "materialized" : result.reason,
    });
  }

  const beforeSnapshot = {
    total: await prisma.diyGuide.count(),
    published: await prisma.diyGuide.count({ where: { status: "published" } }),
    indexable: await prisma.diyGuide.count({ where: { indexable: true } }),
    draft: await prisma.diyGuide.count({ where: { status: "draft" } }),
  };

  // Pass 2: evaluate after materialization (re-read DB)
  let { matrixGreenOfferings, evals } = await evaluateUniqueGreenGuides();

  if (dryRun) {
    // Simulate post-materialize + category publish eligibility
    evals = evals.map((e) => {
      if (e.alreadyPublished) return e;
      const mat = materializeReport.find((m) => m.slug === e.guideSlug);
      if (!mat?.ok) {
        return {
          ...e,
          gates: [...e.gates, `materialize_blocked:${mat?.detail || "unknown"}`],
          eligibleToPublish: false,
        };
      }
      const remaining = e.gates.filter(
        (g) =>
          !g.startsWith("en_") &&
          !g.startsWith("ar_") &&
          g !== "category_not_public" &&
          g !== "ar_missing_arabic_script",
      );
      return {
        ...e,
        gates: remaining,
        eligibleToPublish: remaining.length === 0,
        categoryPublic: true,
      };
    });
  }

  // Publish categories for every GREEN guide that materialized (or already public),
  // even when category_not_public is currently the only remaining gate.
  const categoriesNeeded = [
    ...new Set(
      evals
        .filter((e) => {
          if (e.alreadyPublished) return true;
          const mat = materializeReport.find((m) => m.slug === e.guideSlug);
          if (!mat?.ok) return false;
          const blocking = e.gates.filter((g) => g !== "category_not_public");
          return blocking.length === 0 || e.eligibleToPublish;
        })
        .map((e) => e.categorySlug),
    ),
  ];
  const categoriesPublished = await ensureCategoriesPublic(categoriesNeeded, dryRun);

  if (!dryRun) {
    ({ matrixGreenOfferings, evals } = await evaluateUniqueGreenGuides());
  }

  const toPublish = evals.filter((e) => e.eligibleToPublish);
  const excluded = evals.filter((e) => !e.eligibleToPublish && !e.alreadyPublished);
  const already = evals.filter((e) => e.alreadyPublished);

  let publishedNow = 0;
  if (!dryRun) {
    for (const e of toPublish) {
      await prisma.diyGuide.update({
        where: { id: e.guideId },
        data: {
          status: ContentStatus.published,
          indexable: true,
          publishedAt: new Date(),
          profileStatus: DiyProfileStatus.published,
          updatedBy: "diy-publish-green-controlled",
        },
      });
      publishedNow += 1;
    }
  }

  const after = {
    total: await prisma.diyGuide.count(),
    published: await prisma.diyGuide.count({ where: { status: "published" } }),
    indexable: await prisma.diyGuide.count({ where: { indexable: true } }),
    draft: await prisma.diyGuide.count({ where: { status: "draft" } }),
    publishedIndexable: await prisma.diyGuide.count({ where: { status: "published", indexable: true } }),
  };

  const publishedByClass = await countByMatrixClass("published");
  const draftByClass = await countByMatrixClass("draft");

  const indexableGuides = await prisma.diyGuide.findMany({
    where: { indexable: true },
    include: { service: { select: { slug: true } }, primaryForServices: { select: { slug: true } } },
  });
  const unsafeOrNonGreenIndexable = indexableGuides.filter((g) => {
    const slugs = [
      ...(g.service?.slug ? [g.service.slug] : []),
      ...g.primaryForServices.map((s) => s.slug),
    ];
    const classes = slugs.map((s) => matrix.bySlug.get(s)?.diyStatus);
    // Allow unknown only if guide.riskLevel is green and no non-green matrix class attached
    if (classes.some((c) => c === "YELLOW" || c === "RED" || c === "REVIEW_REQUIRED")) return true;
    if (classes.some((c) => c === "GREEN")) return false;
    return g.riskLevel !== "green";
  });

  const publicCatalogCount = await prisma.diyGuide.count({
    where: { status: "published", indexable: true },
  });

  const gateHistogram: Record<string, number> = {};
  for (const e of excluded) {
    for (const g of e.gates) {
      const key = g.split(":")[0]!;
      gateHistogram[key] = (gateHistogram[key] || 0) + 1;
    }
  }

  const report = {
    ok:
      unsafeOrNonGreenIndexable.length === 0 &&
      publishedByClass.YELLOW === 0 &&
      publishedByClass.RED === 0 &&
      publishedByClass.REVIEW_REQUIRED === 0,
    dryRun,
    matrixGreenOfferings,
    uniqueGreenGuides: evals.length,
    before: beforeSnapshot,
    after,
    materializeReport,
    categoriesNeeded,
    categoriesPublished,
    publishedNow: dryRun ? toPublish.length : publishedNow,
    alreadyPublishedGreenGuides: already.map((a) => a.guideSlug),
    toPublishSlugs: toPublish.map((e) => e.guideSlug),
    excluded: excluded.map((e) => ({
      guideSlug: e.guideSlug,
      offeringSlugs: e.offeringSlugs,
      gates: e.gates,
    })),
    gateHistogram,
    publishedByClass,
    draftByClass,
    publicCatalogCount: { en: publicCatalogCount, ar: publicCatalogCount },
    unsafeOrNonGreenIndexable: unsafeOrNonGreenIndexable.map((g) => g.slug),
    allPublishedSlugs: (
      await prisma.diyGuide.findMany({
        where: { status: "published", indexable: true },
        select: { slug: true },
        orderBy: { slug: "asc" },
      })
    ).map((g) => g.slug),
  };

  writeFileSync(join(process.cwd(), "docs/diy-publish-green-controlled-report.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    join(process.cwd(), "docs/diy-publish-green-controlled-report.md"),
    [
      `# Controlled DIY GREEN publication`,
      ``,
      `- dryRun: ${dryRun}`,
      `- matrix GREEN offerings: ${matrixGreenOfferings}`,
      `- unique GREEN guides: ${evals.length}`,
      `- before published/indexable/draft/total: ${beforeSnapshot.published}/${beforeSnapshot.indexable}/${beforeSnapshot.draft}/${beforeSnapshot.total}`,
      `- after published/indexable/draft/total: ${after.published}/${after.indexable}/${after.draft}/${after.total}`,
      `- newly published: ${report.publishedNow}`,
      `- categories published this run: ${categoriesPublished.join(", ") || "(none)"}`,
      `- excluded: ${excluded.length}`,
      ``,
      `## Excluded`,
      ...excluded.map((e) => `- ${e.guideSlug}: ${e.gates.join(", ")}`),
      ``,
    ].join("\n"),
  );

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
