import type { RiskLevel } from "@prisma/client";
import type { DiyInheritance, DiySafetyClass } from "./types";
import { getDiyMatrixClass } from "./diy-matrix";

const RISK_TO_CLASS: Record<RiskLevel, DiySafetyClass> = {
  green: "GREEN",
  yellow: "YELLOW",
  red: "RED",
};

const CLASS_RANK: Record<DiySafetyClass, number> = {
  GREEN: 0,
  YELLOW: 1,
  RED: 2,
  REVIEW_REQUIRED: 3,
};

export function riskToSafetyClass(risk: RiskLevel): DiySafetyClass {
  return RISK_TO_CLASS[risk];
}

export type DiyResolveResult = DiyInheritance & {
  matrixClass: DiySafetyClass | null;
  matrixMapped: boolean;
  riskMatrixMismatch: boolean;
};

/**
 * DIY inheritance with 311-matrix authority for safety.
 * ServiceLocation cannot weaken safety. Does not rewrite Service.riskLevel.
 */
export function resolveDiyInheritance(args: {
  serviceRiskLevel: RiskLevel;
  serviceDiyAvailable: boolean;
  diyRestricted: boolean;
  serviceSlug?: string;
  matrixClass?: DiySafetyClass | null;
  guide?: { id: string; slug: string; riskLevel: RiskLevel; status: string } | null;
}): DiyResolveResult {
  const fromMatrix =
    args.matrixClass ?? (args.serviceSlug ? getDiyMatrixClass(args.serviceSlug) : null);
  const matrixMapped = fromMatrix != null;
  const serviceClass = riskToSafetyClass(args.serviceRiskLevel);
  const riskMatrixMismatch = Boolean(fromMatrix && fromMatrix !== serviceClass);

  // Matrix wins for A4.1 safety evaluation when present.
  let safetyClass: DiySafetyClass = fromMatrix ?? serviceClass;

  const guideRisk = args.guide?.riskLevel ?? args.serviceRiskLevel;
  const guideClass = riskToSafetyClass(guideRisk);

  // Never weaken below the stricter of matrix/service/guide
  const candidates = [safetyClass, serviceClass, guideClass];
  safetyClass = candidates.reduce((a, b) => (CLASS_RANK[b] > CLASS_RANK[a] ? b : a));

  // Location diyRestricted only hides DIY — cannot make RED safer
  const effectiveRisk: RiskLevel =
    safetyClass === "RED" || safetyClass === "REVIEW_REQUIRED"
      ? "red"
      : safetyClass === "YELLOW"
        ? "yellow"
        : "green";

  const safetyWeakened = CLASS_RANK[guideClass] < CLASS_RANK[serviceClass] && !fromMatrix;

  const visible =
    args.serviceDiyAvailable &&
    !args.diyRestricted &&
    safetyClass !== "RED" &&
    safetyClass !== "REVIEW_REQUIRED" &&
    effectiveRisk !== "red";

  return {
    source: "service-offering",
    guideId: args.guide?.id ?? null,
    guideSlug: args.guide?.slug ?? null,
    riskLevel: effectiveRisk,
    safetyClass,
    visible,
    locationSpecificAllowed: "cta-chrome-only",
    technicalBodyInherited: Boolean(args.guide),
    safetyWeakened,
    matrixClass: fromMatrix,
    matrixMapped,
    riskMatrixMismatch,
  };
}

/** RED / RR must never expose procedural DIY steps. */
export function diyProceduralAllowed(safetyClass: DiySafetyClass): boolean {
  return safetyClass === "GREEN";
}

export function diyLimitedGuidanceAllowed(safetyClass: DiySafetyClass): boolean {
  return safetyClass === "GREEN" || safetyClass === "YELLOW";
}
