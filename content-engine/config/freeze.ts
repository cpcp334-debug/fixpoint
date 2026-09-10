/**
 * Frozen website baselines — Phase 1 must not mutate these.
 */
export const FREEZE = {
  publicDiy: 45,
  publicServiceLocation: 49,
  publicTotal: 94,
  coveredServiceLocation: 49,
  diyDbRecords: 563,
  approvedServices: 311,
  serviceLocationPairs: 63_400,
  totalContentRecords: 63_963,
  totalEnArVersions: 127_926,
  rules: [
    "Do not modify existing 94 public pages",
    "Do not change ServiceLocation.covered",
    "Do not change safety classifications",
    "Do not change service/location/diy slugs or public URLs",
    "Do not mass-generate or mass-publish the 63,963 corpus",
    "Do not invent coverage",
    "AI never publishes directly",
  ],
} as const;
