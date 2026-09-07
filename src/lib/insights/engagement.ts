/** Distinct visitor with ≥1 of these in range is engaged. PAGE_VIEW alone is not. */
export const ENGAGED_EVENT_NAMES = [
  "SERVICE_VIEW",
  "LOCATION_VIEW",
  "DIY_VIEW",
  "AI_OPEN",
  "AI_MESSAGE",
  "AI_SERVICE_SUGGESTION",
  "AI_HANDOVER",
  "QUOTE_START",
  "BOOKING_START",
  "WHATSAPP_CLICK",
  "PHONE_CLICK",
  "EMAIL_CLICK",
] as const;

export type EngagedEventName = (typeof ENGAGED_EVENT_NAMES)[number];

export function isEngagedEvent(name: string) {
  return (ENGAGED_EVENT_NAMES as readonly string[]).includes(name);
}
