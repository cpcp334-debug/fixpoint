/**
 * A4.1.1 — Build Class A alignment list from inventory (excludes painting-services).
 * Then apply to DB + emit seed overlay module.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RiskLevel } from "@prisma/client";
import { prisma } from "../src/server/db";

type InventoryReport = {
  byClassCounts: { A: number; B: number; C: number; D: number; E: number };
  mismatchCount: number;
  safeFixesProposed: Array<{
    slug: string;
    fromRisk: RiskLevel;
    toRisk: RiskLevel | null;
    fromDiy: boolean;
    toDiy: boolean | null;
    action: string;
    publicSl: number;
  }>;
  coverage: {
    missingServices: string[];
    matrixCounts: { GREEN: number; YELLOW: number; RED: number; REVIEW_REQUIRED: number; total: number };
    serviceLocationTotal: number;
    published49: number;
    pilots50: number;
  };
  inventory: Array<{
    serviceSlug: string;
    conflictClass: string;
    proposedRiskLevel: RiskLevel | null;
    proposedDiyAvailable: boolean | null;
    serviceRiskLevel: RiskLevel;
    serviceDiyAvailable: boolean;
  }>;
};

type Alignment = {
  slug: string;
  oldRisk: RiskLevel;
  newRisk: RiskLevel;
  oldDiyAvailable: boolean;
  newDiyAvailable: boolean;
  reason: "diy_matrix_authoritative";
};

async function main() {
  const inventoryPath = join(process.cwd(), "docs/diy-safety-reconciliation-a411-inventory.json");
  const report = JSON.parse(readFileSync(inventoryPath, "utf8")) as InventoryReport;

  if (report.byClassCounts.A !== 111) throw new Error(`Expected Class A=111, got ${report.byClassCounts.A}`);
  if (report.byClassCounts.C !== 7) throw new Error(`Expected Class C=7, got ${report.byClassCounts.C}`);
  if (report.byClassCounts.E !== 70) throw new Error(`Expected Class E=70, got ${report.byClassCounts.E}`);
  if (report.mismatchCount !== 188) throw new Error(`Expected inventory=188, got ${report.mismatchCount}`);
  const mc = report.coverage.matrixCounts;
  if (mc.GREEN !== 46 || mc.YELLOW !== 128 || mc.RED !== 112 || mc.REVIEW_REQUIRED !== 25) {
    throw new Error(`Matrix counts drifted: ${JSON.stringify(mc)}`);
  }

  const held = report.safeFixesProposed.filter((f) => f.slug === "painting-services");
  if (held.length !== 1) throw new Error("painting-services must be exactly one held Class A fix");
  if (held[0]!.publicSl !== 7) throw new Error("painting-services must still have 7 public SL");

  const toApply = report.safeFixesProposed.filter((f) => f.slug !== "painting-services" && f.publicSl === 0);
  if (toApply.length !== 110) {
    throw new Error(`Expected 110 applyable fixes, got ${toApply.length}`);
  }

  const alignments: Alignment[] = [];
  for (const fix of toApply) {
    const newRisk = fix.toRisk ?? fix.fromRisk;
    const newDiy = fix.toDiy ?? fix.fromDiy;
    if (
      (newRisk === "green" && fix.fromRisk !== "green") ||
      (newRisk === "yellow" && fix.fromRisk === "red")
    ) {
      throw new Error(`Refusing downgrade for ${fix.slug}: ${fix.fromRisk} → ${newRisk}`);
    }
    const rank = { green: 0, yellow: 1, red: 2 } as const;
    if (rank[newRisk] < rank[fix.fromRisk]) {
      throw new Error(`Refusing downward risk for ${fix.slug}`);
    }
    if (newDiy === true && fix.fromDiy === false) {
      throw new Error(`Refusing diyAvailable true upgrade for ${fix.slug}`);
    }
    alignments.push({
      slug: fix.slug,
      oldRisk: fix.fromRisk,
      newRisk,
      oldDiyAvailable: fix.fromDiy,
      newDiyAvailable: newDiy,
      reason: "diy_matrix_authoritative",
    });
  }

  // Emit seed overlay (authoritative for future seeds)
  const overlayTs = `/**
 * A4.1.1 DIY safety alignments (Class A, excludes painting-services).
 * Applied by prisma/data/services.ts after catalog assembly.
 * reason: diy_matrix_authoritative
 */
