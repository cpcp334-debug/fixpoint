import type { KnowledgeDocument } from "@prisma/client";
import { prisma } from "@/server/db";
import { SOP_AUDIENCES, type SopAudience } from "@/lib/knowledge/types";

export function parseAudiences(raw: string): SopAudience[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is SopAudience => (SOP_AUDIENCES as readonly string[]).includes(String(row)));
  } catch {
    return [];
  }
}

export function roleSopAudiences(role: string): SopAudience[] | "all" | "none" {
  if (role === "super_admin" || role === "admin" || role === "manager") return "all";
  if (role === "customer_service") return ["cs", "ops"];
  if (role === "sales") return ["sales", "ops"];
  if (role === "supervisor" || role === "technician") return ["ops"];
  return "none";
}

export function canUseInternalSopTools(role: string) {
  return roleSopAudiences(role) !== "none";
}

export function documentVisibleToRole(doc: { audienceJson: string }, role: string) {
  const allowed = roleSopAudiences(role);
  if (allowed === "none") return false;
  const audiences = parseAudiences(doc.audienceJson);
  if (role === "technician" && audiences.includes("management")) return false;
  if (allowed === "all") return true;
  return audiences.some((row) => allowed.includes(row));
}

/** Technician: ops only, never management, and category/service must match skills or assigned work. */
export async function technicianMayReadSop(
  session: { staffId: string | null },
  doc: { audienceJson: string; categorySlug: string; serviceSlug: string },
) {
  if (!documentVisibleToRole(doc, "technician")) return false;
  const general = !doc.categorySlug && !doc.serviceSlug;
  if (general) return true;
  if (!session.staffId) return false;

  const [skills, workOrders] = await Promise.all([
    prisma.staffSkill.findMany({ where: { staffId: session.staffId }, select: { categorySlug: true } }),
    prisma.workOrder.findMany({
      where: { technicianId: session.staffId },
      select: { service: { select: { slug: true, category: { select: { slug: true } } } } },
      take: 50,
    }),
  ]);
  const categories = new Set(skills.map((row) => row.categorySlug).filter(Boolean));
  const services = new Set<string>();
  for (const row of workOrders) {
    if (row.service?.slug) services.add(row.service.slug);
    if (row.service?.category.slug) categories.add(row.service.category.slug);
  }
  if (doc.categorySlug && categories.has(doc.categorySlug)) return true;
  if (doc.serviceSlug && services.has(doc.serviceSlug)) return true;
  if (doc.serviceSlug) {
    const service = await prisma.service.findFirst({
      where: { slug: doc.serviceSlug },
      select: { category: { select: { slug: true } } },
    });
    if (service && categories.has(service.category.slug)) return true;
  }
  return false;
}

export async function sessionMayReadSop(
  session: { role: string; frozenRole?: string; staffId: string | null },
  doc: Pick<KnowledgeDocument, "audienceJson" | "categorySlug" | "serviceSlug">,
) {
  const roles = [session.role, session.frozenRole || session.role];
  for (const role of roles) {
    if (role === "technician") {
      if (!(await technicianMayReadSop(session, doc))) return false;
      continue;
    }
    if (!documentVisibleToRole(doc, role)) return false;
  }
  return true;
}
