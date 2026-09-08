import type { AutomationTrigger } from "@prisma/client";

export const AUTOMATION_TRIGGERS = [
  "NEW_LEAD",
  "HOT_LEAD",
  "QUOTE_CREATED",
  "QUOTE_SENT",
  "QUOTE_ACCEPTED",
  "QUOTE_REJECTED",
  "BOOKING_REQUESTED",
  "BOOKING_CONFIRMED",
  "BOOKING_RESCHEDULED",
  "WORK_ORDER_ASSIGNED",
  "WORK_ORDER_STARTED",
  "WORK_ORDER_COMPLETED",
  "INVOICE_ISSUED",
  "INVOICE_PAID",
  "REVIEW_RECEIVED",
  "LOW_RATING_REVIEW",
  "QNA_RECEIVED",
  "AMC_RENEWAL_APPROACHING",
] as const;

export type AutomationTriggerName = (typeof AUTOMATION_TRIGGERS)[number];

export const SUBJECT_TYPES = [
  "Lead",
  "Quote",
  "Booking",
  "WorkOrder",
  "Invoice",
  "Review",
  "Question",
  "AmcContract",
] as const;

export type AutomationSubjectType = (typeof SUBJECT_TYPES)[number];

export const CONDITION_OPS = ["eq", "neq", "lte", "gte", "in", "exists"] as const;
export type ConditionOp = (typeof CONDITION_OPS)[number];

export const CONDITION_FIELDS = [
  "qualityClass",
  "status",
  "source",
  "urgency",
  "serviceId",
  "locationId",
  "humanApproved",
  "type",
  "priority",
  "stars",
  "moderationStatus",
  "daysUntilEnd",
  "endDate",
] as const;

export type ConditionField = (typeof CONDITION_FIELDS)[number];

export type AutomationCondition = {
  field: string;
  op: ConditionOp;
  value?: unknown;
};

export const ALLOWED_ACTIONS = [
  "CREATE_TASK",
  "CREATE_FOLLOW_UP",
  "CREATE_WORK_ORDER_TASK",
  "CREATE_INVOICE_TASK",
  "CREATE_REVIEW_REQUEST_TASK",
  "CREATE_AMC_RENEWAL_TASK",
  "ADD_NOTE",
  "ASSIGN_STAFF",
  "SEND_NOTIFICATION",
] as const;

export type AllowedActionType = (typeof ALLOWED_ACTIONS)[number];

export const FORBIDDEN_ACTIONS = [
  "CONFIRM_BOOKING",
  "MODIFY_PRICE",
  "SET_PRICE",
  "APPROVE_REVIEW",
  "REJECT_REVIEW",
  "DELETE_CUSTOMER",
  "CREATE_INVOICE",
  "CREATE_WORK_ORDER",
] as const;

export type ForbiddenActionType = (typeof FORBIDDEN_ACTIONS)[number];

export type AutomationAction = {
  type: string;
  title?: string;
  kind?: string;
  dueInHours?: number;
  note?: string;
  role?: string;
  target?: AssignTarget;
  channel?: NotificationChannel;
  audience?: "staff" | "customer";
  userId?: string;
  staffId?: string;
  priority?: string;
};

export type AssignTarget =
  | "lead"
  | "booking_technician"
  | "booking_supervisor"
  | "work_order_technician"
  | "work_order_supervisor"
  | "amc";

export type NotificationChannel = "in_app" | "email" | "whatsapp";

export type ActionResultStatus = "success" | "skipped" | "failed";

export type ActionResult = {
  type: string;
  status: ActionResultStatus;
  error?: string;
  resultRef?: string;
  retryable?: boolean;
};

export type ConditionDetail = {
  field: string;
  op: string;
  passed: boolean;
  reason?: string;
};

export type DomainEventInput = {
  trigger: AutomationTrigger;
  subjectType: AutomationSubjectType | string;
  subjectId: string;
  occurredAt?: Date;
  delaySeconds?: number;
  occurrenceKey?: string;
  payload?: Record<string, unknown>;
  ruleId?: string | null;
  maxAttempts?: number;
};

export function isTrigger(value: string): value is AutomationTriggerName {
  return (AUTOMATION_TRIGGERS as readonly string[]).includes(value);
}

export function isAllowedAction(value: string): value is AllowedActionType {
  return (ALLOWED_ACTIONS as readonly string[]).includes(value);
}

export function isForbiddenAction(value: string): value is ForbiddenActionType {
  return (FORBIDDEN_ACTIONS as readonly string[]).includes(value);
}

export function defaultSubjectType(trigger: AutomationTriggerName): AutomationSubjectType {
  if (trigger === "NEW_LEAD" || trigger === "HOT_LEAD") return "Lead";
  if (trigger.startsWith("QUOTE_")) return "Quote";
  if (trigger.startsWith("BOOKING_")) return "Booking";
  if (trigger.startsWith("WORK_ORDER_")) return "WorkOrder";
  if (trigger.startsWith("INVOICE_")) return "Invoice";
  if (trigger === "REVIEW_RECEIVED" || trigger === "LOW_RATING_REVIEW") return "Review";
  if (trigger === "QNA_RECEIVED") return "Question";
  return "AmcContract";
}