export type DiySafetyAlignmentA411 = {
  riskLevel: "green" | "yellow" | "red";
  diyAvailable: boolean;
};

export const DIY_SAFETY_ALIGNMENTS_A411: Record<string, DiySafetyAlignmentA411> = {
${alignments
  .map(
    (a) =>
      `  ${JSON.stringify(a.slug)}: { riskLevel: ${JSON.stringify(a.newRisk)}, diyAvailable: ${a.newDiyAvailable} },`,
  )
  .join("\n")}
};

export const DIY_SAFETY_A411_HELD = ["painting-services"] as const;

export const DIY_SAFETY_A411_UNRESOLVED_MISSING_HUBS = [
  "burner-cooker",
  "dishwasher",
  "microwave",
  "oven",
  "refrigerator",
  "washing-machine",
  "water-heater",
] as const;
`;
  writeFileSync(join(process.cwd(), "prisma/data/diy-safety-alignment-a411.ts"), overlayTs);

  // Apply DB updates in a transaction
  const auditRows: Alignment[] = [];
  await prisma.$transaction(async (tx) => {
    for (const a of alignments) {
      const row = await tx.service.findUnique({ where: { slug: a.slug } });
      if (!row) throw new Error(`Service missing in DB: ${a.slug}`);
      if (row.riskLevel !== a.oldRisk || row.diyAvailable !== a.oldDiyAvailable) {
        throw new Error(
          `DB drift for ${a.slug}: expected risk=${a.oldRisk} diy=${a.oldDiyAvailable}, got risk=${row.riskLevel} diy=${row.diyAvailable}`,
        );
      }
      // painting-services guard
      if (a.slug === "painting-services") throw new Error("painting-services must not be updated");

      await tx.service.update({
        where: { id: row.id },
        data: {
          riskLevel: a.newRisk,
          diyAvailable: a.newDiyAvailable,
        },
      });
      auditRows.push(a);
    }

    // Confirm painting-services unchanged
    const paint = await tx.service.findUnique({ where: { slug: "painting-services" } });
    if (!paint || paint.riskLevel !== "green" || paint.diyAvailable !== true) {
      throw new Error(`painting-services unexpectedly changed: ${JSON.stringify(paint)}`);
    }
  });

  if (auditRows.length !== 110) throw new Error(`Expected 110 DB updates, got ${auditRows.length}`);

  const audit = {
    phase: "A4.1.1",
    reason: "diy_matrix_authoritative",
    appliedAt: new Date().toISOString(),
    appliedCount: auditRows.length,
    held: [{ slug: "painting-services", status: "HUMAN_REVIEW_REQUIRED", riskLevel: "green", diyAvailable: true }],
    unresolvedMissingHubs: report.coverage.missingServices,
    changes: auditRows,
  };
  writeFileSync(join(process.cwd(), "docs/diy-safety-reconciliation-a411-audit.json"), JSON.stringify(audit, null, 2));

  // Post-checks
  const sl = await prisma.serviceLocation.count();
  const pub = await prisma.serviceLocation.count({
    where: { covered: true, coverageStatus: "published", indexable: true },
  });
  const pilots = await prisma.serviceLocation.count({ where: { coverageStatus: "draft", covered: false } });
  if (sl !== 99 || pub !== 49 || pilots !== 50) {
    throw new Error(`ServiceLocation drift after apply: total=${sl} pub=${pub} pilots=${pilots}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        applied: auditRows.length,
        held: 1,
        unresolvedHubs: 7,
        seedOverlay: "prisma/data/diy-safety-alignment-a411.ts",
        audit: "docs/diy-safety-reconciliation-a411-audit.json",
        serviceLocation: { total: sl, published: pub, pilots },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
