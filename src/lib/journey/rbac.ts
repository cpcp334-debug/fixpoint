import { can } from "@/lib/admin/rbac";
import type { JourneyScopeType, TimelineKind } from "@/lib/journey/types";

export function canViewIdentifiableJourney(role: string, scope: JourneyScopeType) {
  if (role === "content_manager") return false;
  if (role === "technician") return scope === "workOrder";
  if (role === "admin") return can("super_admin", scopePermission(scope));
  return can(role, scopePermission(scope));
}

function scopePermission(scope: JourneyScopeType) {
  if (scope === "customer") return "customers" as const;
  if (scope === "lead") return "leads" as const;
  if (scope === "booking") return "bookings" as const;
  return "work_orders" as const;
}

export function kindAllowed(role: string, kind: TimelineKind) {
  if (role === "content_manager") return false;
  if (role === "super_admin" || role === "admin" || role === "manager") return true;

  if (role === "technician") {
    return kind.startsWith("work_order.") || kind.startsWith("booking.");
  }

  if (role === "supervisor") {
    return kind.startsWith("booking.") || kind.startsWith("work_order.") || kind === "audit.historical";
  }

  if (role === "sales") {
    if (kind.startsWith("invoice.") || kind === "payment.recorded") return false;
    if (kind === "work_order.qc") return false;
    if (kind === "amc.active") return false;
    return true;
  }

  if (role === "customer_service") {
    if (kind.startsWith("quote.") || kind.startsWith("invoice.") || kind === "payment.recorded") return false;
    if (kind === "amc.active") return false;
    return true;
  }

  return false;
}

export function maySeeLeadQuality(role: string) {
  return can(role, "leads");
}

export function maySeeInvoiceAmounts(role: string) {
  return can(role, "invoices");
}

export function mayLink(role: string, entity: string) {
  if (entity === "Lead") return can(role, "leads");
  if (entity === "Customer") return can(role, "customers");
  if (entity === "Booking") return can(role, "bookings");
  if (entity === "WorkOrder") return can(role, "work_orders");
  if (entity === "Quote") return can(role, "quotes");
  if (entity === "Invoice") return can(role, "invoices");
  if (entity === "Review") return can(role, "reviews");
  return false;
}
