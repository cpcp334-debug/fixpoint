/**
 * A3.2 controlled ServiceLocation coverage pilot — locked selection.
 * 10 approved draft child offerings × 5 existing A2 locations = 50 pairs.
 * Not wired into seed.
 */

export const A32_PILOT_SERVICE_SLUGS = [
  "villa-cleaning",
  "faucet-repair",
  "socket-repair",
  "ac-servicing",
  "interior-painting",
  "wall-crack-repair",
  "swimming-pool-cleaning",
  "refrigerator-cooling-problem",
  "general-handyman-service",
  "gas-burner-repair",
] as const;

export const A32_PILOT_LOCATION_SLUGS = [
  "dubai-marina",
  "al-majaz-1",
  "al-ain",
  "yas-island",
  "ajman-city",
] as const;

export type A32PilotServiceSlug = (typeof A32_PILOT_SERVICE_SLUGS)[number];
export type A32PilotLocationSlug = (typeof A32_PILOT_LOCATION_SLUGS)[number];

export const A32_PILOT_PAIR_COUNT = A32_PILOT_SERVICE_SLUGS.length * A32_PILOT_LOCATION_SLUGS.length;

export function a32PilotPairs(): Array<{ serviceSlug: A32PilotServiceSlug; locationSlug: A32PilotLocationSlug }> {
  const pairs: Array<{ serviceSlug: A32PilotServiceSlug; locationSlug: A32PilotLocationSlug }> = [];
  for (const serviceSlug of A32_PILOT_SERVICE_SLUGS) {
    for (const locationSlug of A32_PILOT_LOCATION_SLUGS) {
      pairs.push({ serviceSlug, locationSlug });
    }
  }
  return pairs;
}

/** Empty working-copy shell — schema requires non-null strings; no generated content. */
export const A32_EMPTY_I18N = {
  intro: "",
  localInfo: "",
  seoTitle: "",
  metaDescription: "",
  faq: "[]",
  h1: "",
  body: "",
  directAnswer: "",
  geoIntro: "",
  imageAlt: "",
} as const;
