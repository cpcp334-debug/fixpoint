/**
 * A4.1.1 — DIY safety mismatch inventory (READ-ONLY).
 * Does not mutate the database.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import {
  EXPECTED_DIY_MATRIX_COUNTS,
  getDiyMatrixRow,
  loadDiyClassificationMatrix,
  resetDiyMatrixCache,
} from "../src/lib/service-location/diy-matrix";
import { riskToSafetyClass } from "../src/lib/service-location/diy";
import type { DiySafetyClass } from "../src/lib/service-location/types";
import type { RiskLevel } from "@prisma/client";

export type ConflictClass = "A_SAFE_ALIGNMENT" | "B_NEEDS_HUMAN_REVIEW" | "C_SAFETY_CRITICAL" | "D_LEGACY_DATA_ONLY" | "E_NO_CHANGE_REQUIRED";

type InventoryRow = {
  n: number;
  serviceSlug: string;
  serviceName: string;
  serviceRiskLevel: RiskLevel;
  serviceDiyAvailable: boolean;
  schemaDiyReview: string | null;
  matrixStatus: DiySafetyClass | "MISSING";
  matrixRisk: string;
  existingGuide: string | null;
  guideRisk: string | null;
  guideStatus: string | null;
  conflictType: string;
  conflictClass: ConflictClass;
  recommendedAction: string;
  confidence: "high" | "medium" | "low";
  proposedRiskLevel: RiskLevel | null;
  proposedDiyAvailable: boolean | null;
  arabicReviewLater: boolean;
  publicServiceLocationCount: number;
};

const RANK: Record<string, number> = { green: 0, yellow: 1, red: 2, GREEN: 0, YELLOW: 1, RED: 2, REVIEW_REQUIRED: 3 };

function matrixToRisk(matrix: DiySafetyClass): RiskLevel | null {
  if (matrix === "GREEN") return "green";
  if (matrix === "YELLOW") return "yellow";
  if (matrix === "RED") return "red";
  return null; // REVIEW_REQUIRED has no RiskLevel enum
}

function parseSchema(raw: string) {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function classify(args: {
  serviceRisk: RiskLevel;
  diyAvailable: boolean;
  matrix: DiySafetyClass;
  matrixRisk: string;
  guideSlug: string | null;
  guideRisk: RiskLevel | null;
  guideHasSteps: boolean;
  publicSlCount: number;
}): Omit<InventoryRow, "n" | "serviceSlug" | "serviceName" | "schemaDiyReview" | "arabicReviewLater"> & {
  conflictType: string;
  conflictClass: ConflictClass;
  recommendedAction: string;
  confidence: "high" | "medium" | "low";
  proposedRiskLevel: RiskLevel | null;
  proposedDiyAvailable: boolean | null;
} {
  const targetRisk = matrixToRisk(args.matrix);
  const serviceClass = riskToSafetyClass(args.serviceRisk);
  const riskMismatch = args.matrix === "REVIEW_REQUIRED" || serviceClass !== args.matrix;
  const diyShouldBeFalse = args.matrix === "RED" || args.matrix === "REVIEW_REQUIRED";
  const diyMismatch = diyShouldBeFalse && args.diyAvailable;

  // Guide procedural on RED/RR
  if (args.guideSlug && (args.matrix === "RED" || args.matrix === "REVIEW_REQUIRED") && args.guideHasSteps) {
    return {
      serviceRiskLevel: args.serviceRisk,
      serviceDiyAvailable: args.diyAvailable,
      matrixStatus: args.matrix,
      matrixRisk: args.matrixRisk,
      existingGuide: args.guideSlug,
      guideRisk: args.guideRisk,
      guideStatus: null,
      conflictType: "guide_procedural_vs_matrix_restricted",
      conflictClass: "C_SAFETY_CRITICAL",
      recommendedAction: "Do not rewrite guide. Flag SAFETY-CRITICAL REVIEW_REQUIRED. Align service diyAvailable=false and risk upward if needed.",
      confidence: "high",
      proposedRiskLevel: targetRisk && RANK[targetRisk] > RANK[args.serviceRisk] ? targetRisk : args.serviceRisk === "green" && args.matrix === "REVIEW_REQUIRED" ? "yellow" : null,
      proposedDiyAvailable: diyMismatch ? false : null,
      publicServiceLocationCount: args.publicSlCount,
    };
  }

  if (!riskMismatch && !diyMismatch) {
    return {
      serviceRiskLevel: args.serviceRisk,
      serviceDiyAvailable: args.diyAvailable,
      matrixStatus: args.matrix,
      matrixRisk: args.matrixRisk,
      existingGuide: args.guideSlug,
      guideRisk: args.guideRisk,
      guideStatus: null,
      conflictType: "none",
      conflictClass: "E_NO_CHANGE_REQUIRED",
      recommendedAction: "No change",
      confidence: "high",
      proposedRiskLevel: null,
      proposedDiyAvailable: null,
      publicServiceLocationCount: args.publicSlCount,
    };
  }

  // REVIEW_REQUIRED matrix
  if (args.matrix === "REVIEW_REQUIRED") {
    const actions: string[] = [];
    let proposedDiy: boolean | null = null;
    let proposedRisk: RiskLevel | null = null;
    if (diyMismatch) {
      actions.push("set diyAvailable=false");
      proposedDiy = false;
    }
    // Cannot encode RR in RiskLevel; if service is green, bump to yellow as conservative hold (safe upward)
    if (args.serviceRisk === "green") {
      actions.push("set riskLevel=yellow (conservative hold; RR not representable)");
      proposedRisk = "yellow";
      return {
        serviceRiskLevel: args.serviceRisk,
        serviceDiyAvailable: args.diyAvailable,
        matrixStatus: args.matrix,
        matrixRisk: args.matrixRisk,
        existingGuide: args.guideSlug,
        guideRisk: args.guideRisk,
        guideStatus: null,
        conflictType: "matrix_review_required",
        conflictClass: "A_SAFE_ALIGNMENT",
        recommendedAction: actions.join("; ") + "; keep schemaData.diyReview=REVIEW_REQUIRED",
        confidence: "high",
        proposedRiskLevel: proposedRisk,
        proposedDiyAvailable: proposedDiy,
        publicServiceLocationCount: args.publicSlCount,
      };
    }
    if (diyMismatch) {
      return {
        serviceRiskLevel: args.serviceRisk,
        serviceDiyAvailable: args.diyAvailable,
        matrixStatus: args.matrix,
        matrixRisk: args.matrixRisk,
        existingGuide: args.guideSlug,
        guideRisk: args.guideRisk,
        guideStatus: null,
        conflictType: "matrix_review_required_diy_true",
        conflictClass: "A_SAFE_ALIGNMENT",
        recommendedAction: "set diyAvailable=false; riskLevel unchanged (already restricted); schema diyReview RR",
        confidence: "high",
        proposedRiskLevel: null,
        proposedDiyAvailable: false,
        publicServiceLocationCount: args.publicSlCount,
      };
    }
    // risk yellow/red + diy false + matrix RR — informational mismatch only
    return {
      serviceRiskLevel: args.serviceRisk,
      serviceDiyAvailable: args.diyAvailable,
      matrixStatus: args.matrix,
      matrixRisk: args.matrixRisk,
      existingGuide: args.guideSlug,
      guideRisk: args.guideRisk,
      guideStatus: null,
      conflictType: "matrix_review_required_enum_gap",
      conflictClass: "E_NO_CHANGE_REQUIRED",
      recommendedAction: "No RiskLevel change (RR not in enum). Evaluator already treats matrix RR as authoritative.",
      confidence: "high",
      proposedRiskLevel: null,
      proposedDiyAvailable: null,
      publicServiceLocationCount: args.publicSlCount,
    };
  }

  // Service stricter than matrix (e.g. yellow vs GREEN, red vs YELLOW) — never downgrade
  if (targetRisk && RANK[args.serviceRisk] > RANK[targetRisk]) {
    return {
      serviceRiskLevel: args.serviceRisk,
      serviceDiyAvailable: args.diyAvailable,
      matrixStatus: args.matrix,
      matrixRisk: args.matrixRisk,
      existingGuide: args.guideSlug,
      guideRisk: args.guideRisk,
      guideStatus: null,
      conflictType: "service_stricter_than_matrix",
      conflictClass: "E_NO_CHANGE_REQUIRED",
      recommendedAction: "Keep service risk (stricter). Matrix still authoritative for display/eval via matrix loader; do not downgrade.",
      confidence: "high",
      proposedRiskLevel: null,
      proposedDiyAvailable: diyMismatch ? false : null,
      publicServiceLocationCount: args.publicSlCount,
    };
  }

  // Service weaker than matrix — safe upward alignment
  if (targetRisk && RANK[args.serviceRisk] < RANK[targetRisk]) {
    const isRed = args.matrix === "RED";
    const class_: ConflictClass =
      isRed && args.guideSlug
        ? "C_SAFETY_CRITICAL"
        : isRed
          ? "A_SAFE_ALIGNMENT"
          : "A_SAFE_ALIGNMENT";
    // If published DIY guide attached and matrix RED, critical review before auto risk bump that hides DIY
    if (isRed && args.guideSlug && args.publicSlCount > 0) {
      return {
        serviceRiskLevel: args.serviceRisk,
        serviceDiyAvailable: args.diyAvailable,
        matrixStatus: args.matrix,
        matrixRisk: args.matrixRisk,
        existingGuide: args.guideSlug,
        guideRisk: args.guideRisk,
        guideStatus: null,
        conflictType: "upward_to_red_with_public_sl_and_guide",
        conflictClass: "B_NEEDS_HUMAN_REVIEW",
        recommendedAction: "Report before aligning: may hide DIY on public service-location pages. Prefer diyAvailable=false now; riskLevel=red after human confirm.",
        confidence: "medium",
        proposedRiskLevel: null,
        proposedDiyAvailable: diyMismatch ? false : args.diyAvailable ? false : null,
        publicServiceLocationCount: args.publicSlCount,
      };
    }
    return {
      serviceRiskLevel: args.serviceRisk,
      serviceDiyAvailable: args.diyAvailable,
      matrixStatus: args.matrix,
      matrixRisk: args.matrixRisk,
      existingGuide: args.guideSlug,
      guideRisk: args.guideRisk,
      guideStatus: null,
      conflictType: `upward_align_${args.serviceRisk}_to_${targetRisk}`,
      conflictClass: class_ === "C_SAFETY_CRITICAL" ? "B_NEEDS_HUMAN_REVIEW" : "A_SAFE_ALIGNMENT",
      recommendedAction: `set riskLevel=${targetRisk}${diyMismatch || diyShouldBeFalse ? "; set diyAvailable=false" : ""}`,
      confidence: "high",
      proposedRiskLevel: targetRisk,
      proposedDiyAvailable: diyShouldBeFalse ? false : diyMismatch ? false : null,
      publicServiceLocationCount: args.publicSlCount,
    };
  }

  // diyAvailable only mismatch
  if (diyMismatch) {
    return {
      serviceRiskLevel: args.serviceRisk,
      serviceDiyAvailable: args.diyAvailable,
      matrixStatus: args.matrix,
      matrixRisk: args.matrixRisk,
      existingGuide: args.guideSlug,
      guideRisk: args.guideRisk,
      guideStatus: null,
      conflictType: "diy_available_true_vs_restricted_matrix",
      conflictClass: "A_SAFE_ALIGNMENT",
      recommendedAction: "set diyAvailable=false",
      confidence: "high",
      proposedRiskLevel: null,
      proposedDiyAvailable: false,
      publicServiceLocationCount: args.publicSlCount,
    };
  }

  return {
    serviceRiskLevel: args.serviceRisk,
    serviceDiyAvailable: args.diyAvailable,
    matrixStatus: args.matrix,
    matrixRisk: args.matrixRisk,
    existingGuide: args.guideSlug,
    guideRisk: args.guideRisk,
    guideStatus: null,
    conflictType: "ambiguous",
    conflictClass: "B_NEEDS_HUMAN_REVIEW",
    recommendedAction: "Human review — do not guess",
    confidence: "low",
    proposedRiskLevel: null,
    proposedDiyAvailable: null,
    publicServiceLocationCount: args.publicSlCount,
  };
}

async function main() {
  resetDiyMatrixCache();
  const matrix = loadDiyClassificationMatrix();
  const services = await prisma.service.findMany({
    include: {
      translations: { where: { locale: "en" } },
      diyGuides: true,
      serviceLocations: {
        where: { covered: true, coverageStatus: "published", indexable: true },
        select: { id: true },
      },
    },
    orderBy: { slug: "asc" },
  });

  // 311 offerings from matrix
  const matrixSlugs = [...matrix.bySlug.keys()].sort();
  const serviceBySlug = new Map(services.map((s) => [s.slug, s]));

  const inventory: InventoryRow[] = [];
  let n = 0;
  for (const slug of matrixSlugs) {
    const row = matrix.bySlug.get(slug)!;
    const svc = serviceBySlug.get(slug);
    if (!svc) {
      n += 1;
      inventory.push({
        n,
        serviceSlug: slug,
        serviceName: "(MISSING SERVICE)",
        serviceRiskLevel: "yellow",
        serviceDiyAvailable: false,
        schemaDiyReview: null,
        matrixStatus: row.diyStatus,
        matrixRisk: row.riskLevel,
        existingGuide: row.existingGuide ?? null,
        guideRisk: null,
        guideStatus: null,
        conflictType: "missing_service_record",
        conflictClass: "C_SAFETY_CRITICAL",
        recommendedAction: "Create/repair service record — STOP",
        confidence: "high",
        proposedRiskLevel: null,
        proposedDiyAvailable: null,
        arabicReviewLater: row.arabicReview === "review-required" || row.arabicReview === "required",
        publicServiceLocationCount: 0,
      });
      continue;
    }
    const schema = parseSchema(svc.schemaData);
    const diyReview = typeof schema.diyReview === "string" ? schema.diyReview : null;
    const guide = svc.diyGuides[0] ?? null;
    const guideHasSteps = Boolean(guide); // presence of guide implies procedural body in seed
    const classified = classify({
      serviceRisk: svc.riskLevel,
      diyAvailable: svc.diyAvailable,
      matrix: row.diyStatus,
      matrixRisk: row.riskLevel,
      guideSlug: guide?.slug ?? (typeof row.existingGuide === "string" ? row.existingGuide : null),
      guideRisk: guide?.riskLevel ?? null,
      guideHasSteps: Boolean(guide && guide.riskLevel !== "red"),
      publicSlCount: svc.serviceLocations.length,
    });

    // Only include actual mismatches OR diy mismatches OR RR enum gap reported in A4.1
    const matrixStatus: DiySafetyClass = row.diyStatus;
    const matrixRestricted = matrixStatus === "RED" || matrixStatus === "REVIEW_REQUIRED";
    const isMismatch =
      matrixStatus === "REVIEW_REQUIRED" ||
      riskToSafetyClass(svc.riskLevel) !== matrixStatus ||
      (svc.diyAvailable && matrixRestricted);

    if (!isMismatch && classified.conflictClass === "E_NO_CHANGE_REQUIRED") {
      // still track coverage separately; skip from "181" style list unless we want full 311
    }

    if (isMismatch) {
      n += 1;
      inventory.push({
        n,
        serviceSlug: slug,
        serviceName: svc.translations[0]?.name || slug,
        serviceRiskLevel: svc.riskLevel,
        serviceDiyAvailable: svc.diyAvailable,
        schemaDiyReview: diyReview,
        matrixStatus: row.diyStatus,
        matrixRisk: row.riskLevel,
        existingGuide: classified.existingGuide,
        guideRisk: classified.guideRisk,
        guideStatus: guide?.status ?? null,
        conflictType: classified.conflictType,
        conflictClass: classified.conflictClass,
        recommendedAction: classified.recommendedAction,
        confidence: classified.confidence,
        proposedRiskLevel: classified.proposedRiskLevel,
        proposedDiyAvailable: classified.proposedDiyAvailable,
        arabicReviewLater: row.arabicReview === "review-required" || row.arabicReview === "required",
        publicServiceLocationCount: svc.serviceLocations.length,
      });
    }
  }

  // Guide mapping (all DB guides)
  const guides = await prisma.diyGuide.findMany({
    include: { service: true, translations: { where: { locale: "en" }, take: 1 } },
  });
  const guideReport = guides
    .filter((g): g is typeof g & { service: NonNullable<typeof g.service> } => Boolean(g.service))
    .map((g) => {
    const m = getDiyMatrixRow(g.service.slug);
    return {
      guideSlug: g.slug,
      status: g.status,
      guideRisk: g.riskLevel,
      serviceSlug: g.service.slug,
      serviceRisk: g.service.riskLevel,
      matrixStatus: m?.diyStatus ?? "MISSING",
      matrixRisk: m?.riskLevel ?? null,
      result:
        m && (m.diyStatus === "RED" || m.diyStatus === "REVIEW_REQUIRED") && g.riskLevel !== "red"
          ? "SAFETY-CRITICAL REVIEW_REQUIRED — procedural guide vs restricted matrix"
          : m && riskToSafetyClass(g.riskLevel) !== m.diyStatus
            ? "GUIDE_RISK_MISMATCH — do not auto-rewrite"
            : "OK / compatible",
    };
  });

  // Enrich guide steps check from i18n
  for (const g of guides) {
    if (!g.service) continue;
    const full = await prisma.diyGuideI18n.findFirst({ where: { guideId: g.id, locale: "en" } });
    const entry = guideReport.find((x) => x.guideSlug === g.slug);
    if (entry && full) {
      try {
        const steps = JSON.parse(full.steps) as unknown[];
        const m = getDiyMatrixRow(g.service.slug);
        if (m && (m.diyStatus === "RED" || m.diyStatus === "REVIEW_REQUIRED") && Array.isArray(steps) && steps.length > 0) {
          entry.result = "SAFETY-CRITICAL REVIEW_REQUIRED — procedural steps present under restricted matrix";
        }
      } catch {
        /* ignore */
      }
    }
  }

  const byClass = {
    A_SAFE_ALIGNMENT: inventory.filter((r) => r.conflictClass === "A_SAFE_ALIGNMENT"),
    B_NEEDS_HUMAN_REVIEW: inventory.filter((r) => r.conflictClass === "B_NEEDS_HUMAN_REVIEW"),
    C_SAFETY_CRITICAL: inventory.filter((r) => r.conflictClass === "C_SAFETY_CRITICAL"),
    D_LEGACY_DATA_ONLY: inventory.filter((r) => r.conflictClass === "D_LEGACY_DATA_ONLY"),
    E_NO_CHANGE_REQUIRED: inventory.filter((r) => r.conflictClass === "E_NO_CHANGE_REQUIRED"),
  };

  const safeFixes = inventory.filter(
    (r) =>
      r.conflictClass === "A_SAFE_ALIGNMENT" &&
      r.confidence === "high" &&
      (r.proposedRiskLevel != null || r.proposedDiyAvailable != null),
  );

  const coverage = {
    matrixRows: matrix.bySlug.size,
    expected: EXPECTED_DIY_MATRIX_COUNTS,
    matrixCounts: matrix.counts,
    servicesInMatrix: matrixSlugs.filter((s) => serviceBySlug.has(s)).length,
    missingServices: matrixSlugs.filter((s) => !serviceBySlug.has(s)),
    extraServicesNotInMatrix: services.filter((s) => !matrix.bySlug.has(s.slug)).map((s) => s.slug),
    serviceLocationTotal: await prisma.serviceLocation.count(),
    published49: await prisma.serviceLocation.count({
      where: { covered: true, coverageStatus: "published", indexable: true },
    }),
    pilots50: await prisma.serviceLocation.count({ where: { coverageStatus: "draft", covered: false } }),
  };

  const arabicLater = inventory.filter((r) => r.arabicReviewLater).map((r) => r.serviceSlug);

  const report = {
    phase: "A4.1.1",
    mode: "READ_ONLY_INVENTORY",
    mismatchCount: inventory.length,
    byClassCounts: {
      A: byClass.A_SAFE_ALIGNMENT.length,
      B: byClass.B_NEEDS_HUMAN_REVIEW.length,
      C: byClass.C_SAFETY_CRITICAL.length,
      D: byClass.D_LEGACY_DATA_ONLY.length,
      E: byClass.E_NO_CHANGE_REQUIRED.length,
    },
    safeAutomaticFixCount: safeFixes.length,
    coverage,
    guides: guideReport,
    arabicReviewLaterCount: new Set(
      matrixSlugs.filter((slug) => {
        const r = matrix.bySlug.get(slug);
        return r?.arabicReview === "review-required" || r?.arabicReview === "required";
      }),
    ).size,
    inventory,
    safeFixesProposed: safeFixes.map((r) => ({
      slug: r.serviceSlug,
      fromRisk: r.serviceRiskLevel,
      toRisk: r.proposedRiskLevel,
      fromDiy: r.serviceDiyAvailable,
      toDiy: r.proposedDiyAvailable,
      action: r.recommendedAction,
      publicSl: r.publicServiceLocationCount,
    })),
  };

  const outDir = join(process.cwd(), "docs");
  writeFileSync(join(outDir, "diy-safety-reconciliation-a411-inventory.json"), JSON.stringify(report, null, 2));
  const csvHeader =
    "#,Service,Service riskLevel,Service diyAvailable,Matrix status,Matrix risk,Existing guide,Conflict type,Class,Recommended action,Confidence,Proposed risk,Proposed diyAvailable,Public SL count\n";
  const csvBody = inventory
    .map((r) =>
      [
        r.n,
        r.serviceSlug,
        r.serviceRiskLevel,
        r.serviceDiyAvailable,
        r.matrixStatus,
        r.matrixRisk,
        r.existingGuide ?? "",
        r.conflictType,
        r.conflictClass,
        `"${r.recommendedAction.replace(/"/g, "'")}"`,
        r.confidence,
        r.proposedRiskLevel ?? "",
        r.proposedDiyAvailable ?? "",
        r.publicServiceLocationCount,
      ].join(","),
    )
    .join("\n");
  writeFileSync(join(outDir, "diy-safety-reconciliation-a411-inventory.csv"), csvHeader + csvBody);

  console.log(
    JSON.stringify(
      {
        ok: true,
        mismatchCount: inventory.length,
        byClassCounts: report.byClassCounts,
        safeAutomaticFixCount: safeFixes.length,
        guides: guideReport.length,
        coverage: {
          matrixRows: coverage.matrixRows,
          missingServices: coverage.missingServices.length,
          serviceLocation: coverage.serviceLocationTotal,
          published: coverage.published49,
          pilots: coverage.pilots50,
        },
        reportFiles: [
          "docs/diy-safety-reconciliation-a411-inventory.json",
          "docs/diy-safety-reconciliation-a411-inventory.csv",
        ],
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
