/**
 * A4.2 verification — GREEN foundation (Batch 1) + matrix/coverage invariants.
 * Updated for Batch 2: YELLOW authored may be > 0; tracked separately.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { assertDiyMatrixCounts, loadDiyClassificationMatrix } from "../src/lib/service-location/diy-matrix";
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
    assert(service.primaryDiyGuide.profileStatus === "draft", `GREEN profileStatus ${slug}`);
    authoredGreen += 1;
  }
  assert(authoredGreen >= 46, `GREEN authored ${authoredGreen}`);

  // Progress scan across all matrix services with records
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
    if (profile.value.matrixSafety === "YELLOW" && profile.value.metadata.batch === "A4.2-YELLOW-1") authoredYellow += 1;
    if (profile.value.matrixSafety === "RED") authoredRed += 1;
    if (profile.value.matrixSafety === "REVIEW_REQUIRED" && profile.value.metadata.authored) authoredRr += 1;
  }

  assert(authoredRed === 0, `RED authored ${authoredRed}`);
  assert(authoredRr === 0, `RR authored ${authoredRr}`);
  // YELLOW progress is verified in detail by yellow-verify; here we only track
  assert(authoredYellow >= 0, "yellow progress");

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

  const slCount = await prisma.serviceLocation.count();
  const slPub = await prisma.serviceLocation.count({
    where: { coverageStatus: "published", covered: true, indexable: true },
  });
  const pilot = await prisma.serviceLocation.count({ where: { coverageStatus: { not: "published" } } });
  assert(slCount === 99 && slPub === 49 && pilot === 50, "ServiceLocation counts");

  const publishedDiy = await prisma.diyGuide.count({ where: { status: "published" } });
  assert(publishedDiy === 2, `published DIY ${publishedDiy}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        phase: "A4.2-GREEN-verify",
        greenAuthored: authoredGreen,
        yellowAuthoredTracked: authoredYellow,
        redAuthored: authoredRed,
        reviewRequiredAuthored: authoredRr,
        matrix: counts.derived,
        serviceLocation: { total: slCount, published: slPub, pilot },
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
