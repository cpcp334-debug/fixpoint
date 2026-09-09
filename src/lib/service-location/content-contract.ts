/**
 * A4.1 typed contentJson contract for Service×Location locales.
 * SEO shell stays on ServiceLocationI18n / revision snapshot root fields.
 * Structured MAIN/AEO/GEO/DIY/FAQ/EXPERT live under contentJson.
 */

export const CONTENT_JSON_VERSION = 1 as const;

export type ContentLocale = "en" | "ar";

export type FaqApprovalState = "draft" | "approved" | "rejected";

export type MainContentBlock = {
  serviceExplanation: string;
  problems: string[];
  symptomsUseCases: string[];
  process: string[];
  propertyTypes: string[];
  professionalRecommendation: string;
};

export type AeoContentBlock = {
  directAnswer: string;
  whatIs: string;
  canIDoIt: string;
  whenCallProfessional: string;
  availabilityAnswer: string;
  bookingAnswer: string;
  emergencyAnswer: string;
  amcAnswer: string;
};

export type GeoContentBlock = {
  emirate: string;
  city: string;
  community: string;
  localInfo: string;
  approvedLocalContext: string;
  coverageStatement: string;
};

export type DiyContentBlock = {
  canonicalGuideSlug: string | null;
  safetyState: "GREEN" | "YELLOW" | "RED" | "REVIEW_REQUIRED";
  allowedBlocks: string[];
  safeSelfChecks: string[];
  tools: string[];
  steps: string[];
  stopConditions: string[];
  whatNotToDo: string[];
  safetyNotes: string[];
  professionalFallback: string;
};

export type FaqContentItem = {
  question: string;
  answer: string;
  locale: ContentLocale;
  approvalState: FaqApprovalState;
  category?: "service" | "location" | "booking" | "safety" | "emergency" | "amc";
};

export type ExpertCtaBlock = {
  helpSummary: string;
  quoteCta: boolean;
  bookingCta: boolean;
  whatsappCta: boolean;
  phoneCta: boolean;
  aiCta: boolean;
  emergencyCta: boolean;
  amcCta: boolean;
};

export type RelatedContentMeta = {
  relatedServiceSlugs: string[];
  relatedLocationSlugs: string[];
};

export type ServiceLocationContentJson = {
  version: typeof CONTENT_JSON_VERSION;
  main: MainContentBlock;
  aeo: AeoContentBlock;
  geo: GeoContentBlock;
  diy: DiyContentBlock;
  faq: FaqContentItem[];
  expert: ExpertCtaBlock;
  related?: RelatedContentMeta;
};

export function emptyMain(): MainContentBlock {
  return {
    serviceExplanation: "",
    problems: [],
    symptomsUseCases: [],
    process: [],
    propertyTypes: [],
    professionalRecommendation: "",
  };
}

export function emptyAeo(): AeoContentBlock {
  return {
    directAnswer: "",
    whatIs: "",
    canIDoIt: "",
    whenCallProfessional: "",
    availabilityAnswer: "",
    bookingAnswer: "",
    emergencyAnswer: "",
    amcAnswer: "",
  };
}

export function emptyGeo(): GeoContentBlock {
  return {
    emirate: "",
    city: "",
    community: "",
    localInfo: "",
    approvedLocalContext: "",
    coverageStatement: "",
  };
}

export function emptyDiy(): DiyContentBlock {
  return {
    canonicalGuideSlug: null,
    safetyState: "REVIEW_REQUIRED",
    allowedBlocks: [],
    safeSelfChecks: [],
    tools: [],
    steps: [],
    stopConditions: [],
    whatNotToDo: [],
    safetyNotes: [],
    professionalFallback: "",
  };
}

export function emptyExpert(): ExpertCtaBlock {
  return {
    helpSummary: "",
    quoteCta: true,
    bookingCta: false,
    whatsappCta: true,
    phoneCta: true,
    aiCta: true,
    emergencyCta: false,
    amcCta: false,
  };
}

export function emptyContentJson(): ServiceLocationContentJson {
  return {
    version: CONTENT_JSON_VERSION,
    main: emptyMain(),
    aeo: emptyAeo(),
    geo: emptyGeo(),
    diy: emptyDiy(),
    faq: [],
    expert: emptyExpert(),
    related: { relatedServiceSlugs: [], relatedLocationSlugs: [] },
  };
}
