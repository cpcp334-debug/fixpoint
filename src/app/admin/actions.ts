"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { BookingStatus, ContentStatus, InvoiceStatus, LeadStatus, LocationStatus, QuoteMethod, QuoteStatus, ReviewStatus, ServiceStatus, StaffRole } from "@prisma/client";
import { prisma } from "@/server/db";
import { clientIp } from "@/server/rate-limit";
import { getStaffSession, loginStaff, logoutStaff, requireStaff, revokeAllSessionsForUser, clearStaffSessionCookie } from "@/lib/admin/auth";
import { isStaffRole } from "@/lib/admin/rbac";
import { hashPassword, verifyPassword } from "@/lib/admin/crypto";
import { bool, opt, parseLineItems, str } from "@/lib/admin/forms";
import { createQuote, updateQuote } from "@/lib/admin/quotes";
import { createInvoice, invoiceFromQuote, updateInvoice } from "@/lib/admin/invoices";
import { createWorkOrderFromBooking, emitWorkOrderEvents, persistWorkOrderUpdate } from "@/lib/admin/work-orders";
import { adminAudit, nextWorkOrderNumber } from "@/lib/admin/numbers";
import { parseRuleForm, saveAutomationRule } from "@/lib/admin/automation";
import { setBookingStatus, confirmBookingTime, assignBookingStaff } from "@/lib/bookings";
import { retryJob } from "@/lib/automation/engine";
import { assignLeadStaff, assertTechnicianAssignmentAllowed } from "@/lib/automation/assign";
import { loadSubjectFacts } from "@/lib/automation/subject";
import { canViewTasks, safeAdminPath, updateOpsTask } from "@/lib/automation/tasks";
import { overrideLeadQuality } from "@/lib/quality/override";
import { respondToReview, setQuestionModeration, setReviewModeration, verifyServiceReview } from "@/lib/moderation";
import { parseAudienceList, createInternalSop, updateInternalSop, setInternalSopStatus } from "@/lib/knowledge/sops";
import { SOP_AUDIENCES } from "@/lib/knowledge/types";
import { createAmcContract, updateAmcContract } from "@/lib/admin/amc";
import {
  revalidatePublicArticle,
  revalidatePublicDiy,
  revalidatePublicLocation,
  revalidatePublicService,
} from "@/lib/admin/revalidate-public";
import {
  adminArticleBasePath,
  ensureServiceFaqCategories,
  isFaqArticleSlug,
  normalizeArticleSlug,
  normalizeFaqArticleSlug,
} from "@/lib/admin/articles";
import {
  fileNameFromPath,
  galleryWhere,
  mimeFromPath,
  normalizePublicMediaPath,
  publicMediaAbsolutePath,
  statPublicMedia,
} from "@/lib/admin/gallery";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

function deny(): never {
  redirect("/login");
}

async function actor(permission: Parameters<typeof requireStaff>[0]) {
  const auth = await requireStaff(permission);
  if (!auth.session) deny();
  if (!auth.ok) redirect("/admin");
  return auth.session;
}

export async function loginAction(formData: FormData) {
  const result = await loginStaff(str(formData, "email").toLowerCase(), String(formData.get("password") || ""), clientIp((await headers())));
  if (!result.ok) redirect(`/login?error=${result.error}`);
  redirect("/admin");
}

export async function logoutAction() {
  await logoutStaff();
  redirect("/login");
}

export async function changePasswordAction(formData: FormData) {
  const session = await getStaffSession();
  if (!session) deny();
  const current = String(formData.get("current") || "");
  const next = String(formData.get("next") || "");
  if (next.length < 12) redirect("/admin/account?error=short");
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !verifyPassword(current, user.passwordHash)) redirect("/admin/account?error=invalid");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(next) } });
  await adminAudit({ actor: session.email, action: "auth.password_change", entity: "User", entityId: user.id });
  await revokeAllSessionsForUser(user.id, { actor: session.email, reason: "password_change" });
  await clearStaffSessionCookie();
  redirect("/login?ok=password");
}

export async function createStaffAction(formData: FormData) {
  const session = await actor("staff");
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") || "");
  const role = str(formData, "role");
  if (!email || password.length < 12 || !isStaffRole(role)) redirect("/admin/staff?error=invalid");
  await prisma.user.create({
    data: {
      email,
      name: str(formData, "name") || email,
      passwordHash: hashPassword(password),
      role,
      staffId: opt(formData, "staffId"),
      active: true,
    },
  });
  await adminAudit({ actor: session.email, action: "staff.create", entity: "User", meta: { email, role } });
  revalidatePath("/admin/staff");
  redirect("/admin/staff?ok=1");
}

export async function resetStaffPasswordAction(formData: FormData) {
  const session = await actor("staff");
  const next = String(formData.get("password") || "");
  if (next.length < 12) redirect("/admin/staff?error=short");
  const id = str(formData, "id");
  await prisma.user.update({ where: { id }, data: { passwordHash: hashPassword(next) } });
  await adminAudit({ actor: session.email, action: "staff.password_reset", entity: "User", entityId: id });
  await revokeAllSessionsForUser(id, { actor: session.email, reason: "admin_password_reset" });
  redirect("/admin/staff?ok=reset");
}

export async function setStaffActiveAction(formData: FormData) {
  const session = await actor("staff");
  const id = str(formData, "id");
  const active = str(formData, "active") === "true";
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) redirect("/admin/staff?error=missing");
  if (!active && (target.role === "super_admin" || target.role === "admin") && target.active) {
    const remaining = await prisma.user.count({
      where: {
        active: true,
        role: { in: ["super_admin", "admin"] },
        id: { not: id },
      },
    });
    if (remaining === 0) redirect("/admin/staff?error=bulk_last_super");
  }
  await prisma.user.update({ where: { id }, data: { active } });
  if (!active) {
    await revokeAllSessionsForUser(id, { actor: session.email, reason: "account_deactivated" });
    await adminAudit({ actor: session.email, action: "staff.deactivate", entity: "User", entityId: id });
  } else {
    await adminAudit({ actor: session.email, action: "staff.activate", entity: "User", entityId: id });
  }
  revalidatePath("/admin/staff");
  redirect(active ? "/admin/staff?ok=activated" : "/admin/staff?ok=deactivated");
}

