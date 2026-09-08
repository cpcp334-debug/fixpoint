export const COFOUNDER_TOOLS = [
  "get_daily_brief",
  "get_lead_summary",
  "get_hot_leads",
  "get_lead_quality",
  "get_quote_pipeline",
  "get_booking_pipeline",
  "get_work_order_status",
  "get_invoice_status",
  "get_payment_status",
  "get_review_summary",
  "get_qna_summary",
  "get_amc_expiring",
  "get_service_performance",
  "get_location_performance",
  "get_customer_journey",
  "get_sop",
  "search_internal_sop",
  "get_followup_gaps",
  "get_priority_actions",
  "propose_follow_up",
  "propose_task",
  "propose_draft_quote",
  "propose_draft_invoice",
] as const;

export type CofounderToolName = (typeof COFOUNDER_TOOLS)[number];

export const FORBIDDEN_COFOUNDER_TOOLS = [
  "create_task",
  "create_followup_task",
  "draft_quote",
  "draft_invoice",
  "confirm_booking",
  "modify_price",
  "approve_review",
  "reject_review",
  "create_refund",
  "mark_invoice_paid",
  "update_automation_rule",
  "search_private_knowledge",
] as const;

export type ForbiddenCofounderTool = (typeof FORBIDDEN_COFOUNDER_TOOLS)[number];

export const MAX_USER_MESSAGE = 2000;
export const MAX_TURNS = 12;
export const COFOUNDER_TIMEOUT_MS = 15_000;

export type CofounderMessage = {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
};

export type CofounderSession = {
  id: string;
  email: string;
  role: string;
  staffId: string | null;
  frozenRole: string;
  conversationId?: string;
};

export type ToolArgs = Record<string, unknown>;

export type ToolResult = {
  ok: boolean;
  denied?: boolean;
  error?: string;
  data?: unknown;
};

export function isCofounderTool(name: string): name is CofounderToolName {
  return (COFOUNDER_TOOLS as readonly string[]).includes(name);
}

export function isForbiddenCofounderTool(name: string): name is ForbiddenCofounderTool {
  return (FORBIDDEN_COFOUNDER_TOOLS as readonly string[]).includes(name);
}
