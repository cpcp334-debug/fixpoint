import type { CoverageInput } from "./types";

const COVERED_STATUSES = new Set(["approved", "published"]);

export function isCoveredOps(input: CoverageInput) {
  return input.covered && COVERED_STATUSES.has(input.coverageStatus);
}

export function isPubliclyEligible(input: CoverageInput) {
  return (
    isCoveredOps(input) &&
    input.coverageStatus === "published" &&
    input.serviceStatus === "active" &&
    input.locationStatus === "active" &&
    input.locationServes
  );
}

export function coverageLifecycleAllowed(from: CoverageInput["coverageStatus"], to: CoverageInput["coverageStatus"]) {
  if (from === to) return true;
  if (to === "archived") return from !== "archived";
  const order = ["draft", "review", "approved", "published"] as const;
  const fromIdx = order.indexOf(from as (typeof order)[number]);
  const toIdx = order.indexOf(to as (typeof order)[number]);
  if (fromIdx < 0 || toIdx < 0) return false;
  return toIdx === fromIdx + 1 || (from === "published" && to === "approved");
}
