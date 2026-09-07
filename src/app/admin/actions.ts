"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { BookingStatus, ContentStatus, InvoiceStatus, LeadStatus, LocationStatus, QuoteMethod, QuoteStatus, ReviewStatus, ServiceStatus, StaffRole } from "@prisma/client";
import { prisma } from "@/server/db";
import { clientIp } from "@/server/rate-limit";
import { getStaffSession, loginStaff, logoutStaff, requireStaff } from "@/lib/admin/auth";
import { isStaffRole } from "@/lib/admin/rbac";
import { hashPassword, verifyPassword } from "@/lib/admin/crypto";
import { bool, opt, parseLineItems, str } from "@/lib/admin/forms";
import { createQuote, updateQuote } from "@/lib/admin/quotes";
import { createInvoice, invoiceFromQuote, updateInvoice } from "@/lib/admin/invoices";
import { createWorkOrderFromBooking } from "@/lib/admin/work-orders";
import { adminAudit, nextWorkOrderNumber } from "@/lib/admin/numbers";
import { setBookingStatus, confirmBookingTime, assignBookingStaff } from "@/lib/bookings";
import { overrideLeadQuality } from "@/lib/quality/override";
import { respondToReview, setQuestionModeration, setReviewModeration, verifyServiceReview } from "@/lib/moderation";

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
  redirect("/admin/account?ok=1");
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
  await prisma.session.deleteMany({ where: { userId: id } });
  await adminAudit({ actor: session.email, action: "staff.password_reset", entity: "User", entityId: id });
  redirect("/admin/staff?ok=reset");
}

export async function updateLeadAction(formData: FormData) {
  const session = await actor("leads");
  const id = str(formData, "id");
  await prisma.lead.update({
    where: { id },
    data: {
      status: str(formData, "status") as LeadStatus,
      notes: str(formData, "notes"),
      assignedStaffId: opt(formData, "assignedStaffId"),
    },
  });
  await adminAudit({ actor: session.email, action: "lead.update", entity: "Lead", entityId: id });
  revalidatePath("/admin/leads");
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
    await assignBookingStaff(id, opt(formData, "technicianId"), opt(formData, "supervisorId"), session.email);
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
  redirect(`/admin/work-orders/${created.id}`);
}

export async function updateWorkOrderAction(formData: FormData) {
  const session = await actor("work_orders");
  const id = str(formData, "id");
  const existing = await prisma.workOrder.findUnique({ where: { id } });
  if (!existing) redirect("/admin/work-orders");
  if (session.role === "technician" && existing.technicianId !== session.staffId) redirect("/admin/work-orders");
  await prisma.workOrder.update({
    where: { id },
    data: {
      status: str(formData, "status") || existing.status,
      notes: str(formData, "notes"),
      qcResult: str(formData, "qcResult"),
      customerSignOff: bool(formData, "customerSignOff"),
      technicianId: opt(formData, "technicianId") || existing.technicianId,
      supervisorId: opt(formData, "supervisorId") || existing.supervisorId,
      scheduledDate: opt(formData, "scheduledDate") || existing.scheduledDate,
      scheduledTime: opt(formData, "scheduledTime") || existing.scheduledTime,
      scope: str(formData, "scope") || existing.scope,
    },
  });
  await adminAudit({ actor: session.email, action: "work_order.update", entity: "WorkOrder", entityId: id });
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
    await updateQuote(id, input, session.email);
    revalidatePath("/admin/quotes");
    redirect(`/admin/quotes/${id}`);
  }
  const row = await createQuote(input, session);
  redirect(`/admin/quotes/${row.id}`);
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
