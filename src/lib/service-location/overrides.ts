import type { RiskLevel } from "@prisma/client";
import type { EffectiveOps, OverrideInput } from "./types";

function inheritBoolean(override: boolean | null | undefined, fallback: boolean) {
  return override == null ? fallback : override;
}

/** Overrides may restrict DIY visibility. They must never weaken service risk. */
export function resolveEffectiveOps(input: OverrideInput): EffectiveOps {
  const bookingEnabled = inheritBoolean(input.bookingEnabledOverride, input.serviceBookingEnabled);
  const amcAvailable = inheritBoolean(input.amcAvailableOverride, input.serviceAmcAvailable);
  const emergencyAvailable = inheritBoolean(input.emergencyAvailableOverride, input.serviceEmergencyAvailable);
  const diyVisible = input.serviceDiyAvailable && input.serviceRiskLevel !== "red" && !input.diyRestricted;
  return {
    bookingEnabled,
    amcAvailable,
    emergencyAvailable,
    diyVisible,
    diyRestricted: input.diyRestricted,
    riskLevel: input.serviceRiskLevel,
  };
}

export function wouldWeakenSafety(args: {
  serviceRiskLevel: RiskLevel;
  attemptedRiskLevel?: RiskLevel | null;
  attemptedDiyAvailable?: boolean | null;
}): boolean {
  const rank: Record<RiskLevel, number> = { green: 0, yellow: 1, red: 2 };
  if (args.attemptedRiskLevel && rank[args.attemptedRiskLevel] < rank[args.serviceRiskLevel]) return true;
  if (args.serviceRiskLevel === "red" && args.attemptedDiyAvailable === true) return true;
  return false;
}
