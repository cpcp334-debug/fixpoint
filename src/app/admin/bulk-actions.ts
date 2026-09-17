"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { AdminPermission } from "@/lib/admin/rbac";
import { prisma } from "@/server/db";
import { requireStaff, revokeAllSessionsForUser } from "@/lib/admin/auth";
import { adminAudit } from "@/lib/admin/numbers";
import { str } from "@/lib/admin/forms";
import {
  revalidatePublicArticle,
  revalidatePublicDiy,
  revalidatePublicLocation,
  revalidatePublicService,
} from "@/lib/admin/revalidate-public";

export type BulkEntity =
  | "services"
  | "locations"
  | "articles"
  | "diy"
  | "gallery"
  | "service_pages"
  | "leads"
  | "bookings"
  | "quotes"
  | "work_orders"
  | "customers"
  | "reviews"
  | "questions"
  | "knowledge"
  | "invoices"
  | "amc"
  | "staff"
  | "automation"
  | "pricing"
  | "tasks";

export type BulkAction = "publish" | "hide" | "archive";

const ENTITY_PERM: Record<BulkEntity, AdminPermission> = {
  services: "services",
  locations: "locations",
  articles: "diy",
  diy: "diy",
  gallery: "diy",
  service_pages: "services",
  leads: "leads",
  bookings: "bookings",
  quotes: "quotes",
  work_orders: "work_orders",
  customers: "customers",
  reviews: "reviews",
  questions: "questions",
  knowledge: "knowledge",
  invoices: "invoices",
  amc: "amc",
  staff: "staff",
  automation: "automation",
  pricing: "pricing",
  tasks: "dashboard",
};

const MAX_IDS = 500;
const CUSTOMER_ARCHIVED = "[ARCHIVED]";
const CUSTOMER_HIDDEN = "[HIDDEN]";

function denyLogin(): never {
  redirect("/login");
}

function safeReturnTo(raw: string, fallback: string) {
  if (!raw.startsWith("/admin")) return fallback;
  if (raw.includes("//") || raw.includes("\\")) return fallback;
  return raw.slice(0, 500);
}

function parseIds(formData: FormData) {
  const ids = formData
    .getAll("ids")
    .map((v) => String(v).trim())
    .filter(Boolean);
  return [...new Set(ids)].slice(0, MAX_IDS);
}

function withFlash(returnTo: string, ok: string, extra?: Record<string, string>) {
  const url = new URL(returnTo, "http://local.invalid");
  url.searchParams.set("ok", ok);
  url.searchParams.delete("error");
  if (extra) {
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  }
  return `${url.pathname}${url.search}`;
}

function withError(returnTo: string, error: string) {
  const url = new URL(returnTo, "http://local.invalid");
  url.searchParams.set("error", error);
  url.searchParams.delete("ok");
  return `${url.pathname}${url.search}`;
}

async function actor(permission: AdminPermission) {
  const auth = await requireStaff(permission);
  if (!auth.session) denyLogin();
  if (!auth.ok) redirect("/admin");
  return auth.session;
}

function isSuperRole(role: string) {
  return role === "super_admin" || role === "admin";
}

async function protectLastSuperAdmin(idsToDeactivate: string[]) {
  const targets = await prisma.user.findMany({ where: { id: { in: idsToDeactivate } } });
  const supers = targets.filter((u) => u.active && isSuperRole(u.role));
  if (!supers.length) return { ok: true as const };
  const remaining = await prisma.user.count({
    where: {
      active: true,
      role: { in: ["super_admin", "admin"] },
      id: { notIn: supers.map((u) => u.id) },
    },
  });
  if (remaining === 0) return { ok: false as const };
  return { ok: true as const };
}

