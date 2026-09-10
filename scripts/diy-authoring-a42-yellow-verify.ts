/**
 * A4.2 Batch 2 — YELLOW authoring verification (+20 batch report; global yellow = 121).
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { assertDiyMatrixCounts, loadDiyClassificationMatrix } from "../src/lib/service-location/diy-matrix";
import {
  assertPopulationInvariants,
  measureServiceLocationPopulation,
} from "../src/lib/service-location/population";
import { parseDiyProfileJson, validateAuthoredYellowProfile } from "../src/lib/diy/profile-validate";
import {
  EXISTING_SIX_GUIDES,
  LABEL_MISMATCH_GUIDES,
  MISSING_HUBS,
} from "../src/lib/diy/coverage";
import { selectYellowBatch2, YELLOW_BATCH2_SKIP_HUBS } from "../src/lib/diy/yellow-batch";
import { yellowPrimaryGuideSlug } from "../src/lib/diy/author-yellow-profiles";
import { primaryGuideSlugForGreen } from "../src/lib/diy/author-green-profiles";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function main() {
  const matrix = loadDiyClassificationMatrix();
  const counts = assertDiyMatrixCounts();
  assert(counts.ok, `matrix drifted ${JSON.stringify(counts)}`);
  assert(counts.derived.YELLOW === 128, `YELLOW matrix ${counts.derived.YELLOW}`);

  const selection = selectYellowBatch2();
  assert(selection.selected.length === 20, `selected ${selection.selected.length}`);
  assert(selection.skippedHubs.length === 6, `skipped hubs ${selection.skippedHubs.length}`);
  assert(selection.skippedPainting, "painting not skipped");
  for (const h of YELLOW_BATCH2_SKIP_HUBS) {
    assert(selection.skippedHubs.includes(h), `missing skip ${h}`);
    assert(!(await prisma.service.findUnique({ where: { slug: h } })), `hub service created ${h}`);
  }

  const reportPath = join(process.cwd(), "docs/diy-authoring-a42-yellow-batch2.json");
  assert(existsSync(reportPath), "missing yellow batch2 report — run apply first");
  const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
    meta: { yellowAuthoredThisBatch: number; skippedHubs: string[]; heldReviewRequired: string[] };
    authored: Array<{ slug: string; guideSlug: string; profileStatus: string; reviewStatus: string; title: string }>;
    errors: string[];
  };
  assert(report.errors.length === 0, `apply errors ${report.errors.join(";")}`);
  assert(report.authored.length === 20, `report authored ${report.authored.length}`);
  assert(report.meta.yellowAuthoredThisBatch === 20, "meta count");
  assert((report.meta.heldReviewRequired || []).length === 0, "held RR in batch — unexpected");

  const sixBeforeFp = new Map<string, string>();
  const six = await prisma.diyGuide.findMany({
    where: { slug: { in: [...EXISTING_SIX_GUIDES] } },
    include: { translations: true },
  });
  assert(six.length === 6, "existing 6");
  for (const g of six) {
    const en = g.translations.find((t) => t.locale === "en");
    sixBeforeFp.set(g.slug, `${en?.steps}|${en?.quickAnswer}|${en?.safety}`);
  }
  for (const slug of LABEL_MISMATCH_GUIDES) {
    assert(six.some((g) => g.slug === slug), `label mismatch ${slug}`);
  }

  for (const item of report.authored) {
    const m = matrix.bySlug.get(item.slug);
    assert(m?.diyStatus === "YELLOW", `${item.slug} not matrix YELLOW`);
    assert(item.guideSlug === yellowPrimaryGuideSlug(item.slug), `guide slug ${item.slug}`);
    assert(item.profileStatus === "draft", `status ${item.slug}`);

    const service = await prisma.service.findUnique({
      where: { slug: item.slug },
      include: { primaryDiyGuide: true },
    });
    assert(service, `service ${item.slug}`);
    assert(service.primaryDiyGuide?.slug === item.guideSlug, `primary ${item.slug}`);
    assert(service.primaryDiyGuide.status === "draft", `guide content status ${item.slug}`);
    assert(service.primaryDiyGuide.indexable === false, `indexable ${item.slug}`);
    assert(service.primaryDiyGuide.profileStatus === "draft", `profileStatus ${item.slug}`);
    assert(
      service.primaryDiyGuide.arabicReviewStatus === "not_started" ||
        service.primaryDiyGuide.arabicReviewStatus === "translation_review",
      `ar ${item.slug}`,
    );
    assert(service.primaryDiyGuide.locationSlugs === "[]" || service.primaryDiyGuide.locationSlugs === "", `loc ${item.slug}`);

    const parsed = parseDiyProfileJson(service.primaryDiyGuide.profileJson);
    assert(parsed.value, `parse ${item.slug}`);
    assert(parsed.value.matrixSafety === "YELLOW", `safety ${item.slug}`);
    assert(parsed.value.safety.safetyLevel === "YELLOW", `safetyLevel ${item.slug}`);
    assert(parsed.value.metadata.authored === true, `authored ${item.slug}`);
    assert(parsed.value.metadata.batch === "A4.2-YELLOW-1", `batch ${item.slug}`);
    assert(
      parsed.value.metadata.arabicReviewStatus === "not_started" ||
        parsed.value.metadata.arabicReviewStatus === "translation_review",
      `ar meta ${item.slug}`,
    );
    assert(parsed.value.metadata.status === "draft", `meta status ${item.slug}`);

    const v = validateAuthoredYellowProfile(parsed.value);
    assert(v.ok, `${item.slug} validation ${v.issues.map((i) => i.code).join(",")}`);
    assert(parsed.value.steps.every((s) => s.action && s.expectedResult && s.stopCondition), `struct steps ${item.slug}`);

    const ar = await prisma.diyGuideI18n.findUnique({
      where: { guideId_locale: { guideId: service.primaryDiyGuide.id, locale: "ar" } },
    });
    // Conservative AR shells allowed; procedural AR steps must stay empty.
    if (ar) {
      assert(ar.steps === "[]" || !ar.steps?.trim() || ar.steps === "[]", `arabic steps empty ${item.slug}`);
    }
  }

  // GREEN still >= 46
  const greenSlugs = [...matrix.bySlug.values()].filter((r) => r.diyStatus === "GREEN").map((r) => r.offeringSlug);
  let greenAuthored = 0;
  for (const slug of greenSlugs) {
    const svc = await prisma.service.findUnique({
      where: { slug },
      include: { primaryDiyGuide: true },
    });
    const p = parseDiyProfileJson(svc?.primaryDiyGuide?.profileJson ?? "{}");
    if (p.value?.metadata.authored && p.value.matrixSafety === "GREEN") greenAuthored += 1;
    assert(svc?.primaryDiyGuide?.slug === primaryGuideSlugForGreen(slug), `green primary intact ${slug}`);
  }
  assert(greenAuthored >= 46, `GREEN ${greenAuthored}`);

  // Count ALL authored YELLOW / RED / RR (global)
  let yellowAuthored = 0;
  let redAuthored = 0;
  let rrAuthored = 0;
  for (const row of matrix.bySlug.values()) {
    if ((MISSING_HUBS as readonly string[]).includes(row.offeringSlug)) continue;
    const svc = await prisma.service.findUnique({
      where: { slug: row.offeringSlug },
      include: { primaryDiyGuide: true },
    });
    const p = parseDiyProfileJson(svc?.primaryDiyGuide?.profileJson ?? "{}");
    if (!p.value?.metadata.authored) continue;
    if (p.value.matrixSafety === "YELLOW") yellowAuthored += 1;
    if (p.value.matrixSafety === "RED") redAuthored += 1;
    if (p.value.matrixSafety === "REVIEW_REQUIRED") rrAuthored += 1;
  }
  assert(yellowAuthored === 121, `YELLOW authored total ${yellowAuthored}`);
  assert(redAuthored >= 0, `RED authored ${redAuthored}`);
  assert(rrAuthored >= 0, `RR authored ${rrAuthored}`);
  console.log(JSON.stringify({ redAuthored, rrAuthored, yellowAuthored }));

  // 128 yellow matrix = 121 authored + 7 excluded (6 YELLOW_BATCH2_SKIP hubs + painting)
  const excludedYellow =
    selection.skippedHubs.length + (selection.skippedPainting ? 1 : 0);
  assert(excludedYellow === 7, `excluded yellow ${excludedYellow}`);
  assert(
    counts.derived.YELLOW === yellowAuthored + excludedYellow,
    `YELLOW matrix ${counts.derived.YELLOW} != authored ${yellowAuthored} + excluded ${excludedYellow}`,
  );
  const yellowRemainingEligible = counts.derived.YELLOW - yellowAuthored - excludedYellow;
  assert(yellowRemainingEligible === 0, `remaining eligible yellow ${yellowRemainingEligible}`);

  // painting held
  const paint = await prisma.service.findUnique({ where: { slug: "painting-services" } });
  assert(paint?.riskLevel === "green" && paint.diyAvailable === true, "painting changed");
  const paintGuide = paint?.primaryDiyGuideId
    ? await prisma.diyGuide.findUnique({ where: { id: paint.primaryDiyGuideId } })
    : null;
  if (paintGuide) {
    const pp = parseDiyProfileJson(paintGuide.profileJson);
    assert(pp.value?.metadata.batch !== "A4.2-YELLOW-1", "painting authored in yellow batch");
  }

  // existing six bodies unchanged vs fingerprint at start of this verify (still present)
  for (const g of await prisma.diyGuide.findMany({
    where: { slug: { in: [...EXISTING_SIX_GUIDES] } },
    include: { translations: true },
  })) {
    const en = g.translations.find((t) => t.locale === "en");
    assert(sixBeforeFp.get(g.slug) === `${en?.steps}|${en?.quickAnswer}|${en?.safety}`, `body ${g.slug}`);
  }

  const population = await measureServiceLocationPopulation(prisma);
  assertPopulationInvariants(population);
  assert(population.published === 49, `published ${population.published}`);
  assert(population.pilotsPreserved === 50, `pilotsPreserved ${population.pilotsPreserved}`);
  assert(population.hubsAbsentInDb, "hubs must remain absent");

  const publishedDiy = await prisma.diyGuide.count({ where: { status: "published" } });
  assert(publishedDiy >= 2, `published DIY ${publishedDiy}`);
  const publishedNonGreenRisk = await prisma.diyGuide.count({
    where: { status: "published", indexable: true, riskLevel: { in: ["yellow", "red"] } },
  });
  assert(publishedNonGreenRisk === 0, `published non-green risk DIY ${publishedNonGreenRisk}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        yellowTotal: 128,
        yellowAuthoredThisBatch: 20,
        yellowAuthoredGlobal: yellowAuthored,
        yellowExcluded: excludedYellow,
        yellowRemainingEligible,
        greenAuthored: greenAuthored,
        redAuthored,
        reviewRequiredAuthored: rrAuthored,
        skippedHubs: selection.skippedHubs,
        skippedPainting: "painting-services",
        profiles: report.authored.map((a) => ({
          slug: a.slug,
          title: a.title,
          guideSlug: a.guideSlug,
          diyContentStatus: "draft",
          safetyValidation: "passed",
          reviewStatus: a.reviewStatus,
        })),
        matrix: counts.derived,
        serviceLocation: {
          total: population.serviceLocationTotal,
          published: population.published,
          pilotsPreserved: population.pilotsPreserved,
          approvedMatrixRows: population.classification.approvedMatrixRows,
          legacyOutsideMatrixRows: population.classification.legacyOutsideMatrixRows,
          equation: population.equation,
        },
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
