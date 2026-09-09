/**
 * A4.2 — DIY profile coverage helpers (311 registry + guide slug rules).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DiyMatrixSafety } from "@/lib/diy/profile-contract";
import { emptyDiyProfile } from "@/lib/diy/profile-contract";
import {
  PLUMBING_PRIMARY_GUIDE_SLUG,
  primaryGuideSlugForGreen,
} from "@/lib/diy/author-green-profiles";

export const EXISTING_SIX_GUIDES = [
  "how-to-fix-dripping-faucet",
  "how-to-clean-ac-filter",
  "how-to-touch-up-interior-paint",
  "how-to-check-a-small-wall-crack",
  "how-to-clean-a-bathroom",
  "how-to-unclog-a-sink-safely",
] as const;

export const LABEL_MISMATCH_GUIDES = [
  "how-to-fix-dripping-faucet",
  "how-to-clean-ac-filter",
  "how-to-clean-a-bathroom",
] as const;

export const MISSING_HUBS = [
  "burner-cooker",
  "dishwasher",
  "microwave",
  "oven",
  "refrigerator",
  "washing-machine",
  "water-heater",
] as const;

export type CoverageRow = {
  serviceSlug: string;
  matrixSlug: string;
  diyStatus: DiyMatrixSafety;
  riskLevel: string;
  profileVersion: number;
  primaryGuideSlug: string | null;
  profileStatus: "draft" | "unresolved_missing_hub";
  reviewState: "draft" | "label_mismatch_review" | "coverage_only" | "unresolved_missing_hub";
  arabicStatus: "not_started";
  authoredEn: boolean;
  batch: "A4.2-GREEN-1" | null;
  hasServiceRecord: boolean;
};

type MatrixFile = {
  rows: Array<{
    n?: number;
    offeringSlug: string;
    serviceOffering: string;
    parentSlug: string;
    diyStatus: string;
    riskLevel?: string;
  }>;
};

export function loadMatrixRows(cwd = process.cwd()) {
  const raw = JSON.parse(readFileSync(join(cwd, "docs/diy-classification-matrix-311.json"), "utf8")) as MatrixFile;
  return raw.rows;
}

export function shellGuideSlug(serviceSlug: string): string {
  return `diy-shell-${serviceSlug}`;
}

/** Primary guide slug for any matrix offering (GREEN uses authoring map; others use shell). */
export function coveragePrimaryGuideSlug(serviceSlug: string, diyStatus: DiyMatrixSafety): string {
  if (serviceSlug === "plumbing-maintenance") return PLUMBING_PRIMARY_GUIDE_SLUG;
  if (diyStatus === "GREEN") return primaryGuideSlugForGreen(serviceSlug);
  // Do not silently reassign existing guides as primary for non-GREEN except explicit plumbing.
  return shellGuideSlug(serviceSlug);
}

export function diyCategorySlugForParent(parentSlug: string, offeringSlug: string): string {
  if (parentSlug === "plumbing" || offeringSlug.includes("faucet") || offeringSlug.includes("drain") || offeringSlug.includes("sink"))
    return "plumbing";
  if (parentSlug === "ac" || offeringSlug.startsWith("ac-") || offeringSlug.includes("split-ac")) return "ac";
  if (parentSlug === "painting" || offeringSlug.includes("paint")) return "painting";
  if (parentSlug === "walls" || offeringSlug.includes("wall") || offeringSlug.includes("crack")) return "walls";
  return "cleaning";
}

export function buildCoverageRegistry(cwd = process.cwd()): CoverageRow[] {
  const rows = loadMatrixRows(cwd);
  return rows.map((row) => {
    const diyStatus = row.diyStatus as DiyMatrixSafety;
    const isMissingHub = (MISSING_HUBS as readonly string[]).includes(row.offeringSlug);
    if (isMissingHub) {
      return {
        serviceSlug: row.offeringSlug,
        matrixSlug: row.offeringSlug,
        diyStatus,
        riskLevel: row.riskLevel ?? "",
        profileVersion: 1,
        primaryGuideSlug: null,
        profileStatus: "unresolved_missing_hub",
        reviewState: "unresolved_missing_hub",
        arabicStatus: "not_started",
        authoredEn: false,
        batch: null,
        hasServiceRecord: false,
      };
    }
    const primaryGuideSlug = coveragePrimaryGuideSlug(row.offeringSlug, diyStatus);
    const authoredEn = diyStatus === "GREEN";
    return {
      serviceSlug: row.offeringSlug,
      matrixSlug: row.offeringSlug,
      diyStatus,
      riskLevel: row.riskLevel ?? "",
      profileVersion: 1,
      primaryGuideSlug,
      profileStatus: "draft",
      reviewState: authoredEn ? "draft" : "coverage_only",
      arabicStatus: "not_started",
      authoredEn,
      batch: authoredEn ? "A4.2-GREEN-1" : null,
      hasServiceRecord: true,
    };
  });
}

export function shellProfile(diyStatus: DiyMatrixSafety) {
  return emptyDiyProfile({
    matrixSafety: diyStatus,
    status: "draft",
    batch: null,
    authored: false,
  });
}
