import {
  hasSpamLexicon,
  isClearRequirement,
  isValidEmail,
  isValidUaePhone,
  photoCount,
  type Reason,
} from "@/lib/quality/signals";

export type ScoreInput = {
  phone: string;
  email?: string | null;
  requirement: string;
  serviceId?: string | null;
  locationId?: string | null;
  city?: string | null;
  area?: string | null;
  propertyType?: string | null;
  source: string;
  photos: string;
  hasBooking: boolean;
  eventNames: string[];
  duplicateRequirementCount: number;
  burstCount: number;
};

export function buildReasons(input: ScoreInput): Reason[] {
  const reasons: Reason[] = [{ code: "base", points: 40, label: "Base score" }];
  const events = new Set(input.eventNames);

  if (isValidUaePhone(input.phone)) {
    reasons.push({ code: "valid_phone", points: 12, label: "UAE-shaped phone" });
  } else {
    reasons.push({ code: "invalid_phone", points: -8, label: "Phone is not UAE-shaped", spam: true });
  }

  if (isValidEmail(input.email)) {
    reasons.push({ code: "valid_email", points: 8, label: "Email present and well-formed" });
  }

  if (isClearRequirement(input.requirement)) {
    reasons.push({ code: "clear_requirement", points: 10, label: "Requirement is specific" });
  }

  if (input.serviceId) reasons.push({ code: "service_identified", points: 8, label: "Service identified" });
  if (input.locationId) reasons.push({ code: "emirate", points: 6, label: "Emirate provided" });
  if (input.city?.trim()) reasons.push({ code: "city", points: 4, label: "City provided" });
  if (input.area?.trim()) reasons.push({ code: "area", points: 4, label: "Area provided" });
  if (input.propertyType?.trim()) {
    reasons.push({ code: "property_info", points: 4, label: "Property type provided" });
  }
  if (input.source === "quote") reasons.push({ code: "quote_request", points: 8, label: "Quote request" });
  if (input.source === "booking" || input.hasBooking) {
    reasons.push({ code: "booking_request", points: 10, label: "Booking request" });
  }
  if (photoCount(input.photos) >= 1) {
    reasons.push({ code: "photo_submitted", points: 6, label: "Photo submitted" });
  }

  const aiMessages = input.eventNames.filter((n) => n === "AI_MESSAGE").length;
  if (aiMessages >= 2 && events.has("AI_HANDOVER")) {
    reasons.push({ code: "ai_meaningful", points: 8, label: "Meaningful AI interaction" });
  }
  if (events.has("SERVICE_VIEW") || events.has("LOCATION_VIEW")) {
    reasons.push({ code: "repeat_engagement", points: 6, label: "Viewed a service or location first" });
  }
  if (events.has("WHATSAPP_CLICK") || events.has("PHONE_CLICK")) {
    reasons.push({ code: "contact_intent", points: 4, label: "Clicked WhatsApp or phone" });
  }

  if (input.duplicateRequirementCount >= 2) {
    reasons.push({
      code: "identical_requirement",
      points: -10,
      label: "Same requirement text on other leads in 24h",
      spam: true,
    });
  }
  if (input.burstCount >= 4) {
    reasons.push({
      code: "submission_burst",
      points: -15,
      label: "Four or more submissions in 10 minutes",
      spam: true,
    });
  }
  if (hasSpamLexicon(input.requirement)) {
    reasons.push({ code: "spam_lexicon", points: -12, label: "Requirement matches spam lexicon", spam: true });
  }

  return reasons;
}

export function scoreFromReasons(reasons: Reason[]) {
  const raw = reasons.reduce((sum, reason) => sum + reason.points, 0);
  return Math.max(0, Math.min(100, raw));
}

export function classify(score: number, reasons: Reason[]) {
  const spamSignals = reasons.filter((reason) => reason.spam).length;
  if (spamSignals >= 3) return "SPAM" as const;
  if (spamSignals >= 1) return "REVIEW" as const;
  if (score >= 80) return "HOT" as const;
  if (score >= 60) return "WARM" as const;
  return "NORMAL" as const;
}