export async function updateLeadAction(formData: FormData) {
  const session = await actor("leads");
  const id = str(formData, "id");
  await prisma.lead.update({
    where: { id },
    data: {
      status: str(formData, "status") as LeadStatus,
      notes: str(formData, "notes"),
    },
  });
  await adminAudit({ actor: session.email, action: "lead.update", entity: "Lead", entityId: id });
  revalidatePath("/admin/leads");
  redirect(`/admin/leads/${id}?ok=saved`);
}

export async function createLeadAction(formData: FormData) {
  const session = await actor("leads");
  const name = str(formData, "name");
  const phone = str(formData, "phone");
  const requirement = str(formData, "requirement");
  if (!name || !phone || !requirement) redirect("/admin/leads?error=required");
  const row = await prisma.lead.create({
    data: {
      source: "admin",
      name,
      phone,
      email: opt(formData, "email"),
      requirement,
      notes: str(formData, "notes"),
      status: "NEW",
      locale: "en",
    },
  });
  await adminAudit({ actor: session.email, action: "lead.create", entity: "Lead", entityId: row.id });
  revalidatePath("/admin/leads");
  redirect(`/admin/leads/${row.id}?ok=created`);
}

export async function assignLeadAction(formData: FormData) {
  const session = await actor("leads");
  const id = str(formData, "id");
  const result = await assignLeadStaff({
    leadId: id,
    assignedStaffId: opt(formData, "assignedStaffId") || null,
    actorEmail: session.email,
    actorRole: session.role,
  });
  revalidatePath("/admin/leads");
  if (!result.ok) redirect(`/admin/leads/${id}?error=${result.error}`);
  redirect(`/admin/leads/${id}`);
}

export async function overrideLeadQualityAction(formData: FormData) {
  const session = await actor("leads");
  const id = str(formData, "id");
  const result = await overrideLeadQuality({
    leadId: id,
    class: str(formData, "class"),
    note: str(formData, "note"),
    actorEmail: session.email,
    actorRole: session.role,
  });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
  if (!result.ok) redirect(`/admin/leads/${id}?quality=${result.error}`);
  redirect(`/admin/leads/${id}?quality=ok`);
}

export async function saveCustomerAction(formData: FormData) {
  const session = await actor("customers");
  const id = opt(formData, "id");
  const data = {
    name: str(formData, "name"),
    phone: opt(formData, "phone"),
    email: opt(formData, "email"),
    whatsapp: opt(formData, "whatsapp"),
    notes: str(formData, "notes"),
    preferredLanguage: str(formData, "preferredLanguage") || "en",
  };
  if (id) {
    await prisma.customer.update({ where: { id }, data });
    await adminAudit({ actor: session.email, action: "customer.update", entity: "Customer", entityId: id });
    revalidatePath("/admin/customers");
    redirect(`/admin/customers/${id}`);
  }
  const row = await prisma.customer.create({ data });
  await adminAudit({ actor: session.email, action: "customer.create", entity: "Customer", entityId: row.id });
  redirect(`/admin/customers/${row.id}`);
}

export async function updateBookingAction(formData: FormData) {
  const session = await actor("bookings");
  const id = str(formData, "id");
  const intent = str(formData, "intent");
  if (intent === "status") {
    await setBookingStatus(id, str(formData, "status") as BookingStatus);
  } else if (intent === "confirm") {
    await confirmBookingTime(id, str(formData, "confirmedDate"), str(formData, "confirmedTime"));
  } else if (intent === "assign") {
    const result = await assignBookingStaff(id, opt(formData, "technicianId"), opt(formData, "supervisorId"), session.email);
    if (!result.ok) redirect(`/admin/bookings/${id}?error=${result.error}`);
  } else if (intent === "notes") {
    await prisma.booking.update({ where: { id }, data: { notes: str(formData, "notes") } });
  }
  await adminAudit({ actor: session.email, action: `booking.admin.${intent}`, entity: "Booking", entityId: id });
  revalidatePath("/admin/bookings");
  redirect(`/admin/bookings/${id}?ok=saved`);
}

function staffBookingNumber() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ALN-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

export async function createBookingAction(formData: FormData) {
  const session = await actor("bookings");
  const name = str(formData, "name");
  const phone = str(formData, "phone");
  const requirement = str(formData, "requirement");
  if (!name || !phone || !requirement) redirect("/admin/bookings?error=required");
  const type = str(formData, "type") || "standard";
  const allowed = ["standard", "site_inspection", "emergency", "recurring_cleaning", "amc_visit"] as const;
  const bookingType = (allowed as readonly string[]).includes(type) ? type : "standard";
  const row = await prisma.booking.create({
    data: {
      number: staffBookingNumber(),
      type: bookingType as (typeof allowed)[number],
      name,
      phone,
      email: opt(formData, "email"),
      requirement,
      notes: str(formData, "notes"),
      preferredDate: opt(formData, "preferredDate"),
      preferredTime: opt(formData, "preferredTime"),
      status: "requested",
      locale: "en",
    },
  });
  await adminAudit({ actor: session.email, action: "booking.create", entity: "Booking", entityId: row.id });
  revalidatePath("/admin/bookings");
  redirect(`/admin/bookings/${row.id}?ok=created`);
}

