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
  redirect(`/admin/leads/${id}`);
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
  redirect(`/admin/bookings/${id}`);
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

export async function updateServiceAction(formData: FormData) {
  const session = await actor("services");
  const id = str(formData, "id");
  await prisma.service.update({
    where: { id },
    data: {
      status: str(formData, "status") as ServiceStatus,
      indexable: bool(formData, "indexable"),
      bookingEnabled: bool(formData, "bookingEnabled"),
      diyAvailable: bool(formData, "diyAvailable"),
      emergencyAvailable: bool(formData, "emergencyAvailable"),
      amcAvailable: bool(formData, "amcAvailable"),
      inspectionRequired: bool(formData, "inspectionRequired"),
    },
  });
  const en = await prisma.serviceI18n.findFirst({ where: { serviceId: id, locale: "en" } });
  if (en) {
    await prisma.serviceI18n.update({
      where: { id: en.id },
      data: {
        name: str(formData, "nameEn") || en.name,
        shortDescription: str(formData, "shortEn") || en.shortDescription,
        longDescription: str(formData, "longEn") || en.longDescription,
      },
    });
  }
  await adminAudit({ actor: session.email, action: "service.update", entity: "Service", entityId: id });
  revalidatePath("/admin/services");
  redirect(`/admin/services/${id}`);
}

export async function updateLocationAction(formData: FormData) {
  const session = await actor("locations");
  const id = str(formData, "id");
  await prisma.location.update({
    where: { id },
    data: {
      status: str(formData, "status") as LocationStatus,
      serves: bool(formData, "serves"),
      indexable: bool(formData, "indexable"),
    },
  });
  const en = await prisma.locationI18n.findFirst({ where: { locationId: id, locale: "en" } });
  if (en) {
    await prisma.locationI18n.update({
      where: { id: en.id },
      data: {
        name: str(formData, "nameEn") || en.name,
        intro: str(formData, "introEn") || en.intro,
      },
    });
  }
  await adminAudit({ actor: session.email, action: "location.update", entity: "Location", entityId: id });
  revalidatePath("/admin/locations");
  redirect(`/admin/locations/${id}`);
}

export async function updateDiyAction(formData: FormData) {
  const session = await actor("diy");
  const id = str(formData, "id");
  const status = str(formData, "status") as ContentStatus;
  await prisma.diyGuide.update({
    where: { id },
    data: {
      status,
      indexable: bool(formData, "indexable"),
      publishedAt: status === "published" ? new Date() : null,
    },
  });
  const en = await prisma.diyGuideI18n.findFirst({ where: { guideId: id, locale: "en" } });
  if (en) {
    await prisma.diyGuideI18n.update({
      where: { id: en.id },
      data: {
        title: str(formData, "titleEn") || en.title,
        quickAnswer: str(formData, "quickAnswerEn") || en.quickAnswer,
        professionalFallback: str(formData, "fallbackEn") || en.professionalFallback,
      },
    });
  }
  await adminAudit({ actor: session.email, action: "diy.update", entity: "DiyGuide", entityId: id });
  revalidatePath("/admin/diy");
  redirect(`/admin/diy/${id}`);
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
