import { can, canViewTasks, isStaffRole } from "@/lib/admin/rbac";
import { hasSection, insightsSections } from "@/lib/insights/rbac";
import { canViewIdentifiableJourney } from "@/lib/journey/rbac";
import { canUseInternalSopTools } from "@/lib/knowledge/access";
import type { JourneyScopeType } from "@/lib/journey/types";
import {
  COFOUNDER_TOOLS,
  isCofounderTool,
  isForbiddenCofounderTool,
  type CofounderToolName,
} from "@/lib/cofounder/types";

export function canUseCoFounder(role: string) {
  return isStaffRole(role) || role === "admin";
}

export function narrowerRole(sessionRole: string, frozenRole: string) {
  return insightsSections(sessionRole).length <= insightsSections(frozenRole).length ? sessionRole : frozenRole;
}

export function toolAllowed(role: string, tool: string): boolean {
  if (isForbiddenCofounderTool(tool)) return false;
  if (!isCofounderTool(tool)) return false;
  if (tool === "get_daily_brief") return canUseCoFounder(role);
  if (tool === "get_lead_summary" || tool === "get_hot_leads" || tool === "get_lead_quality") return can(role, "leads");
  if (tool === "get_quote_pipeline") return can(role, "quotes");
  if (tool === "get_booking_pipeline") return can(role, "bookings");
  if (tool === "get_work_order_status") return can(role, "work_orders");
  if (tool === "get_invoice_status" || tool === "get_payment_status") return can(role, "invoices");
  if (tool === "get_review_summary") return can(role, "reviews");
  if (tool === "get_qna_summary") return can(role, "questions");
  if (tool === "get_amc_expiring") return hasSection(role, "amc");
  if (tool === "get_service_performance") return hasSection(role, "services");
  if (tool === "get_location_performance") return hasSection(role, "locations");
  if (tool === "get_customer_journey") {
    return (
      canViewIdentifiableJourney(role, "lead") ||
      canViewIdentifiableJourney(role, "customer") ||
      canViewIdentifiableJourney(role, "booking") ||
      canViewIdentifiableJourney(role, "workOrder")
    );
  }
  if (tool === "get_sop" || tool === "search_internal_sop") return canUseInternalSopTools(role);
  if (tool === "get_followup_gaps") return can(role, "leads");
  if (tool === "get_priority_actions") return canUseCoFounder(role);
  if (tool === "propose_task" || tool === "propose_follow_up") {
    if (role === "content_manager") return false;
    return canViewTasks(role);
  }
  if (tool === "propose_draft_quote") return can(role, "quotes");
  if (tool === "propose_draft_invoice") return can(role, "invoices");
  return false;
}

export function toolsForRole(role: string): CofounderToolName[] {
  return COFOUNDER_TOOLS.filter((tool) => toolAllowed(role, tool));
}

export function toolsForSession(sessionRole: string, frozenRole: string): CofounderToolName[] {
  return COFOUNDER_TOOLS.filter((tool) => toolAllowed(sessionRole, tool) && toolAllowed(frozenRole, tool));
}

export function journeyTypeAllowed(role: string, type: string): type is JourneyScopeType {
  if (type !== "customer" && type !== "lead" && type !== "booking" && type !== "workOrder") return false;
  return canViewIdentifiableJourney(role, type);
}