function stripCustomerMarkers(notes: string) {
  return notes
    .replaceAll(CUSTOMER_ARCHIVED, "")
    .replaceAll(CUSTOMER_HIDDEN, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function bulkManageAction(formData: FormData) {
  const entity = str(formData, "entity") as BulkEntity;
  const action = str(formData, "action") as BulkAction;
  const returnToRaw = str(formData, "returnTo") || `/admin/${entity === "service_pages" ? "service-pages" : entity}`;
  const returnTo = safeReturnTo(returnToRaw, "/admin");
  const ids = parseIds(formData);

  if (!(entity in ENTITY_PERM) || !["publish", "hide", "archive"].includes(action)) {
    redirect(withError(returnTo, "bulk_forbidden"));
  }
  if (!ids.length) redirect(withError(returnTo, "bulk_empty"));

  const session = await actor(ENTITY_PERM[entity]);
  let updated = 0;
  let skipped = 0;

  switch (entity) {
    case "services": {
      const rows = await prisma.service.findMany({
        where: { id: { in: ids } },
        include: { category: { select: { slug: true } } },
      });
      for (const row of rows) {
        const data =
          action === "publish"
            ? { status: "active" as const, indexable: true }
            : action === "hide"
              ? { status: "draft" as const, indexable: false }
              : { status: "archived" as const, indexable: false };
        await prisma.service.update({ where: { id: row.id }, data });
        revalidatePublicService(row.slug, row.category.slug);
        updated += 1;
      }
      revalidatePath("/admin/services");
      break;
    }
    case "locations": {
      const rows = await prisma.location.findMany({ where: { id: { in: ids } } });
      for (const row of rows) {
        if (action === "publish") {
          await prisma.location.update({
            where: { id: row.id },
            data: { status: "active", indexable: true, serves: true },
          });
        } else if (action === "hide") {
          // Keep active+serves master places; only drop indexability.
          if (row.serves || row.status === "active") {
            await prisma.location.update({ where: { id: row.id }, data: { indexable: false } });
          } else {
            await prisma.location.update({
              where: { id: row.id },
              data: { status: "draft", indexable: false },
            });
          }
        } else {
          // Soft-remove = archived, never hard-delete master places.
          await prisma.location.update({
            where: { id: row.id },
            data: { status: "archived", indexable: false },
          });
        }
        revalidatePublicLocation(row.slug);
        updated += 1;
      }
      revalidatePath("/admin/locations");
      break;
    }
    case "articles": {
      const rows = await prisma.article.findMany({ where: { id: { in: ids } } });
      for (const row of rows) {
        const data =
          action === "publish"
            ? { status: "published" as const, indexable: true, publishedAt: row.publishedAt || new Date() }
            : action === "hide"
              ? { status: "draft" as const, indexable: false }
              : { status: "archived" as const, indexable: false };
        await prisma.article.update({ where: { id: row.id }, data });
        revalidatePublicArticle(row.slug);
        updated += 1;
      }
      revalidatePath("/admin/articles");
      revalidatePath("/admin/blogs");
      revalidatePath("/admin/faqs");
      break;
    }
    case "gallery": {
      const rows = await prisma.mediaAsset.findMany({
        where: {
          id: { in: ids },
          conversationId: null,
          NOT: { storageKey: { startsWith: "uploads/private" } },
        },
      });
      for (const row of rows) {
        const data =
          action === "publish"
            ? { visibility: "public", status: "ready" }
            : action === "hide"
              ? { visibility: "private", status: "ready" }
              : { visibility: "private", status: "archived" };
        await prisma.mediaAsset.update({ where: { id: row.id }, data });
        updated += 1;
      }
      revalidatePath("/admin/gallery");
      break;
    }
    case "diy": {
      const rows = await prisma.diyGuide.findMany({ where: { id: { in: ids } } });
      for (const row of rows) {
        const data =
          action === "publish"
            ? {
                status: "published" as const,
                indexable: true,
                publishedAt: row.publishedAt || new Date(),
                profileStatus: "published" as const,
              }
            : action === "hide"
              ? { status: "draft" as const, indexable: false }
              : { status: "archived" as const, indexable: false, profileStatus: "archived" as const };
        await prisma.diyGuide.update({ where: { id: row.id }, data });
        revalidatePublicDiy(row.slug);
        updated += 1;
      }
      revalidatePath("/admin/diy");
      break;
    }
    case "service_pages": {
      const rows = await prisma.serviceLocation.findMany({ where: { id: { in: ids } } });
      for (const row of rows) {
        if (action === "publish") {
          if (!row.covered) {
            skipped += 1;
            continue;
          }
          await prisma.serviceLocation.update({
            where: { id: row.id },
            data: {
              coverageStatus: "published",
              indexable: true,
              publishedAt: row.publishedAt || new Date(),
            },
          });
        } else if (action === "hide") {
          await prisma.serviceLocation.update({
            where: { id: row.id },
            data: { indexable: false, indexableEn: false, indexableAr: false },
          });
        } else {
          await prisma.serviceLocation.update({
            where: { id: row.id },
            data: {
              coverageStatus: "archived",
              indexable: false,
              indexableEn: false,
              indexableAr: false,
            },
          });
        }
        updated += 1;
      }
      revalidatePath("/admin/service-pages");
      revalidatePath("/admin/service-pages/queue");
      break;
    }
    case "leads": {
      for (const id of ids) {
        const status =
          action === "publish" ? ("NEW" as const) : action === "hide" ? ("CANCELLED" as const) : ("LOST" as const);
        await prisma.lead.update({ where: { id }, data: { status } });
        updated += 1;
      }
      revalidatePath("/admin/leads");
      break;
    }
    case "bookings": {
      for (const id of ids) {
        const status =
          action === "publish"
            ? ("confirmed" as const)
            : action === "hide"
              ? ("cancelled" as const)
              : ("cancelled" as const);
        await prisma.booking.update({ where: { id }, data: { status } });
        updated += 1;
      }
      revalidatePath("/admin/bookings");
      break;
    }
    case "quotes": {
      for (const id of ids) {
        const status =
          action === "publish" ? ("SENT" as const) : action === "hide" ? ("CANCELLED" as const) : ("EXPIRED" as const);
        await prisma.quote.update({ where: { id }, data: { status } });
        updated += 1;
      }
      revalidatePath("/admin/quotes");
      break;
    }
    case "work_orders": {
      let allowedIds = ids;
      if (session.role === "technician") {
        const own = await prisma.workOrder.findMany({
          where: { id: { in: ids }, technicianId: session.staffId || "__none__" },
          select: { id: true },
        });
        allowedIds = own.map((r) => r.id);
        skipped += ids.length - allowedIds.length;
      }
      for (const id of allowedIds) {
        const status = action === "publish" ? "in_progress" : action === "hide" ? "cancelled" : "cancelled";
        await prisma.workOrder.update({ where: { id }, data: { status } });
        updated += 1;
      }
      revalidatePath("/admin/work-orders");
      break;
    }
    case "customers": {
      const rows = await prisma.customer.findMany({ where: { id: { in: ids } } });
      for (const row of rows) {
        const clean = stripCustomerMarkers(row.notes);
        const notes =
          action === "publish"
            ? clean
            : action === "hide"
              ? `${CUSTOMER_HIDDEN} ${clean}`.trim()
              : `${CUSTOMER_ARCHIVED} ${clean}`.trim();
        await prisma.customer.update({ where: { id: row.id }, data: { notes } });
        updated += 1;
      }
      revalidatePath("/admin/customers");
      break;
    }
    case "reviews": {
      for (const id of ids) {
        const status =
          action === "publish" ? ("APPROVED" as const) : action === "hide" ? ("HIDDEN" as const) : ("REJECTED" as const);
        await prisma.review.update({ where: { id }, data: { status } });
        updated += 1;
      }
      revalidatePath("/admin/reviews");
      break;
    }
    case "questions": {
      for (const id of ids) {
        const moderationStatus =
          action === "publish" ? ("APPROVED" as const) : action === "hide" ? ("HIDDEN" as const) : ("REJECTED" as const);
        const status = action === "publish" ? ("published" as const) : action === "hide" ? ("draft" as const) : ("archived" as const);
        await prisma.question.update({ where: { id }, data: { moderationStatus, status } });
        updated += 1;
      }
      revalidatePath("/admin/questions");
      break;
    }
    case "knowledge": {
      for (const id of ids) {
        const status = action === "publish" ? ("ACTIVE" as const) : action === "hide" ? ("DRAFT" as const) : ("ARCHIVED" as const);
        await prisma.knowledgeDocument.update({ where: { id }, data: { status } });
        updated += 1;
      }
      revalidatePath("/admin/knowledge");
      break;
    }
    case "invoices": {
      for (const id of ids) {
        const status =
          action === "publish" ? ("ISSUED" as const) : action === "hide" ? ("CANCELLED" as const) : ("CANCELLED" as const);
        await prisma.invoice.update({ where: { id }, data: { status } });
        updated += 1;
      }
      revalidatePath("/admin/invoices");
      break;
    }
    case "amc": {
      for (const id of ids) {
        const status = action === "publish" ? "active" : "inactive";
        await prisma.amcContract.update({ where: { id }, data: { status } });
        updated += 1;
      }
      revalidatePath("/admin/amc");
      break;
    }
    case "staff": {
      if (action === "publish") {
        await prisma.user.updateMany({ where: { id: { in: ids } }, data: { active: true } });
        updated = ids.length;
      } else {
        const guard = await protectLastSuperAdmin(ids);
        if (!guard.ok) redirect(withError(returnTo, "bulk_last_super"));
        for (const id of ids) {
          await prisma.user.update({ where: { id }, data: { active: false } });
          await revokeAllSessionsForUser(id, { actor: session.email, reason: "bulk_deactivate" });
          updated += 1;
        }
      }
      revalidatePath("/admin/staff");
      break;
    }
    case "automation": {
      await prisma.automationRule.updateMany({
        where: { id: { in: ids } },
        data: { enabled: action === "publish" },
      });
      updated = ids.length;
      revalidatePath("/admin/automation");
      break;
    }
    case "pricing": {
      await prisma.pricingRule.updateMany({
        where: { id: { in: ids } },
        data: { active: action === "publish" },
      });
      updated = ids.length;
      revalidatePath("/admin/pricing");
      break;
    }
    case "tasks": {
      const status = action === "publish" ? "open" : "cancelled";
      await prisma.opsTask.updateMany({ where: { id: { in: ids } }, data: { status } });
      updated = ids.length;
      revalidatePath("/admin/tasks");
      break;
    }
    default:
      redirect(withError(returnTo, "bulk_forbidden"));
  }

  await adminAudit({
    actor: session.email,
    action: `bulk.${entity}.${action}`,
    entity,
    meta: { ids, updated, skipped },
  });

  if (skipped && !updated) redirect(withError(returnTo, "bulk_partial"));
  const ok =
    action === "publish" ? "bulk_publish" : action === "hide" ? "bulk_hide" : "bulk_archive";
  redirect(withFlash(returnTo, skipped ? "bulk_ok" : ok, { n: String(updated) }));
}
