/**
 * A4.2 typed DiyGuide.profileJson contract (versioned).
 * Additive: structured steps (Batch 2); string[] still accepted by parser.
 */

export const DIY_PROFILE_JSON_VERSION = 1 as const;

export type DiyProfileLifecycleStatus =
  | "draft"
  | "safety_review"
  | "translation_review"
  | "approved"
  | "published"
  | "archived";

export type DiyArabicReviewStatus =
  | "not_started"
  | "translation_review"
  | "ready_for_translation"
  | "reviewed";

export type DiyMatrixSafety = "GREEN" | "YELLOW" | "RED" | "REVIEW_REQUIRED";

export type DiyProfileFaq = {
  question: string;
  answer: string;
};

export type DiyProfileAeo = {
  whatIs: string;
  canIDoIt: string;
  checkFirst: string;
  usualCauses: string;
  whenCallProfessional: string;
};

/** Canonical step shape (Batch 2+). Parser normalizes legacy string[] into this. */
export type DiyProfileStep = {
  action: string;
  expectedResult: string;
  stopCondition: string;
};

export type DiyGuideProfileJson = {
  version: typeof DIY_PROFILE_JSON_VERSION;
  locale: "en";
  matrixSafety: DiyMatrixSafety;
  main: {
    overview: string;
    /** Symptoms / use cases (YELLOW+; optional for GREEN Batch 1). */
    symptoms: string;
    canIDoIt: string;
    skillLevel: string;
    estimatedTime: string;
  };
  safety: {
    safetyLevel: DiyMatrixSafety;
    warnings: string[];
    stopConditions: string[];
    dontDo: string[];
  };
  tools: {
    tools: string[];
    materials: string[];
    prerequisites: string[];
  };
  checks: {
    safeChecks: string[];
    expectedObservations: string[];
  };
  troubleshooting: {
    commonCauses: string[];
    troubleshooting: string[];
  };
  steps: DiyProfileStep[];
  professional: {
    whenToCallProfessional: string;
    professionalFallback: string;
  };
  faq: DiyProfileFaq[];
  relatedServiceSlugs: string[];
  relatedGuideSlugs: string[];
  aeo: DiyProfileAeo;
  metadata: {
    status: DiyProfileLifecycleStatus;
    createdBy: string;
    updatedBy: string;
    safetyReviewedBy: string | null;
    safetyReviewedAt: string | null;
    arabicReviewStatus: DiyArabicReviewStatus;
    batch: string | null;
    authored: boolean;
  };
};

export function emptyDiyProfile(args: {
  matrixSafety: DiyMatrixSafety;
  status?: DiyProfileLifecycleStatus;
  batch?: string | null;
  authored?: boolean;
}): DiyGuideProfileJson {
  return {
    version: DIY_PROFILE_JSON_VERSION,
    locale: "en",
    matrixSafety: args.matrixSafety,
    main: { overview: "", symptoms: "", canIDoIt: "", skillLevel: "", estimatedTime: "" },
    safety: { safetyLevel: args.matrixSafety, warnings: [], stopConditions: [], dontDo: [] },
    tools: { tools: [], materials: [], prerequisites: [] },
    checks: { safeChecks: [], expectedObservations: [] },
    troubleshooting: { commonCauses: [], troubleshooting: [] },
    steps: [],
    professional: { whenToCallProfessional: "", professionalFallback: "" },
    faq: [],
    relatedServiceSlugs: [],
    relatedGuideSlugs: [],
    aeo: { whatIs: "", canIDoIt: "", checkFirst: "", usualCauses: "", whenCallProfessional: "" },
    metadata: {
      status: args.status ?? "draft",
      createdBy: "system",
      updatedBy: "system",
      safetyReviewedBy: null,
      safetyReviewedAt: null,
      arabicReviewStatus: "not_started",
      batch: args.batch ?? null,
      authored: args.authored ?? false,
    },
  };
}

/** Normalize legacy string steps or structured steps into DiyProfileStep[]. */
export function normalizeProfileSteps(raw: unknown): DiyProfileStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") {
        const action = item.trim();
        if (!action) return null;
        return {
          action,
          expectedResult: "Condition improves or remains stable without new hazards.",
          stopCondition: "Stop if the next action requires force, live power, gas, or sealed-system access.",
        };
      }
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const action = typeof o.action === "string" ? o.action : "";
        if (!action.trim()) return null;
        return {
          action: action.trim(),
          expectedResult: typeof o.expectedResult === "string" ? o.expectedResult : "",
          stopCondition: typeof o.stopCondition === "string" ? o.stopCondition : "",
        };
      }
      return null;
    })
    .filter((x): x is DiyProfileStep => Boolean(x));
}

export function stepsToPlainText(steps: DiyProfileStep[]): string[] {
  return steps.map((s) => {
    const parts = [s.action];
    if (s.expectedResult) parts.push(`Expected: ${s.expectedResult}`);
    if (s.stopCondition) parts.push(`Stop if: ${s.stopCondition}`);
    return parts.join(" ");
  });
}