export async function createWorkOrderAction(formData: FormData) {
  const session = await actor("work_orders");
  if (session.role === "technician") redirect("/admin/work-orders");
  const bookingId = opt(formData, "bookingId");
  if (bookingId) {
    const row = await createWorkOrderFromBooking(bookingId, session.email);
    if (row) redirect(`/admin/work-orders/${row.id}`);
  }
  const created = await prisma.workOrder.create({
    data: {
      number: await nextWorkOrderNumber(),
      locationLabel: str(formData, "locationLabel"),
      propertyLabel: str(formData, "propertyLabel"),
      serviceLabel: str(formData, "serviceLabel"),
      scope: str(formData, "scope"),
      scheduledDate: opt(formData, "scheduledDate"),
      scheduledTime: opt(formData, "scheduledTime"),
      notes: str(formData, "notes"),
      technicianId: opt(formData, "technicianId"),
      supervisorId: opt(formData, "supervisorId"),
      status: opt(formData, "technicianId") ? "assigned" : "created",
    },
  });
  await adminAudit({ actor: session.email, action: "work_order.create", entity: "WorkOrder", entityId: created.id });
  await emitWorkOrderEvents(created.id, { status: created.status, technicianId: created.technicianId }, null);
  redirect(`/admin/work-orders/${created.id}`);
}

export async function updateWorkOrderAction(formData: FormData) {
  const session = await actor("work_orders");
  const id = str(formData, "id");
  const existing = await prisma.workOrder.findUnique({ where: { id } });
  if (!existing) redirect("/admin/work-orders");
  if (session.role === "technician" && existing.technicianId !== session.staffId) redirect("/admin/work-orders");
  const nextTechnicianId = session.role === "technician" ? existing.technicianId : opt(formData, "technicianId") || existing.technicianId;
  if (nextTechnicianId && nextTechnicianId !== existing.technicianId) {
    const facts = (await loadSubjectFacts("WorkOrder", id)) || {};
    const allowed = await assertTechnicianAssignmentAllowed(nextTechnicianId, facts);
    if (!allowed.ok) redirect(`/admin/work-orders/${id}?error=${allowed.error}`);
  }
  const updated = await persistWorkOrderUpdate(
    id,
    {
      status: str(formData, "status") || existing.status,
      notes: str(formData, "notes"),
      qcResult: str(formData, "qcResult"),
      customerSignOff: bool(formData, "customerSignOff"),
      technicianId: nextTechnicianId,
      supervisorId: opt(formData, "supervisorId") || existing.supervisorId,
      scheduledDate: opt(formData, "scheduledDate") || existing.scheduledDate,
      scheduledTime: opt(formData, "scheduledTime") || existing.scheduledTime,
      scope: str(formData, "scope") || existing.scope,
    },
    session.email,
  );
  if (!updated) redirect("/admin/work-orders");
  revalidatePath("/admin/work-orders");
  redirect(`/admin/work-orders/${id}`);
}

export async function moderateReviewAction(formData: FormData) {
  const session = await actor("reviews");
  const id = str(formData, "id");
  const intent = str(formData, "intent");
  if (intent === "status") await setReviewModeration(id, str(formData, "status") as ReviewStatus);
  if (intent === "respond") await respondToReview(id, str(formData, "adminResponse"));
  if (intent === "verify") await verifyServiceReview(id);
  await adminAudit({ actor: session.email, action: `review.admin.${intent}`, entity: "Review", entityId: id });
  revalidatePath("/admin/reviews");
  redirect("/admin/reviews");
}

export async function moderateQuestionAction(formData: FormData) {
  const session = await actor("questions");
  const id = str(formData, "id");
  await setQuestionModeration(id, str(formData, "status") as ReviewStatus, opt(formData, "answer"));
  await adminAudit({ actor: session.email, action: "question.admin", entity: "Question", entityId: id });
  revalidatePath("/admin/questions");
  redirect("/admin/questions");
}

const SERVICE_STATUSES = ["draft", "active", "requires_approval", "subcontracted", "unavailable", "archived"] as const;

export async function updateServiceAction(formData: FormData) {
  const session = await actor("services");
  const id = str(formData, "id");
  const existing = await prisma.service.findUnique({
    where: { id },
    include: { category: { select: { slug: true } }, translations: true },
  });
  if (!existing) redirect("/admin/services");
  const status = str(formData, "status") as ServiceStatus;
  if (!(SERVICE_STATUSES as readonly string[]).includes(status)) redirect(`/admin/services/${id}?error=status`);
  const en = existing.translations.find((row) => row.locale === "en");
  const ar = existing.translations.find((row) => row.locale === "ar");
  const nameEn = str(formData, "nameEn") || en?.name || existing.slug;
  const shortEn = str(formData, "shortEn");
  const longEn = str(formData, "longEn");
  const nameAr = str(formData, "nameAr");
  const shortAr = str(formData, "shortAr");
  const longAr = str(formData, "longAr");
  await prisma.service.update({
    where: { id },
    data: {
      status,
      indexable: bool(formData, "indexable"),
      bookingEnabled: bool(formData, "bookingEnabled"),
      diyAvailable: bool(formData, "diyAvailable"),
      emergencyAvailable: bool(formData, "emergencyAvailable"),
      amcAvailable: bool(formData, "amcAvailable"),
      inspectionRequired: bool(formData, "inspectionRequired"),
    },
  });
  if (en) {
    await prisma.serviceI18n.update({
      where: { id: en.id },
      data: {
        name: nameEn,
        shortDescription: shortEn,
        longDescription: longEn,
      },
    });
  } else {
    await prisma.serviceI18n.create({
      data: {
        serviceId: id,
        locale: "en",
        name: nameEn,
        shortDescription: shortEn,
        longDescription: longEn,
        professionalFallback: "",
        seoTitle: nameEn,
        metaDescription: shortEn || nameEn,
      },
    });
  }
  if (ar) {
    await prisma.serviceI18n.update({
      where: { id: ar.id },
      data: {
        name: nameAr,
        shortDescription: shortAr,
        longDescription: longAr,
      },
    });
  } else {
    await prisma.serviceI18n.create({
      data: {
        serviceId: id,
        locale: "ar",
        name: nameAr,
        shortDescription: shortAr,
        longDescription: longAr,
        professionalFallback: "",
        seoTitle: nameAr,
        metaDescription: shortAr || nameAr,
      },
    });
  }
  await adminAudit({ actor: session.email, action: "service.update", entity: "Service", entityId: id, meta: { status, indexable: bool(formData, "indexable") } });
  revalidatePath("/admin/services");
  revalidatePath(`/admin/services/${id}`);
  revalidatePublicService(existing.slug, existing.category.slug);
  redirect(`/admin/services/${id}?ok=saved`);
}

