/**
 * 311 approved services ↔ primary DIY mapping — engine-facing status.
 * Does NOT delete DIY records. Does NOT invent missing hubs.
 */
export const DIY_MAPPING_311 = {
  approvedServices: 311,
  diyDbRecords: 563,
  deleteExtras: false,
  extraClassifications: [
    "legacy",
    "duplicate",
    "unmapped",
    "not_appropriate",
    "needs_creation",
  ] as const,
  /** Existing reconcile scripts / reports (authoritative until engine re-sync). */
  existingArtifacts: [
    "docs/diy-service-311-mapping.md",
    "docs/diy-service-311-mapping.json",
    "scripts/master-311-reconcile-and-audit.ts",
  ],
  missingHubsDoNotInvent: [
    "refrigerator",
    "microwave",
    "washing-machine",
    "water-heater",
    "dishwasher",
    "oven",
    "burner-cooker",
  ],
  phase1Status: "wired-to-existing-reconcile; engine does not mutate coverage or DIY rows",
};

export function diyMappingStatus() {
  return DIY_MAPPING_311;
}
