export const ACTOR_KINDS = ["system", "customer", "staff", "transaction"] as const;
export type ActorKind = (typeof ACTOR_KINDS)[number];

export const TIMELINE_KINDS = [
  "visitor.first_seen",
  "visit.landing",
  "visit.last_touch",
  "visit.important_view",
  "ai.opened",
  "ai.summary",
  "ai.suggestion",
  "ai.handover",
  "lead.created",
  "lead.scored",
  "lead.override",
  "quote.created",
  "quote.sent",
  "quote.decided",
  "quote.status_current",
  "booking.requested",
  "booking.confirmed",
  "booking.assigned",
  "booking.status_current",
  "work_order.created",
  "work_order.started",
  "work_order.qc",
  "work_order.completed",
  "work_order.status_current",
  "invoice.created",
  "invoice.status_current",
  "payment.recorded",
  "review.submitted",
  "amc.active",
  "audit.historical",
] as const;
export type TimelineKind = (typeof TIMELINE_KINDS)[number];

export type TimelineCertainty = "current" | "historical";

export type TimelineFact = Record<string, string | number | boolean | null>;

export type TimelineItem = {
  id: string;
  kind: TimelineKind;
  occurredAt: Date;
  actorKind: ActorKind;
  actor?: string;
  entity: string;
  entityId: string;
  title: string;
  certainty: TimelineCertainty;
  facts: TimelineFact;
  href?: string;
};

export type JourneyScopeType = "customer" | "lead" | "booking" | "workOrder";

export type JourneyScope = {
  type: JourneyScopeType;
  id: string;
};

export type LeadQualitySnapshot = {
  leadId: string;
  score: number;
  systemClass: string;
  humanClass: string | null;
  effectiveClass: string;
  reasons: Array<{ code: string; points: number; label: string }>;
  computedAt: Date;
  overrideAt: Date | null;
};

export type JourneyPage = {
  items: TimelineItem[];
  quality: LeadQualitySnapshot[];
  optedOut: boolean;
  page: number;
  pageSize: number;
  total: number;
};

export const JOURNEY_PAGE_SIZE = 50;
export const ANALYTICS_EVENT_CAP = 40;

export function journeyPageFromSearch(raw?: string) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}
