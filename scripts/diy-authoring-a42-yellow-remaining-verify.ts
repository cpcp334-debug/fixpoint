/**
 * Verify remaining YELLOW DIY authoring batch.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { assertDiyMatrixCounts, loadDiyClassificationMatrix } from "../src/lib/service-location/diy-matrix";
import { parseDiyProfileJson, validateAuthoredYellowProfile } from "../src/lib/diy/profile-validate";
import { EXISTING_SIX_GUIDES, MISSING_HUBS } from "../src/lib/diy/coverage";
import { yellowPrimaryGuideSlug } from "../src/lib/diy/author-yellow-profiles";
import { YELLOW_SKIP_PAINTING } from "../src/lib/diy/yellow-remaining";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function main() {
  const matrix = loadDiyClassificationMatrix();
  const counts = assertDiyMatrixCounts();
  assert(counts.ok, `matrix drifted ${JSON.stringify(counts)}`);

  for (const h of MISSING_HUBS) {
    assert(!(await prisma.service.findUnique({ where: { slug: h } })), `hub created ${h}`);
  }
  const paint = await prisma.service.findUnique({ where: { slug: YELLOW_SKIP_PAINTING } });
  assert(paint?.riskLevel === "green" && paint.diyAvailable === true, "painting changed");

  const reportPath = join(process.cwd(), "docs/diy-authoring-a42-yellow-remaining.json");
  assert(existsSync(reportPath), "missing remaining yellow report — run apply first");
  const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
    meta: { yellowAuthoredThisBatch: number; heldReviewRequired: string[]; errors: number };
    authored: Array<{ slug: string; guideSlug: string; profileStatus: string }>;
    errors: string[];
  };
  assert(report.errors.length === 0, `errors ${report.errors.join(";")}`);
  assert(report.authored.length === report.meta.yellowAuthoredThisBatch, "count mismatch");

  const six = await prisma.diyGuide.findMany({
    where: { slug: { in: [...EXISTING_SIX_GUIDES] } },
    include: { translations: true },
  });
  assert(six.length === 6, "existing 6");

  let ok = 0;
  for (const item of report.authored) {
    const m = matrix.bySlug.get(item.slug);
    assert(m?.diyStatus === "YELLOW", `${item.slug} not YELLOW`);
    assert(item.guideSlug === yellowPrimaryGuideSlug(item.slug), `guide slug ${item.slug}`);
    const service = await prisma.service.findUnique({
      where: { slug: item.slug },
      include: { primaryDiyGuide: true },
    });
    assert(service?.primaryDiyGuide?.slug === item.guideSlug, `primary ${item.slug}`);
    assert(service.primaryDiyGuide.status === "draft", `published? ${item.slug}`);
    assert(service.primaryDiyGuide.indexable === false, `indexable ${item.slug}`);
    const parsed = parseDiyProfileJson(service.primaryDiyGuide.profileJson);
    assert(parsed.value, `parse ${item.slug}`);
    if (!report.meta.heldReviewRequired.includes(item.slug)) {
      const v = validateAuthoredYellowProfile(parsed.value);
      assert(v.ok, `${item.slug} invalid: ${v.issues.map((i) => i.code).join(",")}`);
    }
    ok += 1;
  }

  const sl = await prisma.serviceLocation.count();
  const published = await prisma.serviceLocation.count({ where: { coverageStatus: "published" } });
  const draft = await prisma.serviceLocation.count({ where: { coverageStatus: "draft" } });
  assert(sl === 99 && published === 49 && draft === 50, `SL drifted ${sl}/${published}/${draft}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        authoredVerified: ok,
        matrix: counts.actual,
        serviceLocation: { total: sl, published, pilot: draft },
        hubsAbsent: true,
        paintingUnchanged: true,
      },
      null,
      2,
    ),
  );
  console.log("YELLOW remaining verification PASSED");
}

main()
  .catch((e) => {
    console.error("YELLOW remaining verification FAILED");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
