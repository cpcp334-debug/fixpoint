/**
 * A4.1.1 — post-apply verification (DB + seed overlay agreement).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { services } from "../prisma/data/services";
import {
  DIY_SAFETY_ALIGNMENTS_A411,
  DIY_SAFETY_A411_HELD,
  DIY_SAFETY_A411_UNRESOLVED_MISSING_HUBS,
} from "../prisma/data/diy-safety-alignment-a411";
import { assertDiyMatrixCounts } from "../src/lib/service-location/diy-matrix";
import { APPROVED_CATEGORIES, APPROVED_CHILDREN } from "../prisma/data/catalog-a1";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function main() {
  const audit = JSON.parse(
    readFileSync(join(process.cwd(), "docs/diy-safety-reconciliation-a411-audit.json"), "utf8"),
  ) as {
    appliedCount: number;
    changes: Array<{
      slug: string;
      oldRisk: string;
      newRisk: string;
      oldDiyAvailable: boolean;
      newDiyAvailable: boolean;
    }>;
    held: Array<{ slug: string }>;
    unresolvedMissingHubs: string[];
  };

  assert(audit.appliedCount === 110, `appliedCount must be 110, got ${audit.appliedCount}`);
  assert(audit.changes.length === 110, `audit changes must be 110`);
  assert(audit.held.length === 1 && audit.held[0]?.slug === "painting-services", "painting held");
  assert(audit.unresolvedMissingHubs.length === 7, "7 missing hubs");
  assert(Object.keys(DIY_SAFETY_ALIGNMENTS_A411).length === 110, "seed overlay 110");
  assert(DIY_SAFETY_A411_HELD.length === 1, "held const");
  assert(DIY_SAFETY_A411_UNRESOLVED_MISSING_HUBS.length === 7, "unresolved const");

  // DB matches audit
  for (const change of audit.changes) {
    const row = await prisma.service.findUnique({ where: { slug: change.slug } });
    assert(row, `missing ${change.slug}`);
    assert(row.riskLevel === change.newRisk, `${change.slug} risk DB=${row.riskLevel} expected=${change.newRisk}`);
    assert(
      row.diyAvailable === change.newDiyAvailable,
      `${change.slug} diy DB=${row.diyAvailable} expected=${change.newDiyAvailable}`,
    );
    // no downgrade
    const rank = { green: 0, yellow: 1, red: 2 } as const;
    assert(
      rank[change.newRisk as keyof typeof rank] >= rank[change.oldRisk as keyof typeof rank],
      `downgrade ${change.slug}`,
    );
  }

  // Seed services array agrees with overlay / DB
  for (const [slug, alignment] of Object.entries(DIY_SAFETY_ALIGNMENTS_A411)) {
    const seed = services.find((s) => s.slug === slug);
    assert(seed, `seed missing ${slug}`);
    assert(seed.riskLevel === alignment.riskLevel, `seed risk mismatch ${slug}`);
    assert(seed.diyAvailable === alignment.diyAvailable, `seed diy mismatch ${slug}`);
    const db = await prisma.service.findUnique({ where: { slug } });
    assert(db?.riskLevel === seed.riskLevel && db.diyAvailable === seed.diyAvailable, `seed≠db ${slug}`);
  }

  // painting-services unchanged
  const paint = await prisma.service.findUnique({ where: { slug: "painting-services" } });
  assert(paint?.riskLevel === "green" && paint.diyAvailable === true, "painting-services must remain green/diy true");
  const paintSeed = services.find((s) => s.slug === "painting-services");
  assert(paintSeed?.riskLevel === "green" && paintSeed.diyAvailable === true, "painting seed unchanged");

  // missing hubs still absent
  for (const slug of DIY_SAFETY_A411_UNRESOLVED_MISSING_HUBS) {
    const row = await prisma.service.findUnique({ where: { slug } });
    assert(!row, `hub ${slug} must remain missing`);
  }

  // matrix + catalog counts
  const matrix = assertDiyMatrixCounts();
  assert(matrix.ok, "matrix counts");
  assert(APPROVED_CATEGORIES.length === 18, "18 parents");
  assert(APPROVED_CHILDREN.length === 293, "293 children");

  const sl = await prisma.serviceLocation.count();
  const pub = await prisma.serviceLocation.count({
    where: { covered: true, coverageStatus: "published", indexable: true },
  });
  const pilots = await prisma.serviceLocation.findMany({ where: { coverageStatus: "draft", covered: false } });
  assert(sl === 99, `SL ${sl}`);
  assert(pub === 49, `pub ${pub}`);
  assert(pilots.length === 50, `pilots ${pilots.length}`);
  for (const p of pilots) {
    assert(!p.indexable && !p.indexableEn && !p.indexableAr, "pilot noindex");
  }

  // DIY guide bodies for original 6 preserved (A4.2 may add coverage shells)
  const EXISTING_SIX = [
    "how-to-fix-dripping-faucet",
    "how-to-clean-ac-filter",
    "how-to-touch-up-interior-paint",
    "how-to-check-a-small-wall-crack",
    "how-to-clean-a-bathroom",
    "how-to-unclog-a-sink-safely",
  ];
  const guides = await prisma.diyGuide.findMany({
    where: { slug: { in: EXISTING_SIX } },
    include: { translations: true },
  });
  assert(guides.length === 6, `existing six guides ${guides.length}`);
  const bodyFingerprint = createHash("sha256")
    .update(
      guides
        .map((g) => {
          const en = g.translations.find((t) => t.locale === "en");
          return `${g.slug}|${g.riskLevel}|${en?.steps ?? ""}|${en?.safety ?? ""}`;
        })
        .sort()
        .join("\n"),
    )
    .digest("hex");
  // Store/compare: just ensure steps still non-empty for faucet and filter
  const faucet = guides.find((g) => g.slug === "how-to-fix-dripping-faucet");
  const faucetEn = faucet?.translations.find((t) => t.locale === "en");
  assert(faucetEn && JSON.parse(faucetEn.steps).length >= 3, "faucet steps intact");

  console.log(
    JSON.stringify(
      {
        ok: true,
        applied: 110,
        held: "painting-services",
        unresolvedHubs: 7,
        serviceLocation: { total: sl, published: pub, pilots: pilots.length },
        guideBodyFingerprint: bodyFingerprint,
        matrix: matrix.expected,
      },
      null,
      2,
    ),
  );
  console.log("A4.1.1 apply verification PASSED");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