export async function createServiceAction(formData: FormData) {
  const session = await actor("services");
  const categoryId = str(formData, "categoryId");
  const slug = str(formData, "slug")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const nameEn = str(formData, "nameEn");
  const nameAr = str(formData, "nameAr") || nameEn;
  const shortEn = str(formData, "shortEn");
  const shortAr = str(formData, "shortAr") || shortEn;
  if (!categoryId || !slug || !nameEn) redirect("/admin/services/new?error=required");
  const category = await prisma.serviceCategory.findUnique({ where: { id: categoryId } });
  if (!category) redirect("/admin/services/new?error=category");
  const exists = await prisma.service.findUnique({ where: { slug }, select: { id: true } });
  if (exists) redirect("/admin/services/new?error=slug_taken");
  const status = str(formData, "status") as ServiceStatus;
  const safeStatus = (SERVICE_STATUSES as readonly string[]).includes(status) ? status : "draft";
  const created = await prisma.service.create({
    data: {
      categoryId,
      slug,
      serviceType: "maintenance",
      status: safeStatus,
      riskLevel: "yellow",
      diyAvailable: bool(formData, "diyAvailable"),
      quoteMethod: "inspection",
      inspectionRequired: bool(formData, "inspectionRequired"),
      bookingEnabled: bool(formData, "bookingEnabled"),
      emergencyAvailable: false,
      amcAvailable: false,
      indexable: safeStatus === "active" && bool(formData, "indexable"),
      relatedServiceSlugs: "[]",
      aiIntakeQuestions: "[]",
      schemaData: "{}",
      translations: {
        create: [
          {
            locale: "en",
            name: nameEn,
            shortDescription: shortEn,
            longDescription: shortEn,
            professionalFallback: "",
            seoTitle: `${nameEn} | Al Najah Al Daem · Fixpoint`.slice(0, 60),
            metaDescription: (shortEn || nameEn).slice(0, 155),
          },
          {
            locale: "ar",
            name: nameAr,
            shortDescription: shortAr,
            longDescription: shortAr,
            professionalFallback: "",
            seoTitle: `${nameAr} | النجاح الدائم · Fixpoint`.slice(0, 60),
            metaDescription: (shortAr || nameAr).slice(0, 155),
          },
        ],
      },
    },
  });
  await adminAudit({
    actor: session.email,
    action: "service.create",
    entity: "Service",
    entityId: created.id,
    meta: { slug, status: safeStatus },
  });
  revalidatePath("/admin/services");
  revalidatePublicService(slug, category.slug);
  redirect(`/admin/services/${created.id}?ok=saved`);
}

const LOCATION_STATUSES = ["draft", "active", "archived"] as const;

export async function updateLocationAction(formData: FormData) {
  const session = await actor("locations");
  const id = str(formData, "id");
  const existing = await prisma.location.findUnique({ where: { id }, include: { translations: true } });
  if (!existing) redirect("/admin/locations");
  const status = str(formData, "status") as LocationStatus;
  if (!(LOCATION_STATUSES as readonly string[]).includes(status)) redirect(`/admin/locations/${id}?error=status`);
  const en = existing.translations.find((row) => row.locale === "en");
  const ar = existing.translations.find((row) => row.locale === "ar");
  const nameEn = str(formData, "nameEn") || en?.name || existing.slug;
  const introEn = str(formData, "introEn");
  const nameAr = str(formData, "nameAr");
  const introAr = str(formData, "introAr");
  await prisma.location.update({
    where: { id },
    data: {
      status,
      serves: bool(formData, "serves"),
      indexable: bool(formData, "indexable"),
    },
  });
  if (en) {
    await prisma.locationI18n.update({
      where: { id: en.id },
      data: { name: nameEn, intro: introEn },
    });
  } else {
    await prisma.locationI18n.create({
      data: {
        locationId: id,
        locale: "en",
        name: nameEn,
        intro: introEn,
        seoTitle: nameEn,
        metaDescription: introEn || nameEn,
      },
    });
  }
  if (ar) {
    await prisma.locationI18n.update({
      where: { id: ar.id },
      data: { name: nameAr, intro: introAr },
    });
  } else {
    await prisma.locationI18n.create({
      data: {
        locationId: id,
        locale: "ar",
        name: nameAr,
        intro: introAr,
        seoTitle: nameAr,
        metaDescription: introAr || nameAr,
      },
    });
  }
  await adminAudit({
    actor: session.email,
    action: "location.update",
    entity: "Location",
    entityId: id,
    meta: { status, serves: bool(formData, "serves"), indexable: bool(formData, "indexable") },
  });
  revalidatePath("/admin/locations");
  revalidatePath(`/admin/locations/${id}`);
  revalidatePublicLocation(existing.slug);
  redirect(`/admin/locations/${id}?ok=saved`);
}

const CONTENT_STATUSES = ["draft", "review", "published", "archived"] as const;

