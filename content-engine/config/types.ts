/**
 * Content Engine pipeline stages.
 * AI must NEVER publish directly.
 */
export const PIPELINE_STAGES = [
  "MANIFEST",
  "GENERATOR",
  "VALIDATOR",
  "REVIEW_QUEUE",
  "PUBLICATION_QUEUE",
  "DATABASE",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type EngineIssue = {
  code: string;
  severity: "blocker" | "warn" | "info";
  message: string;
  field?: string;
};

export type ValidationScore = {
  wordCount: number;
  unique: boolean;
  useful: boolean;
  seo: boolean;
  aeo: boolean;
  geo: boolean;
  safety: boolean;
  quality: boolean;
  coverage: boolean;
  image: boolean;
  localization: boolean;
  publicationEligible: boolean;
};

export type ValidationResult = {
  passed: boolean;
  lifecycle: string;
  wordCount: number;
  score: ValidationScore;
  issues: EngineIssue[];
};

export type ManifestRecord = {
  contentKey: string;
  contentType: "SERVICE" | "SERVICE_LOCATION" | "DIY" | "BLOG" | "CATEGORY";
  locale: "en" | "ar";
  serviceSlug?: string;
  locationSlug?: string;
  diySlug?: string;
  articleSlug?: string;
  safetyClass?: string;
  coverageRequired?: boolean;
  required?: boolean;
  priority?: number;
};
