/**
 * Verify RED + REVIEW_REQUIRED DIY safety profiles.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { assertDiyMatrixCounts, loadDiyClassificationMatrix } from "../src/lib/service-location/diy-matrix";
import { parseDiyProfileJson } from "../src/lib/diy/profile-validate";
import { MISSING_HUBS } from "../src/lib/diy/coverage";
import { yellowPrimaryGuideSlug } from "../src/lib/diy/author-yellow-profiles";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function main() {
  const counts = assertDiyMatrixCounts();
  assert(counts.ok, "matrix");
  const matrix = loadDiyClassificationMatrix();
  for (const h of MISSING_HUBS) {
    assert(!(await prisma.service.findUnique({ where: { slug: h } })), `hub ${h}`);
  }
  const paint = await prisma.service.findUnique({ where: { slug: "painting-services" } });
  assert(paint?.riskLevel === "green" && paint.diyAvailable === true, "painting");

  const reportPath = join(process.cwd(), "docs/diy-authoring-a42-red-rr.json");
  assert(existsSync(reportPath), "missing report");
  const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
    meta: { redAuthored: number; reviewRequiredAuthored: number; errors: number };
    authoredRed: string[];
    authoredRr: string[];
    errors: string[];
  };
  assert(report.errors.length === 0, "errors");

  for (const slug of report.authoredRed) {
    assert(matrix.bySlug.get(slug)?.diyStatus === "RED", `${slug} not RED`);
    const g = await prisma.diyGuide.findUnique({ where: { slug: yellowPrimaryGuideSlug(slug) } });
    assert(g, `guide ${slug}`);
    assert(g.status === "draft" && g.indexable === false, `public? ${slug}`);
    const p = parseDiyProfileJson(g.profileJson).value!;
    assert(p.matrixSafety === "RED", `matrixSafety ${slug}`);
    assert(p.steps.length === 0, `RED must have zero steps ${slug}`);
  }

  for (const slug of report.authoredRr) {
    assert(matrix.bySlug.get(slug)?.diyStatus === "REVIEW_REQUIRED", `${slug} not RR`);
    const g = await prisma.diyGuide.findUnique({ where: { slug: yellowPrimaryGuideSlug(slug) } });
    assert(g, `guide ${slug}`);
    const p = parseDiyProfileJson(g.profileJson).value!;
    assert(p.matrixSafety === "REVIEW_REQUIRED", `matrixSafety ${slug}`);
    assert(p.steps.length === 0, `RR must have zero steps ${slug}`);
    assert(g.profileStatus === "safety_review", `profileStatus ${slug}`);
  }

  // No published RED procedural guides
  const pubRed = await prisma.diyGuide.count({ where: { status: "published", riskLevel: "red" } });
  assert(pubRed === 0, "published red guides");

  const sl = await prisma.serviceLocation.count();
  const published = await prisma.serviceLocation.count({ where: { coverageStatus: "published" } });
  assert(published === 49, `published drifted ${published}`);
  assert(sl >= 99, `SL count ${sl}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        redAuthored: report.meta.redAuthored,
        reviewRequiredAuthored: report.meta.reviewRequiredAuthored,
        publishedRed: pubRed,
        serviceLocation: { total: sl, published },
      },
      null,
      2,
    ),
  );
  console.log("RED/RR DIY verification PASSED");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
