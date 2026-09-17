/**
 * Content Engine — global configuration.
 * AI generates. Code validates. DB controls. Publication happens last.
 */
export const CONTENT_ENGINE_VERSION = "2026.09.10";

export const CORPUS = {
  totalContentRecords: 63_963,
  serviceLocation: 63_400,
  diyRecords: 563,
  enVersions: 63_963,
  arVersions: 63_963,
  totalEnArVersions: 127_926,
  approvedServices: 311,
  protectedPublic: {
    diy: 45,
    serviceLocation: 49,
    total: 94,
  },
} as const;

export const BATCH_SIZES = [1, 10, 100, 250, 500] as const;

export type ContentType = "SERVICE" | "SERVICE_LOCATION" | "DIY" | "BLOG" | "CATEGORY";

export const CONTENT_TYPES: ContentType[] = [
  "SERVICE",
  "SERVICE_LOCATION",
  "DIY",
  "BLOG",
  "CATEGORY",
];

export const HARD_GATES = {
  /** Default / Service × Location fail-below floor. */
  minRenderedWords: 800,
  /** Blog + new DIY public articles stay at the stricter floor. */
  minRenderedWordsBlog: 1_000,
  minRenderedWordsDiy: 1_000,
  /** Preferred target band for new longform. */
  preferredWordRange: [1_000, 1_300] as const,
  /** Acceptable SL band before soft trim guidance. */
  acceptableWordRange: [800, 1_200] as const,
  similarityThreshold: 0.85, // existing SIMILARITY_THRESHOLD
  requireWebp: true,
  requireAlt: true,
  requireEnAr: true,
  noEnglishFallback: true,
  inventCoverage: false,
  aiMayPublish: false,
} as const;

export function minWordsForContentType(type: ContentType): number {
  if (type === "BLOG") return HARD_GATES.minRenderedWordsBlog;
  if (type === "DIY") return HARD_GATES.minRenderedWordsDiy;
  return HARD_GATES.minRenderedWords;
}

export const GENERATION = {
  maxRetries: 3,
  maxBatchCostUsd: 25,
  maxDailyCostUsd: 200,
  defaultBatchSize: 100,
} as const;