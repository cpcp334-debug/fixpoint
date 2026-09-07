export const STAFF_ROLES = [
  "super_admin",
  "manager",
  "customer_service",
  "sales",
  "supervisor",
  "technician",
  "content_manager",
] as const;

export type StaffRoleName = (typeof STAFF_ROLES)[number];

export type AdminPermission =
  | "dashboard"
  | "leads"
  | "customers"
  | "bookings"
  | "work_orders"
  | "reviews"
  | "questions"
  | "services"
  | "locations"
  | "diy"
  | "quotes"
  | "invoices"
  | "pricing"
  | "exports"
  | "audit"
  | "staff";

const ALL: AdminPermission[] = [
  "dashboard",
  "leads",
  "customers",
  "bookings",
  "work_orders",
  "reviews",
  "questions",
  "services",
  "locations",
  "diy",
  "quotes",
  "invoices",
  "pricing",
  "exports",
  "audit",
  "staff",
];

const ROLE_PERMS: Record<StaffRoleName, AdminPermission[]> = {
  super_admin: ALL,
  manager: ALL.filter((p) => p !== "staff"),
  customer_service: ["dashboard", "leads", "customers", "bookings", "reviews", "questions"],
  sales: ["dashboard", "leads", "customers", "bookings", "quotes"],
  supervisor: ["dashboard", "bookings", "work_orders"],
  technician: ["dashboard", "work_orders"],
  content_manager: ["dashboard", "reviews", "questions", "services", "locations", "diy"],
};

export function isStaffRole(role: string): role is StaffRoleName {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

export function can(role: string, permission: AdminPermission) {
  if (role === "admin") return can("super_admin", permission);
  if (!isStaffRole(role)) return false;
  return ROLE_PERMS[role].includes(permission);
}

export function canOverrideLeadQuality(role: string) {
  return can(role, "leads");
}

/** Set or restore SPAM quarantine. */
export function canManageLeadSpam(role: string) {
  return role === "super_admin" || role === "admin" || role === "manager";
}

export function exportAllowed(role: string, dataset: string) {
  if (role === "technician") return false;
  if (dataset === "staff") return can(role, "staff");
  if (dataset === "invoices") return can(role, "invoices");
  if (dataset === "quotes") return can(role, "quotes");
  if (dataset === "customers") return can(role, "customers");
  if (dataset === "leads") return can(role, "leads");
  if (dataset === "bookings") return can(role, "bookings");
  if (dataset === "work_orders") return can(role, "work_orders");
  if (dataset === "reviews") return can(role, "reviews");
  if (dataset === "questions") return can(role, "questions");
  if (dataset === "services") return can(role, "services");
  return can(role, "exports");
}

export function roleLabel(role: string) {
  return role.replaceAll("_", " ");
}
