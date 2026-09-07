import { can } from "@/lib/admin/rbac";

export type InsightsSection =
  | "visitors"
  | "funnel"
  | "quality"
  | "quotes"
  | "bookings"
  | "operations"
  | "invoices"
  | "reviews"
  | "amc"
  | "services"
  | "locations"
  | "sources";

export function canViewAnalytics(role: string) {
  if (role === "technician" || role === "content_manager") return false;
  if (!can(role, "dashboard")) return false;
  return (
    can(role, "leads") ||
    can(role, "bookings") ||
    can(role, "quotes") ||
    can(role, "invoices") ||
    can(role, "work_orders")
  );
}

export function insightsSections(role: string): InsightsSection[] {
  if (!canViewAnalytics(role)) return [];
  if (role === "supervisor") return ["bookings", "operations"];
  if (role === "sales") {
    return ["visitors", "funnel", "quality", "quotes", "bookings", "services", "locations", "sources"];
  }
  if (role === "customer_service") {
    return ["visitors", "funnel", "quality", "bookings", "reviews", "services", "locations", "sources"];
  }
  return [
    "visitors",
    "funnel",
    "quality",
    "quotes",
    "bookings",
    "operations",
    "invoices",
    "reviews",
    "amc",
    "services",
    "locations",
    "sources",
  ];
}

export function hasSection(role: string, section: InsightsSection) {
  return insightsSections(role).includes(section);
}
