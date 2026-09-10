/**
 * A4.2 verification — GREEN foundation (Batch 1) + matrix/coverage invariants.
 * Updated for Batch 2+: YELLOW/RED/RR authored may be > 0; tracked separately.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { assertDiyMatrixCounts, loadDiyClassificationMatrix } from "../src/lib/service-location/diy-matrix";
import {
  assertPopulationInvariants,
  measureServiceLocationPopulation,
} from "../src/lib/service-location/population";
import { parseDiyProfileJson } from "../src/lib/diy/profile-validate";
import {
  EXISTING_SIX_GUIDES,
  LABEL_MISMATCH_GUIDES,
  MISSING_HUBS,
} from "../src/lib/diy/coverage";
import { primaryGuideSlugForGreen } from "../src/lib/diy/author-green-profiles";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function main() {
  const matrix = loadDiyClassificationMatrix();
  const counts = assertDiyMatrixCounts();
  assert(counts.ok, `matrix counts drifted: ${JSON.stringify(counts)}`);
  assert(counts.derived.GREEN === 46 && counts.derived.YELLOW === 128, "matrix class counts");
  assert(counts.derived.RED === 112 && counts.derived.REVIEW_REQUIRED === 25, "matrix RR/RED");

  const coveragePath = join(process.cwd(), "docs/diy-profile-coverage-a42.json");
  assert(existsSync(coveragePath), "missing docs/diy-profile-coverage-a42.json");
  const coverageDoc = JSON.parse(readFileSync(coveragePath, "utf8")) as {
    meta: { totalCoverage: number; greenAuthored: number; redAuthored: number; reviewRequiredAuthored: number };
    greenAuthored: string[];
    errors: string[];
  };
  assert(coverageDoc.errors.length === 0, `batch1 apply errors: ${coverageDoc.errors.join(";")}`);
  assert(coverageDoc.meta.totalCoverage === 311, "coverage != 311");
  assert(coverageDoc.meta.greenAuthored >= 46, "GREEN authored meta < 46");
  assert(coverageDoc.greenAuthored.length >= 46, "GREEN authored list < 46");

  const greenSlugs = [...matrix.bySlug.values()].filter((r) => r.diyStatus === "GREEN").map((r) => r.offeringSlug);
  assert(greenSlugs.length === 46, `GREEN matrix ${greenSlugs.length}`);

  let authoredGreen = 0;
  let authoredYellow = 0;
  let authoredRed = 0;
  let authoredRr = 0;

  for (const slug of greenSlugs) {
    const service = await prisma.service.findUnique({
      where: { slug },
      include: { primaryDiyGuide: true },
    });
    assert(service?.primaryDiyGuide, `GREEN missing primary ${slug}`);
    assert(service.primaryDiyGuide.slug === primaryGuideSlugForGreen(slug), `GREEN primary ${slug}`);
    const profile = parseDiyProfileJson(service.primaryDiyGuide.profileJson);
    assert(profile.value?.metadata.authored === true, `GREEN not authored ${slug}`);
    assert(profile.value.matrixSafety === "GREEN", `GREEN class ${slug}`);
    assert(profile.value.steps.length >= 3, `GREEN steps ${slug}`);
    assert(
      service.primaryDiyGuide.profileStatus === "draft" ||
        service.primaryDiyGuide.profileStatus === "published",
      `GREEN profileStatus ${slug}`,
    );
    authoredGreen += 1;
  }
  assert(authoredGreen >= 46, `GREEN authored ${authoredGreen}`);
  assert(authoredGreen === 46, `GREEN matrix authored exact ${authoredGreen}`);

  // Progress scan across all matrix services with records — count ALL authored by class
  for (const row of matrix.bySlug.values()) {
    if ((MISSING_HUBS as readonly string[]).includes(row.offeringSlug)) {
      assert(!(await prisma.service.findUnique({ where: { slug: row.offeringSlug } })), `hub created ${row.offeringSlug}`);
      continue;
    }
    const service = await prisma.service.findUnique({
      where: { slug: row.offeringSlug },
      include: { primaryDiyGuide: true },
    });
    if (!service?.primaryDiyGuide) continue;
    const profile = parseDiyProfileJson(service.primaryDiyGuide.profileJson);
    if (!profile.value?.metadata.authored) continue;
    if (profile.value.matrixSafety === "YELLOW") authoredYellow += 1;
    if (profile.value.matrixSafety === "RED") authoredRed += 1;
    if (profile.value.matrixSafety === "REVIEW_REQUIRED") authoredRr += 1;
  }

  // Log RED/YELLOW/RR independently; do not require zero
  console.log(
    JSON.stringify({
      authoredYellowAll: authoredYellow,
      authoredRedAll: authoredRed,
      authoredRrAll: authoredRr,
    }),
  );
  assert(authoredYellow >= 0, "yellow progress");
  assert(authoredRed >= 0, "red progress");
  assert(authoredRr >= 0, "rr progress");

  const six = await prisma.diyGuide.findMany({
    where: { slug: { in: [...EXISTING_SIX_GUIDES] } },
    include: { translations: true },
  });
  assert(six.length === 6, `existing guides ${six.length}`);
  for (const slug of LABEL_MISMATCH_GUIDES) {
    assert(six.some((g) => g.slug === slug), `label mismatch ${slug}`);
  }

  const paint = await prisma.service.findUnique({ where: { slug: "painting-services" } });
  assert(paint?.riskLevel === "green" && paint.diyAvailable === true, "painting-services changed");

  for (const hub of MISSING_HUBS) {
    assert(!(await prisma.service.findUnique({ where: { slug: hub } })), `hub must remain absent ${hub}`);
  }

  const population = await measureServiceLocationPopulation(prisma);
  assertPopulationInvariants(population);
  assert(population.published === 49, `published ${population.published}`);
  assert(population.pilotsPreserved === 50, `pilotsPreserved ${population.pilotsPreserved}`);
  assert(population.hubsAbsentInDb, "hubs must remain absent");

  const publishedDiy = await prisma.diyGuide.count({ where: { status: "published", indexable: true } });
  assert(publishedDiy >= 2, `published DIY ${publishedDiy}`);
  // Controlled GREEN publication may raise this above the grandfathered 2; non-GREEN must stay unpublished.
  const publishedNonGreenRisk = await prisma.diyGuide.count({
    where: { status: "published", indexable: true, riskLevel: { in: ["yellow", "red"] } },
  });
  assert(publishedNonGreenRisk === 0, `published non-green risk DIY ${publishedNonGreenRisk}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        phase: "A4.2-GREEN-verify",
        greenAuthored: authoredGreen,
        yellowAuthoredAll: authoredYellow,
        redAuthored: authoredRed,
        reviewRequiredAuthored: authoredRr,
        matrix: counts.derived,
        serviceLocation: {
          total: population.serviceLocationTotal,
          published: population.published,
          pilotsPreserved: population.pilotsPreserved,
          approvedMatrixRows: population.classification.approvedMatrixRows,
          legacyOutsideMatrixRows: population.classification.legacyOutsideMatrixRows,
          equation: population.equation,
        },
        note: "YELLOW Batch 2 detail is verified by verify:diy-authoring-a42-yellow",
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
