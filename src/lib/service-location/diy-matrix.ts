import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RiskLevel } from "@prisma/client";
import type { DiySafetyClass } from "./types";

const RISK_TO_CLASS: Record<RiskLevel, DiySafetyClass> = {
  green: "GREEN",
  yellow: "YELLOW",
  red: "RED",
};

function riskToSafetyClass(risk: RiskLevel): DiySafetyClass {
  return RISK_TO_CLASS[risk];
}

export type DiyMatrixRow = {
  n: number;
  offeringSlug: string;
  diyStatus: DiySafetyClass;
  riskLevel: string;
  arabicReview?: string;
  safetyReview?: string;
  existingGuide?: string | null;
};

export type DiyMatrixMetaCounts = {
  GREEN: number;
  YELLOW: number;
  RED: number;
  REVIEW_REQUIRED: number;
  total: number;
};

export const EXPECTED_DIY_MATRIX_COUNTS: DiyMatrixMetaCounts = {
  GREEN: 46,
  YELLOW: 128,
  RED: 112,
  REVIEW_REQUIRED: 25,
  total: 311,
};

type MatrixFile = {
  meta: { counts: DiyMatrixMetaCounts };
  rows: Array<{
    n: number;
    offeringSlug: string;
    diyStatus: string;
    riskLevel?: string;
    arabicReview?: string;
    safetyReview?: string;
    existingGuide?: string | null;
  }>;
};

let cached: { bySlug: Map<string, DiyMatrixRow>; counts: DiyMatrixMetaCounts; mismatches: string[] } | null =
  null;

function asClass(value: string): DiySafetyClass | null {
  if (value === "GREEN" || value === "YELLOW" || value === "RED" || value === "REVIEW_REQUIRED") return value;
  return null;
}

export function loadDiyClassificationMatrix(cwd: string = process.cwd()) {
  if (cached) return cached;
  const path = join(cwd, "docs/diy-classification-matrix-311.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as MatrixFile;
  const bySlug = new Map<string, DiyMatrixRow>();
  const mismatches: string[] = [];
  for (const row of raw.rows) {
    const diyStatus = asClass(row.diyStatus);
    if (!diyStatus) {
      mismatches.push(`invalid diyStatus for ${row.offeringSlug}: ${row.diyStatus}`);
      continue;
    }
    bySlug.set(row.offeringSlug, {
      n: row.n,
      offeringSlug: row.offeringSlug,
      diyStatus,
      riskLevel: row.riskLevel ?? "",
      arabicReview: row.arabicReview,
      safetyReview: row.safetyReview,
      existingGuide: typeof row.existingGuide === "string" ? row.existingGuide : null,
    });
  }
  cached = { bySlug, counts: raw.meta.counts, mismatches };
  return cached;
}

export function resetDiyMatrixCache() {
  cached = null;
}

export function getDiyMatrixClass(serviceSlug: string, cwd?: string): DiySafetyClass | null {
  const matrix = loadDiyClassificationMatrix(cwd);
  return matrix.bySlug.get(serviceSlug)?.diyStatus ?? null;
}

export function getDiyMatrixRow(serviceSlug: string, cwd?: string): DiyMatrixRow | null {
  return loadDiyClassificationMatrix(cwd).bySlug.get(serviceSlug) ?? null;
}

export function assertDiyMatrixCounts(cwd?: string): {
  ok: boolean;
  expected: DiyMatrixMetaCounts;
  actual: DiyMatrixMetaCounts;
  derived: DiyMatrixMetaCounts;
} {
  const matrix = loadDiyClassificationMatrix(cwd);
  const derived: DiyMatrixMetaCounts = {
    GREEN: 0,
    YELLOW: 0,
    RED: 0,
    REVIEW_REQUIRED: 0,
    total: matrix.bySlug.size,
  };
  for (const row of matrix.bySlug.values()) {
    derived[row.diyStatus] += 1;
  }
  const actual = matrix.counts;
  const ok =
    actual.GREEN === EXPECTED_DIY_MATRIX_COUNTS.GREEN &&
    actual.YELLOW === EXPECTED_DIY_MATRIX_COUNTS.YELLOW &&
    actual.RED === EXPECTED_DIY_MATRIX_COUNTS.RED &&
    actual.REVIEW_REQUIRED === EXPECTED_DIY_MATRIX_COUNTS.REVIEW_REQUIRED &&
    actual.total === EXPECTED_DIY_MATRIX_COUNTS.total &&
    derived.GREEN === EXPECTED_DIY_MATRIX_COUNTS.GREEN &&
    derived.YELLOW === EXPECTED_DIY_MATRIX_COUNTS.YELLOW &&
    derived.RED === EXPECTED_DIY_MATRIX_COUNTS.RED &&
    derived.REVIEW_REQUIRED === EXPECTED_DIY_MATRIX_COUNTS.REVIEW_REQUIRED;
  return { ok, expected: EXPECTED_DIY_MATRIX_COUNTS, actual, derived };
}

export type RiskMatrixMismatch = {
  serviceSlug: string;
  serviceRiskLevel: RiskLevel;
  serviceClass: DiySafetyClass;
  matrixClass: DiySafetyClass;
};

/** Report Service.riskLevel vs matrix without rewriting Service.riskLevel. */
export function findRiskMatrixMismatches(
  services: Array<{ slug: string; riskLevel: RiskLevel }>,
  cwd?: string,
): RiskMatrixMismatch[] {
  const out: RiskMatrixMismatch[] = [];
  for (const svc of services) {
    const matrixClass = getDiyMatrixClass(svc.slug, cwd);
    if (!matrixClass) continue;
    const serviceClass = riskToSafetyClass(svc.riskLevel);
    // REVIEW_REQUIRED has no Prisma RiskLevel equivalent — always report vs green/yellow/red
    if (matrixClass === "REVIEW_REQUIRED") {
      out.push({
        serviceSlug: svc.slug,
        serviceRiskLevel: svc.riskLevel,
        serviceClass,
        matrixClass,
      });
      continue;
    }
    if (serviceClass !== matrixClass) {
      out.push({
        serviceSlug: svc.slug,
        serviceRiskLevel: svc.riskLevel,
        serviceClass,
        matrixClass,
      });
    }
  }
  return out;
}