export async function updateDiyAction(formData: FormData) {
  const session = await actor("diy");
  const id = str(formData, "id");
  const existing = await prisma.diyGuide.findUnique({ where: { id }, include: { translations: true } });
  if (!existing) redirect("/admin/diy");
  const status = str(formData, "status") as ContentStatus;
  if (!(CONTENT_STATUSES as readonly string[]).includes(status)) redirect(`/admin/diy/${id}?error=status`);
  const en = existing.translations.find((row) => row.locale === "en");
  const ar = existing.translations.find((row) => row.locale === "ar");
  const titleEn = str(formData, "titleEn") || en?.title || existing.slug;
  const quickAnswerEn = str(formData, "quickAnswerEn");
  const fallbackEn = str(formData, "fallbackEn");
  const titleAr = str(formData, "titleAr");
  const quickAnswerAr = str(formData, "quickAnswerAr");
  const fallbackAr = str(formData, "fallbackAr");
  await prisma.diyGuide.update({
    where: { id },
    data: {
      status,
      indexable: bool(formData, "indexable"),
      publishedAt: status === "published" ? existing.publishedAt || new Date() : null,
    },
  });
  if (en) {
    await prisma.diyGuideI18n.update({
      where: { id: en.id },
      data: {
        title: titleEn,
        quickAnswer: quickAnswerEn,
        professionalFallback: fallbackEn,
      },
    });
  } else {
    await prisma.diyGuideI18n.create({
      data: {
        guideId: id,
        locale: "en",
        title: titleEn,
        problem: "",
        quickAnswer: quickAnswerEn,
        safety: "",
        whenToStop: "",
        professionalFallback: fallbackEn,
        seoTitle: titleEn,
        metaDescription: quickAnswerEn || titleEn,
      },
    });
  }
  if (ar) {
    await prisma.diyGuideI18n.update({
      where: { id: ar.id },
      data: {
        title: titleAr,
        quickAnswer: quickAnswerAr,
        professionalFallback: fallbackAr,
      },
    });
  } else {
    await prisma.diyGuideI18n.create({
      data: {
        guideId: id,
        locale: "ar",
        title: titleAr,
        problem: "",
        quickAnswer: quickAnswerAr,
        safety: "",
        whenToStop: "",
        professionalFallback: fallbackAr,
        seoTitle: titleAr,
        metaDescription: quickAnswerAr || titleAr,
      },
    });
  }
  await adminAudit({ actor: session.email, action: "diy.update", entity: "DiyGuide", entityId: id, meta: { status, indexable: bool(formData, "indexable") } });
  revalidatePath("/admin/diy");
  revalidatePath(`/admin/diy/${id}`);
  revalidatePublicDiy(existing.slug);
  redirect(`/admin/diy/${id}?ok=saved`);
}

