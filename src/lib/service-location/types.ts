import type {
  LocationStatus,
  LocationType,
  RiskLevel,
  ServiceLocationLifecycle,
  ServiceLocationQualityStatus,
  ServiceStatus,
} from "@prisma/client";

export const SERVICE_LOCATION_LIFECYCLE: ServiceLocationLifecycle[] = [
  "draft",
  "review",
  "approved",
  "published",
  "archived",
];

export const SEO_TITLE_MODIFIERS = [
  "Trusted",
  "Reliable",
  "Professional",
  "Expert",
  "Quality",
  "Top-Rated",
] as const;

export type SeoTitleModifier = (typeof SEO_TITLE_MODIFIERS)[number];

export type ArabicConfidence = "HIGH" | "MEDIUM" | "REVIEW_REQUIRED" | "UNKNOWN";

export type DiySafetyClass = "GREEN" | "YELLOW" | "RED" | "REVIEW_REQUIRED";

export type ContentEvalMode = "LEGACY_COMPAT" | "STRICT_NEW_CONTENT";

export type CoverageInput = {
  covered: boolean;
  coverageStatus: ServiceLocationLifecycle;
  serviceStatus: ServiceStatus;
  locationStatus: LocationStatus;
  locationServes: boolean;
};

export type OverrideInput = {
  bookingEnabledOverride: boolean | null;
  amcAvailableOverride: boolean | null;
  emergencyAvailableOverride: boolean | null;
  diyRestricted: boolean;
  serviceBookingEnabled: boolean;
  serviceAmcAvailable: boolean;
  serviceEmergencyAvailable: boolean;
  serviceDiyAvailable: boolean;
  serviceRiskLevel: RiskLevel;
};

export type WorkingCopy = {
  locale: string;
  intro: string;
  localInfo: string;
  seoTitle: string;
  metaDescription: string;
  faq: string;
  h1?: string;
  body?: string;
  directAnswer?: string;
  geoIntro?: string;
  imageAlt?: string;
  /** Hybrid A4.1 structured sections (object or JSON string). */
  contentJson?: unknown;
};

export type GateInput = CoverageInput &
  OverrideInput & {
    indexableStored: boolean;
    qualityStatus: ServiceLocationQualityStatus;
    qualityScore: number;
    serviceIndexable: boolean;
    locationIndexable: boolean;
    locationSlug: string;
    serviceSlug: string;
    serviceHeroImage: string | null;
    heroImageOverride: string | null;
    en: WorkingCopy | null;
    ar: WorkingCopy | null;
    arabicConfidence: ArabicConfidence;
    diySafetyClass: DiySafetyClass;
    safetyReviewComplete: boolean;
    uniqueTitleEn: boolean;
    uniqueTitleAr: boolean;
    uniqueMetaEn: boolean;
    uniqueMetaAr: boolean;
    duplicateSimilarityOk: boolean;
    claimScanOk: boolean;
    thinContentOk: boolean;
    humanApproved: boolean;
    /** Default LEGACY_COMPAT preserves A3.x grandfathered behavior. */
    contentMode?: ContentEvalMode;
  };

export type GateFailure = {
  code: string;
  message: string;
};

export type GateResult = {
  eligible: boolean;
  coveredOps: boolean;
  qualityStatus: ServiceLocationQualityStatus;
  failures: GateFailure[];
  indexableEn: boolean;
  indexableAr: boolean;
  pairIndexable: boolean;
};

export type EffectiveOps = {
  bookingEnabled: boolean;
  amcAvailable: boolean;
  emergencyAvailable: boolean;
  diyVisible: boolean;
  diyRestricted: boolean;
  riskLevel: RiskLevel;
};

export type DiyInheritance = {
  source: "service-offering";
  guideId: string | null;
  guideSlug: string | null;
  riskLevel: RiskLevel;
  safetyClass: DiySafetyClass;
  visible: boolean;
  locationSpecificAllowed: "cta-chrome-only";
  technicalBodyInherited: boolean;
  safetyWeakened: boolean;
};

export type ImageInheritance = {
  src: string | null;
  source: "override" | "service" | "approved_fallback";
  alt: string;
  gatePass: boolean;
};

export type LocationRef = {
  slug: string;
  type: LocationType;
  nameEn: string;
  nameAr: string;
  parentNameEn?: string | null;
};
