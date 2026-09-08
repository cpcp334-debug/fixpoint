import type { PrismaClient, AutomationTrigger } from "@prisma/client";
import type { AutomationAction, AutomationCondition } from "./types";

export type SeedRule = {
  key: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  delaySeconds: number;
  priority: number;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
};

/** Example rules. Always persisted disabled in 2F.5.1. */
export const EXAMPLE_AUTOMATION_RULES: SeedRule[] = [
  {
    key: "hot-lead-sales-followup",
    name: "HOT lead → sales + urgent follow-up",
    description: "Assign sales and create an urgent follow-up when a lead becomes HOT.",
    trigger: "HOT_LEAD",
    delaySeconds: 0,
    priority: 10,
    conditions: [],
    actions: [
      { type: "ASSIGN_STAFF", role: "sales", target: "lead" },
      { type: "CREATE_FOLLOW_UP", title: "Urgent HOT lead follow-up", dueInHours: 2, priority: "urgent" },
    ],
  },
  {
    key: "quote-sent-followup",
    name: "Quote sent follow-up",
    description: "If a sent quote is still not accepted after the delay, create a follow-up task.",
    trigger: "QUOTE_SENT",
    delaySeconds: 48 * 60 * 60,
    priority: 20,
    conditions: [{ field: "status", op: "neq", value: "ACCEPTED" }],
    actions: [{ type: "CREATE_FOLLOW_UP", title: "Follow up on sent quotation", dueInHours: 24 }],
  },
  {
    key: "booking-confirmed-wo-prep",
    name: "Booking confirmed → work-order prep task",
    description: "Create a preparation task after human confirmation. Does not create a work order.",
    trigger: "BOOKING_CONFIRMED",
    delaySeconds: 0,
    priority: 30,
    conditions: [],
    actions: [{ type: "CREATE_WORK_ORDER_TASK", title: "Prepare work order" }],
  },
  {
    key: "wo-completed-invoice-review",
    name: "Work order completed → invoice + review tasks",
    description: "Create invoice and review-request tasks. Does not issue an invoice.",
    trigger: "WORK_ORDER_COMPLETED",
    delaySeconds: 0,
    priority: 40,
    conditions: [],
    actions: [
      { type: "CREATE_INVOICE_TASK", title: "Create invoice" },
      { type: "CREATE_REVIEW_REQUEST_TASK", title: "Request customer review" },
    ],
  },
  {
    key: "low-rating-cs",
    name: "Low rating → customer service",
    description: "Create a CS task for ratings of 2 or below. Does not approve or hide the review.",
    trigger: "LOW_RATING_REVIEW",
    delaySeconds: 0,
    priority: 50,
    conditions: [{ field: "stars", op: "lte", value: 2 }],
    actions: [{ type: "CREATE_TASK", kind: "customer_service", title: "Low rating — contact customer" }],
  },
  {
    key: "amc-renewal-approaching",
    name: "AMC renewal approaching",
    description: "Create a sales renewal task when an AMC end date is approaching.",
    trigger: "AMC_RENEWAL_APPROACHING",
    delaySeconds: 0,
    priority: 60,
    conditions: [],
    actions: [
      { type: "CREATE_AMC_RENEWAL_TASK", title: "AMC renewal follow-up", dueInHours: 720 },
      { type: "ASSIGN_STAFF", role: "sales", target: "amc" },
    ],
  },
];

export async function upsertDisabledExampleRules(db: PrismaClient) {
  for (const rule of EXAMPLE_AUTOMATION_RULES) {
    await db.automationRule.upsert({
      where: { key: rule.key },
      create: {
        key: rule.key,
        name: rule.name,
        description: rule.description,
        enabled: false,
        priority: rule.priority,
        trigger: rule.trigger,
        delaySeconds: rule.delaySeconds,
        conditionsJson: JSON.stringify(rule.conditions),
        actionsJson: JSON.stringify(rule.actions),
        updatedBy: "system",
      },
      update: {
        name: rule.name,
        description: rule.description,
        priority: rule.priority,
        trigger: rule.trigger,
        delaySeconds: rule.delaySeconds,
        conditionsJson: JSON.stringify(rule.conditions),
        actionsJson: JSON.stringify(rule.actions),
        updatedBy: "system",
      },
    });
  }
}