function csvSlugs(raw: string) {
  return JSON.stringify(
    raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

function articleReturnBase(slug: string) {
  return adminArticleBasePath(slug);
}

function parseFaqJsonOrRedirect(raw: string, errorPath: string): string {
  try {
    JSON.parse(raw);
    return raw;
  } catch {
    redirect(`${errorPath}?error=faq_json`);
  }
}

export async function createArticleAction(formData: FormData) {
  const session = await actor("diy");
  const kind = str(formData, "kind") === "faq" ? "faq" : "blog";
  const base = kind === "faq" ? "/admin/faqs" : "/admin/blogs";
  // Create always starts draft + not indexable (publish from list/detail).
  const status: ContentStatus = "draft";
  const indexable = false;
  const titleEn = str(formData, "titleEn");
  if (!titleEn) redirect(`${base}/new?error=title`);

  const slug =
    kind === "faq" ? normalizeFaqArticleSlug(str(formData, "slug")) : normalizeArticleSlug(str(formData, "slug"));
  if (!slug) redirect(`${base}/new?error=slug`);
  if (kind === "blog" && isFaqArticleSlug(slug)) redirect(`${base}/new?error=faq_slug`);
  if (kind === "faq" && !isFaqArticleSlug(slug)) redirect(`${base}/new?error=slug`);

  const faqEn = parseFaqJsonOrRedirect(str(formData, "faqEn") || "[]", `${base}/new`);
  const categorySlugs =
    kind === "faq"
      ? JSON.stringify(ensureServiceFaqCategories(str(formData, "categorySlugs")))
      : csvSlugs(str(formData, "categorySlugs"));

  const clash = await prisma.article.findUnique({ where: { slug }, select: { id: true } });
  if (clash) redirect(`${base}/new?error=slug_taken`);

  const excerptEn = str(formData, "excerptEn");
  const bodyEn = str(formData, "bodyEn");
  const titleAr = str(formData, "titleAr");
  const excerptAr = str(formData, "excerptAr");
  const created = await prisma.article.create({
    data: {
      slug,
      status,
      indexable,
      categorySlugs,
      relatedServiceSlugs: csvSlugs(str(formData, "relatedServiceSlugs")),
      relatedDiySlugs: csvSlugs(str(formData, "relatedDiySlugs")),
      heroImage: opt(formData, "heroImage"),
      publishedAt: null,
      translations: {
        create: [
          {
            locale: "en",
            title: titleEn,
            excerpt: excerptEn,
            body: bodyEn,
            diySection: str(formData, "diySectionEn"),
            faq: faqEn,
            imageAlt: str(formData, "imageAltEn"),
            seoTitle: str(formData, "seoTitleEn") || titleEn,
            metaDescription: str(formData, "metaDescriptionEn") || excerptEn || titleEn,
          },
          {
            locale: "ar",
            title: titleAr,
            excerpt: excerptAr,
            body: "",
            diySection: "",
            faq: "[]",
            imageAlt: "",
            seoTitle: titleAr,
            metaDescription: excerptAr || titleAr,
          },
        ],
      },
    },
  });

  await adminAudit({
    actor: session.email,
    action: "article.create",
    entity: "Article",
    entityId: created.id,
    meta: { status, indexable, slug, kind },
  });
  revalidatePath("/admin/articles");
  revalidatePath("/admin/blogs");
  revalidatePath("/admin/faqs");
  revalidatePath(`${base}/${created.id}`);
  revalidatePublicArticle(slug);
  redirect(`${base}/${created.id}?ok=created`);
}

export async function updateArticleAction(formData: FormData) {
  const session = await actor("diy");
  const id = str(formData, "id");
  const existing = await prisma.article.findUnique({ where: { id }, include: { translations: true } });
  if (!existing) redirect("/admin/articles");
  const base = articleReturnBase(existing.slug);
  const status = str(formData, "status") as ContentStatus;
  if (!(CONTENT_STATUSES as readonly string[]).includes(status)) redirect(`${base}/${id}?error=status`);
  const en = existing.translations.find((row) => row.locale === "en");
  const ar = existing.translations.find((row) => row.locale === "ar");
  const titleEn = str(formData, "titleEn") || en?.title || existing.slug;
  const excerptEn = str(formData, "excerptEn");
  const bodyEn = str(formData, "bodyEn");
  const faqEn = parseFaqJsonOrRedirect(str(formData, "faqEn") || "[]", `${base}/${id}`);
  const categorySlugs = isFaqArticleSlug(existing.slug)
    ? JSON.stringify(ensureServiceFaqCategories(str(formData, "categorySlugs")))
    : csvSlugs(str(formData, "categorySlugs"));

  await prisma.article.update({
    where: { id },
    data: {
      status,
      indexable: bool(formData, "indexable"),
      categorySlugs,
      relatedServiceSlugs: csvSlugs(str(formData, "relatedServiceSlugs")),
      relatedDiySlugs: csvSlugs(str(formData, "relatedDiySlugs")),
      heroImage: opt(formData, "heroImage"),
      publishedAt: status === "published" ? existing.publishedAt || new Date() : existing.publishedAt,
    },
  });
  if (en) {
    await prisma.articleI18n.update({
      where: { id: en.id },
      data: {
        title: titleEn,
        excerpt: excerptEn,
        body: bodyEn,
        diySection: str(formData, "diySectionEn"),
        faq: faqEn,
        imageAlt: str(formData, "imageAltEn"),
        seoTitle: str(formData, "seoTitleEn") || titleEn,
        metaDescription: str(formData, "metaDescriptionEn") || excerptEn || titleEn,
      },
    });
  } else {
    await prisma.articleI18n.create({
      data: {
        articleId: id,
        locale: "en",
        title: titleEn,
        excerpt: excerptEn,
        body: bodyEn,
        diySection: str(formData, "diySectionEn"),
        faq: faqEn,
        imageAlt: str(formData, "imageAltEn"),
        seoTitle: str(formData, "seoTitleEn") || titleEn,
        metaDescription: str(formData, "metaDescriptionEn") || excerptEn || titleEn,
      },
    });
  }

  if (formData.has("titleAr")) {
    const faqArRaw = str(formData, "faqAr") || ar?.faq || "[]";
    const faqAr = parseFaqJsonOrRedirect(faqArRaw, `${base}/${id}`);
    const titleAr = str(formData, "titleAr");
    const excerptAr = str(formData, "excerptAr");
    const bodyAr = str(formData, "bodyAr");
    const diySectionAr = str(formData, "diySectionAr");
    const imageAltAr = str(formData, "imageAltAr");
    const seoTitleAr = str(formData, "seoTitleAr") || titleAr;
    const metaDescriptionAr = str(formData, "metaDescriptionAr") || excerptAr || titleAr;
    if (ar) {
      await prisma.articleI18n.update({
        where: { id: ar.id },
        data: {
          title: titleAr,
          excerpt: excerptAr,
          body: bodyAr,
          diySection: diySectionAr,
          faq: faqAr,
          imageAlt: imageAltAr,
          seoTitle: seoTitleAr,
          metaDescription: metaDescriptionAr,
        },
      });
    } else {
      await prisma.articleI18n.create({
        data: {
          articleId: id,
          locale: "ar",
          title: titleAr,
          excerpt: excerptAr,
          body: bodyAr,
          diySection: diySectionAr,
          faq: faqAr,
          imageAlt: imageAltAr,
          seoTitle: seoTitleAr,
          metaDescription: metaDescriptionAr,
        },
      });
    }
  }

  await adminAudit({
    actor: session.email,
    action: "article.update",
    entity: "Article",
    entityId: id,
    meta: { status, indexable: bool(formData, "indexable"), slug: existing.slug },
  });
  revalidatePath("/admin/articles");
  revalidatePath("/admin/blogs");
  revalidatePath("/admin/faqs");
  revalidatePath(`${base}/${id}`);
  revalidatePublicArticle(existing.slug);
  redirect(`${base}/${id}?ok=saved`);
}

function galleryStateData(state: string) {
  if (state === "published") return { visibility: "public", status: "ready" };
  if (state === "archived") return { visibility: "private", status: "archived" };
  return { visibility: "private", status: "ready" };
}

export async function registerGalleryMediaAction(formData: FormData) {
  const session = await actor("diy");
  const webPath = normalizePublicMediaPath(str(formData, "path"));
  if (!webPath) redirect("/admin/gallery/new?error=path");
  const stats = statPublicMedia(webPath);
  if (!stats.exists) redirect("/admin/gallery/new?error=missing_file");
  const duplicate = await prisma.mediaAsset.findUnique({ where: { storageKey: webPath }, select: { id: true } });
  if (duplicate) redirect(`/admin/gallery/${duplicate.id}?error=exists`);
  const title = str(formData, "title") || fileNameFromPath(webPath);
  const row = await prisma.mediaAsset.create({
    data: {
      storageKey: webPath,
      originalName: title,
      mimeType: mimeFromPath(webPath),
      sizeBytes: stats.sizeBytes,
      alt: str(formData, "alt"),
      caption: str(formData, "caption"),
      visibility: "private",
      status: "ready",
    },
  });
  await adminAudit({
    actor: session.email,
    action: "gallery.register",
    entity: "MediaAsset",
    entityId: row.id,
    meta: { storageKey: webPath },
  });
  revalidatePath("/admin/gallery");
  redirect(`/admin/gallery/${row.id}?ok=saved`);
}

export async function uploadGalleryMediaAction(formData: FormData) {
  const session = await actor("diy");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) redirect("/admin/gallery/new?error=file");
  if (file.size > 8_000_000) redirect("/admin/gallery/new?error=size");
  const buf = Buffer.from(await file.arrayBuffer());
  const type = file.type;
  if (!["image/jpeg", "image/png", "image/webp"].includes(type)) redirect("/admin/gallery/new?error=type");
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const idHint = randomBytes(6).toString("hex");
  const webPath = `/media/gallery/${idHint}.${ext}`;
  const abs = publicMediaAbsolutePath(webPath);
  if (!abs) redirect("/admin/gallery/new?error=path");
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, buf);
  const title = str(formData, "title") || file.name || `gallery-${idHint}`;
  const row = await prisma.mediaAsset.create({
    data: {
      storageKey: webPath,
      originalName: title.slice(0, 120),
      mimeType: type,
      sizeBytes: buf.length,
      alt: str(formData, "alt"),
      caption: str(formData, "caption"),
      visibility: "private",
      status: "ready",
    },
  });
  await adminAudit({
    actor: session.email,
    action: "gallery.upload",
    entity: "MediaAsset",
    entityId: row.id,
    meta: { storageKey: webPath },
  });
  revalidatePath("/admin/gallery");
  redirect(`/admin/gallery/${row.id}?ok=saved`);
}

