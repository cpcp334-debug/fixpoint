import type { RiskLevel } from "@prisma/client";
import type { DiyInheritance, DiySafetyClass } from "./types";

const RISK_TO_CLASS: Record<RiskLevel, DiySafetyClass> = {
  green: "GREEN",
  yellow: "YELLOW",
  red: "RED",
};

export function riskToSafetyClass(risk: RiskLevel): DiySafetyClass {
  return RISK_TO_CLASS[risk];
}

export function resolveDiyInheritance(args: {
  serviceRiskLevel: RiskLevel;
  serviceDiyAvailable: boolean;
  diyRestricted: boolean;
  matrixClass?: DiySafetyClass | null;
  guide?: { id: string; slug: string; riskLevel: RiskLevel; status: string } | null;
}): DiyInheritance {
  const matrix = args.matrixClass ?? riskToSafetyClass(args.serviceRiskLevel);
  const guideRisk = args.guide?.riskLevel ?? args.serviceRiskLevel;
  const rank: Record<RiskLevel, number> = { green: 0, yellow: 1, red: 2 };
  const effectiveRisk = rank[guideRisk] > rank[args.serviceRiskLevel] ? guideRisk : args.serviceRiskLevel;
  const safetyClass =
    matrix === "REVIEW_REQUIRED" || matrix === "RED" || effectiveRisk === "red"
      ? matrix === "REVIEW_REQUIRED"
        ? "REVIEW_REQUIRED"
        : "RED"
      : riskToSafetyClass(effectiveRisk);
  const safetyWeakened = rank[effectiveRisk] < rank[args.serviceRiskLevel];
  const visible =
    args.serviceDiyAvailable &&
    !args.diyRestricted &&
    effectiveRisk !== "red" &&
    safetyClass !== "RED" &&
    safetyClass !== "REVIEW_REQUIRED";
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
  };
}