export async function updateGalleryMediaAction(formData: FormData) {
  const session = await actor("diy");
  const id = str(formData, "id");
  const existing = await prisma.mediaAsset.findFirst({ where: galleryWhere({ id }) });
  if (!existing) redirect("/admin/gallery");
  const state = str(formData, "state");
  if (!["published", "hidden", "archived"].includes(state)) redirect(`/admin/gallery/${id}?error=status`);
  await prisma.mediaAsset.update({
    where: { id },
    data: {
      ...galleryStateData(state),
      originalName: str(formData, "title") || existing.originalName,
      alt: str(formData, "alt"),
      caption: str(formData, "caption"),
    },
  });
  await adminAudit({
    actor: session.email,
    action: "gallery.update",
    entity: "MediaAsset",
    entityId: id,
    meta: { state, storageKey: existing.storageKey },
  });
  revalidatePath("/admin/gallery");
  revalidatePath(`/admin/gallery/${id}`);
  redirect(`/admin/gallery/${id}?ok=saved`);
}

function quoteInput(formData: FormData) {
  return {
    customerName: str(formData, "customerName"),
    customerPhone: str(formData, "customerPhone"),
    customerEmail: opt(formData, "customerEmail"),
    customerId: opt(formData, "customerId"),
    leadId: opt(formData, "leadId"),
    serviceId: opt(formData, "serviceId"),
    locationId: opt(formData, "locationId"),
    locationLabel: str(formData, "locationLabel"),
    serviceLabel: str(formData, "serviceLabel"),
    scope: str(formData, "scope"),
    materials: str(formData, "materials"),
    labor: str(formData, "labor"),
    exclusions: str(formData, "exclusions"),
    taxesNote: str(formData, "taxesNote"),
    validity: str(formData, "validity"),
    paymentTerms: str(formData, "paymentTerms"),
    estimatedDuration: str(formData, "estimatedDuration"),
    warrantyTerms: str(formData, "warrantyTerms"),
    notes: str(formData, "notes"),
    subtotalLabel: str(formData, "subtotalLabel"),
    discountLabel: str(formData, "discountLabel"),
    taxLabel: str(formData, "taxLabel"),
    totalLabel: str(formData, "totalLabel"),
    humanApproved: bool(formData, "humanApproved"),
    status: (str(formData, "status") || "DRAFT") as QuoteStatus,
    items: parseLineItems(formData),
  };
}

export async function saveQuoteAction(formData: FormData) {
  const session = await actor("quotes");
  const id = opt(formData, "id");
  const input = quoteInput(formData);
  if (!input.customerName || !input.customerPhone) redirect("/admin/quotes/new?error=required");
  if (id) {
    const updated = await updateQuote(id, input, session.email);
    if (!updated.ok) redirect(`/admin/quotes/${id}?error=${updated.error}`);
    revalidatePath("/admin/quotes");
    redirect(`/admin/quotes/${id}`);
  }
  const created = await createQuote(input, session);
  if (!created.ok) redirect(`/admin/quotes/new?error=${created.error}`);
  redirect(`/admin/quotes/${created.quote.id}`);
}

function invoiceInput(formData: FormData) {
  return {
    customerName: str(formData, "customerName"),
    customerPhone: str(formData, "customerPhone"),
    customerEmail: opt(formData, "customerEmail"),
    customerId: opt(formData, "customerId"),
    quoteId: opt(formData, "quoteId"),
    bookingId: opt(formData, "bookingId"),
    workOrderId: opt(formData, "workOrderId"),
    locationLabel: str(formData, "locationLabel"),
    serviceLabel: str(formData, "serviceLabel"),
    notes: str(formData, "notes"),
    subtotalLabel: str(formData, "subtotalLabel"),
    discountLabel: str(formData, "discountLabel"),
    taxLabel: str(formData, "taxLabel"),
    totalLabel: str(formData, "totalLabel"),
    issueDate: opt(formData, "issueDate"),
    dueDate: opt(formData, "dueDate"),
    paymentRef: opt(formData, "paymentRef"),
    status: (str(formData, "status") || "DRAFT") as InvoiceStatus,
    items: parseLineItems(formData),
  };
}

export async function saveInvoiceAction(formData: FormData) {
  const session = await actor("invoices");
  const id = opt(formData, "id");
  const input = invoiceInput(formData);
  if (!input.customerName || !input.customerPhone) redirect("/admin/invoices/new?error=required");
  if (id) {
    await updateInvoice(id, input, session.email);
    revalidatePath("/admin/invoices");
    redirect(`/admin/invoices/${id}`);
  }
  const row = await createInvoice(input, session);
  redirect(`/admin/invoices/${row.id}`);
}

export async function invoiceFromQuoteAction(formData: FormData) {
  const session = await actor("invoices");
  const quoteId = str(formData, "quoteId");
  const row = await invoiceFromQuote(quoteId, session);
  if (!row) redirect("/admin/quotes");
  redirect(`/admin/invoices/${row.id}`);
}

export async function savePricingRuleAction(formData: FormData) {
  const session = await actor("pricing");
  const id = opt(formData, "id");
  const data = {
    name: str(formData, "name"),
    serviceId: opt(formData, "serviceId"),
    method: (str(formData, "method") || "inspection") as QuoteMethod,
    unitLabel: str(formData, "unitLabel"),
    notes: str(formData, "notes"),
    active: bool(formData, "active"),
  };
  if (id) await prisma.pricingRule.update({ where: { id }, data });
  else await prisma.pricingRule.create({ data });
  await adminAudit({ actor: session.email, action: "pricing.save", entity: "PricingRule", entityId: id || "" });
  revalidatePath("/admin/pricing");
  redirect("/admin/pricing");
}

export async function createStaffRecordAction(formData: FormData) {
  const session = await actor("staff");
  await prisma.staff.create({
    data: {
      staffCode: str(formData, "staffCode"),
      role: str(formData, "staffRole") as StaffRole,
      status: "active",
    },
  });
  await adminAudit({ actor: session.email, action: "staff.record.create", entity: "Staff" });
  redirect("/admin/staff");
}

export async function saveAutomationRuleAction(formData: FormData) {
  const session = await actor("automation");
  const parsed = parseRuleForm({
    key: str(formData, "key"),
    name: str(formData, "name"),
    description: str(formData, "description"),
    enabled: bool(formData, "enabled"),
    priority: str(formData, "priority") || "100",
    trigger: str(formData, "trigger"),
    delaySeconds: str(formData, "delaySeconds") || "0",
    conditionsJson: str(formData, "conditionsJson") || "[]",
    actionsJson: str(formData, "actionsJson") || "[]",
  });
  const id = opt(formData, "id");
  if (!parsed.ok) {
    redirect(id ? `/admin/automation/${id}?error=${parsed.error}` : `/admin/automation/new?error=${parsed.error}`);
  }
  if (id) {
    await saveAutomationRule({ id, input: parsed.data, actorEmail: session.email, actorId: session.id });
    revalidatePath("/admin/automation");
    redirect(`/admin/automation/${id}`);
  }
  const row = await saveAutomationRule({ input: parsed.data, actorEmail: session.email, actorId: session.id });
  redirect(`/admin/automation/${row?.id || ""}`);
}

export async function toggleAutomationRuleAction(formData: FormData) {
  const session = await actor("automation");
  const id = str(formData, "id");
  const existing = await prisma.automationRule.findUnique({ where: { id } });
  if (!existing) redirect("/admin/automation");
  await prisma.automationRule.update({
    where: { id },
    data: { enabled: !existing.enabled, updatedBy: session.email },
  });
  await adminAudit({
    actor: session.email,
    action: existing.enabled ? "automation.rule.disable" : "automation.rule.enable",
    entity: "AutomationRule",
    entityId: id,
    meta: { key: existing.key },
  });
  revalidatePath("/admin/automation");
  redirect("/admin/automation");
}

export async function retryAutomationJobAction(formData: FormData) {
  const session = await actor("automation");
  const id = str(formData, "id");
  await retryJob(id);
  await adminAudit({ actor: session.email, action: "automation.job.retry", entity: "AutomationJob", entityId: id });
  revalidatePath("/admin/automation/runs");
  redirect("/admin/automation/runs?retried=1");
}

export async function updateOpsTaskAction(formData: FormData) {
  const session = await getStaffSession();
  if (!session) deny();
  if (!canViewTasks(session.role)) redirect("/admin");
  const id = str(formData, "id");
  const next = safeAdminPath(opt(formData, "next"));
  const statusRaw = opt(formData, "status");
  const status = statusRaw === "open" || statusRaw === "done" || statusRaw === "cancelled" ? statusRaw : undefined;
  const assigneeRaw = formData.has("assigneeStaffId") ? opt(formData, "assigneeStaffId") || null : undefined;
  const result = await updateOpsTask({
    id,
    session,
    status,
    assigneeStaffId: assigneeRaw,
  });
  revalidatePath("/admin/tasks");
  revalidatePath(next);
  if (!result.ok) redirect(`${next}?error=${result.error}`);
  redirect(next);
}

function sopInputFromForm(formData: FormData) {
  return {
    title: str(formData, "title"),
    sopCode: str(formData, "sopCode"),
    description: str(formData, "description"),
    body: str(formData, "body"),
    audiences: parseAudienceList(formData.getAll("audience").map((value) => String(value))),
    categorySlug: opt(formData, "categorySlug"),
    serviceSlug: opt(formData, "serviceSlug"),
    effectiveDate: opt(formData, "effectiveDate"),
    reviewDate: opt(formData, "reviewDate"),
  };
}

export async function saveKnowledgeAction(formData: FormData) {
  const session = await actor("knowledge");
  const id = opt(formData, "id");
  const input = sopInputFromForm(formData);
  if (!input.audiences.length) input.audiences = [...SOP_AUDIENCES.filter((row) => row === "ops")];
  const result = id
    ? await updateInternalSop(id, input, session.email)
    : await createInternalSop(input, session.email);
  if (!result.ok) redirect(`/admin/knowledge/${id || "new"}?error=${result.error}`);
  revalidatePath("/admin/knowledge");
  redirect(`/admin/knowledge/${result.row.id}?ok=1`);
}

export async function setKnowledgeStatusAction(formData: FormData) {
  const session = await actor("knowledge");
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (status !== "DRAFT" && status !== "ACTIVE" && status !== "ARCHIVED") redirect("/admin/knowledge");
  const result = await setInternalSopStatus(id, status, session.email);
  if (!result.ok) redirect("/admin/knowledge?error=missing");
  revalidatePath("/admin/knowledge");
  redirect(`/admin/knowledge/${id}`);
}

function amcInputFromForm(formData: FormData) {
  return {
    customerId: str(formData, "customerId"),
    reference: str(formData, "reference"),
    startDate: str(formData, "startDate"),
    endDate: str(formData, "endDate"),
    frequency: str(formData, "frequency"),
    coveredServices: str(formData, "coveredServices"),
    locationLabel: str(formData, "locationLabel"),
    propertyLabel: str(formData, "propertyLabel"),
    notes: str(formData, "notes"),
    status: (str(formData, "status") === "inactive" ? "inactive" : "active") as "active" | "inactive",
  };
}

export async function saveAmcAction(formData: FormData) {
  const session = await actor("amc");
  const id = opt(formData, "id");
  const input = amcInputFromForm(formData);
  const result = id ? await updateAmcContract(id, input, session.email) : await createAmcContract(input, session.email);
  if (!result.ok) redirect(`/admin/amc/${id || "new"}?error=${result.error}`);
  revalidatePath("/admin/amc");
  redirect(`/admin/amc/${result.row.id}`);
}
