import { prisma } from "../src/server/db";
import { hashRateLimitKey } from "../src/server/rate-limit";
import { createPublicBooking } from "../src/lib/bookings";
import { createInvoice, updateInvoice, type InvoiceInput } from "../src/lib/admin/invoices";
import { createWorkOrderFromBooking, persistWorkOrderUpdate } from "../src/lib/admin/work-orders";
import { createPublicReview, getApprovedServiceReviews } from "../src/lib/reviews";
import { createPublicQuestion, getApprovedQuestions } from "../src/lib/questions";
import { setReviewModeration, setQuestionModeration } from "../src/lib/moderation";
import { EXAMPLE_AUTOMATION_RULES, upsertDisabledExampleRules } from "../src/lib/automation/catalog";
import { emitDomainEventSafe } from "../src/lib/automation/emit";
import { enqueueDomainEventSafe } from "../src/lib/automation/enqueue";
import { processJob } from "../src/lib/automation/engine";
import { assignStaffForAutomation, assertTechnicianAssignmentAllowed } from "../src/lib/automation/assign";
import { canViewTask, canViewTasks, tasksVisibleTo, updateOpsTask } from "../src/lib/automation/tasks";
import { containsBlockedPrivacy } from "../src/lib/automation/privacy";
import { can } from "../src/lib/admin/rbac";
import type { StaffSession } from "../src/lib/admin/auth";
import type { InvoiceStatus } from "@prisma/client";

const PHONE = "+9715090385";
const ids = {
  rules: [] as string[],
  leads: [] as string[],
  bookings: [] as string[],
  workOrders: [] as string[],
  invoices: [] as string[],
  reviews: [] as string[],
  questions: [] as string[],
  staff: [] as string[],
  services: [] as string[],
  categories: [] as string[],
  locations: [] as string[],
  tasks: [] as string[],
};

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function session(role: string, staffId: string | null = null): StaffSession {
  return { id: `user-${role}`, email: `${role}@verify.local`, name: role, role, staffId };
}

function invoiceFields(status: InvoiceStatus, phone: string): InvoiceInput {
  return {
    customerName: "2F53 Invoice",
    customerPhone: phone,
    locationLabel: "Verify Loc",
    serviceLabel: "Verify Service",
    notes: "",
    subtotalLabel: "",
    discountLabel: "",
    taxLabel: "",
    totalLabel: "",
    issueDate: "2026-09-08",
    status,
    items: [{ description: "Item", quantity: "1", unit: "job", unitPrice: "0", lineTotal: "0" }],
  };
}

async function makeRule(data: Parameters<typeof prisma.automationRule.create>[0]["data"]) {
  const row = await prisma.automationRule.create({
    data: { ...data, enabled: data.enabled ?? true, updatedBy: "verify" },
  });
  ids.rules.push(row.id);
  return row;
}

async function jobCount(trigger: string, subjectId: string) {
  return prisma.automationJob.count({ where: { trigger: trigger as never, subjectId } });
}

async function drain(subjectIds: string[]) {
  for (let i = 0; i < 50; i += 1) {
    const job = await prisma.automationJob.findFirst({
      where: {
        subjectId: { in: subjectIds },
        status: { in: ["pending", "failed"] },
        runAt: { lte: new Date() },
      },
      orderBy: { runAt: "asc" },
    });
    if (!job) return;
    const claimed = await prisma.automationJob.updateMany({
      where: { id: job.id, status: job.status },
      data: { status: "running" },
    });
    if (claimed.count !== 1) continue;
    const fresh = await prisma.automationJob.findUnique({ where: { id: job.id } });
    if (fresh) await processJob(fresh);
  }
}

async function wipeLeftovers() {
  const reviewIps = ["198.51.100.21", "198.51.100.22", "198.51.100.31", "198.51.100.32", "198.51.100.33", "198.51.100.41"];
  await prisma.rateLimitBucket.deleteMany({
    where: { keyHash: { in: reviewIps.flatMap((ip) => [hashRateLimitKey(`review:${ip}`), hashRateLimitKey(`question:${ip}`), hashRateLimitKey(`booking:${ip}`)]) } },
  });
  const leftoverLeads = await prisma.lead.findMany({
    where: { OR: [{ phone: { startsWith: PHONE } }, { id: { in: ids.leads } }] },
    select: { id: true },
  });
  const leftoverLeadIds = leftoverLeads.map((row) => row.id);
  const leftoverBookings = await prisma.booking.findMany({
    where: { OR: [{ phone: { startsWith: PHONE } }, { id: { in: ids.bookings } }] },
    select: { id: true },
  });
  const leftoverInvoices = await prisma.invoice.findMany({
    where: { OR: [{ customerPhone: { startsWith: PHONE } }, { id: { in: ids.invoices } }] },
    select: { id: true },
  });
  const leftoverWo = await prisma.workOrder.findMany({
    where: {
      OR: [{ id: { in: ids.workOrders } }, { bookingId: { in: leftoverBookings.map((row) => row.id) } }],
    },
    select: { id: true },
  });
  const leftoverReviews = await prisma.review.findMany({
    where: { OR: [{ authorName: { startsWith: "2F53" } }, { id: { in: ids.reviews } }] },
    select: { id: true },
  });
  const leftoverQuestions = await prisma.question.findMany({
    where: { OR: [{ body: { startsWith: "2F53 QNA" } }, { id: { in: ids.questions } }] },
    select: { id: true },
  });
  const verifyRules = await prisma.automationRule.findMany({
    where: { OR: [{ key: { startsWith: "2f53-verify-" } }, { id: { in: ids.rules } }] },
    select: { id: true },
  });
  const ruleIds = verifyRules.map((row) => row.id);
  const subjectIds = [
    ...leftoverLeadIds,
    ...leftoverBookings.map((row) => row.id),
    ...leftoverWo.map((row) => row.id),
    ...leftoverInvoices.map((row) => row.id),
    ...leftoverReviews.map((row) => row.id),
    ...leftoverQuestions.map((row) => row.id),
  ];
  if (ruleIds.length) await prisma.automationRun.deleteMany({ where: { ruleId: { in: ruleIds } } });
  if (subjectIds.length) {
    await prisma.automationRun.deleteMany({ where: { subjectId: { in: subjectIds } } });
    await prisma.automationJob.deleteMany({ where: { subjectId: { in: subjectIds } } });
    await prisma.opsTask.deleteMany({ where: { subjectId: { in: subjectIds } } });
  }
  if (ruleIds.length) {
    await prisma.opsTask.deleteMany({ where: { ruleId: { in: ruleIds } } });
    await prisma.automationJob.deleteMany({ where: { ruleId: { in: ruleIds } } });
    await prisma.automationRule.deleteMany({ where: { id: { in: ruleIds } } });
  }
  await prisma.opsTask.deleteMany({ where: { title: { startsWith: "2F53" } } });
  if (leftoverInvoices.length) {
    await prisma.payment.deleteMany({ where: { invoiceId: { in: leftoverInvoices.map((row) => row.id) } } });
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: leftoverInvoices.map((row) => row.id) } } });
    await prisma.invoice.deleteMany({ where: { id: { in: leftoverInvoices.map((row) => row.id) } } });
  }
  if (leftoverReviews.length) {
    await prisma.reviewVote.deleteMany({ where: { reviewId: { in: leftoverReviews.map((row) => row.id) } } });
    await prisma.review.deleteMany({ where: { id: { in: leftoverReviews.map((row) => row.id) } } });
  }
  if (leftoverQuestions.length) await prisma.question.deleteMany({ where: { id: { in: leftoverQuestions.map((row) => row.id) } } });
  if (leftoverWo.length) await prisma.workOrder.deleteMany({ where: { id: { in: leftoverWo.map((row) => row.id) } } });
  if (leftoverBookings.length) await prisma.booking.deleteMany({ where: { id: { in: leftoverBookings.map((row) => row.id) } } });
  if (leftoverLeadIds.length) {
    await prisma.leadScoreHistory.deleteMany({ where: { leadId: { in: leftoverLeadIds } } });
    await prisma.leadScore.deleteMany({ where: { leadId: { in: leftoverLeadIds } } });
    await prisma.lead.deleteMany({ where: { id: { in: leftoverLeadIds } } });
  }
  await prisma.staff.deleteMany({
    where: { staffCode: { in: ["2F53-SKILL", "2F53-SKILL-B", "2F53-NOSKILL", "2F53-SALES"] } },
  });
  const leftoverServices = await prisma.service.findMany({ where: { slug: "2f53-verify-service" }, select: { id: true } });
  if (leftoverServices.length) {
    await prisma.serviceI18n.deleteMany({ where: { serviceId: { in: leftoverServices.map((row) => row.id) } } });
    await prisma.service.deleteMany({ where: { id: { in: leftoverServices.map((row) => row.id) } } });
  }
  const leftoverCats = await prisma.serviceCategory.findMany({ where: { slug: "2f53-verify-cat" }, select: { id: true } });
  if (leftoverCats.length) {
    await prisma.serviceCategoryI18n.deleteMany({ where: { categoryId: { in: leftoverCats.map((row) => row.id) } } });
    await prisma.serviceCategory.deleteMany({ where: { id: { in: leftoverCats.map((row) => row.id) } } });
  }
  const leftoverLocs = await prisma.location.findMany({ where: { slug: "2f53-verify-loc" }, select: { id: true } });
  if (leftoverLocs.length) {
    await prisma.locationI18n.deleteMany({ where: { locationId: { in: leftoverLocs.map((row) => row.id) } } });
    await prisma.location.deleteMany({ where: { id: { in: leftoverLocs.map((row) => row.id) } } });
  }
}

async function main() {
  await wipeLeftovers();
  await upsertDisabledExampleRules(prisma);
  await prisma.automationRule.updateMany({
    where: { key: { in: EXAMPLE_AUTOMATION_RULES.map((rule) => rule.key) } },
    data: { enabled: false },
  });

  const category = await prisma.serviceCategory.create({
    data: { slug: "2f53-verify-cat", sortOrder: 97, translations: { create: [{ locale: "en", name: "Verify 2F53" }] } },
  });
  ids.categories.push(category.id);
  const service = await prisma.service.create({
    data: {
      categoryId: category.id,
      slug: "2f53-verify-service",
      serviceType: "maintenance",
      status: "active",
      indexable: true,
      bookingEnabled: true,
      translations: {
        create: [
          {
            locale: "en",
            name: "Verify Service",
            shortDescription: "v",
            longDescription: "v",
            professionalFallback: "v",
            seoTitle: "v",
            metaDescription: "v",
          },
        ],
      },
    },
  });
  ids.services.push(service.id);
  const location = await prisma.location.create({
    data: {
      slug: "2f53-verify-loc",
      type: "emirate",
      status: "active",
      serves: true,
      indexable: true,
      translations: { create: [{ locale: "en", name: "Verify Loc", intro: "", seoTitle: "v", metaDescription: "v" }] },
    },
  });
  ids.locations.push(location.id);
  const skilled = await prisma.staff.create({
    data: {
      staffCode: "2F53-SKILL",
      role: "technician",
      status: "active",
      skills: { create: { categorySlug: "2f53-verify-cat", locationSlug: "2f53-verify-loc" } },
    },
  });
  const skilledB = await prisma.staff.create({
    data: {
      staffCode: "2F53-SKILL-B",
      role: "technician",
      status: "active",
      skills: { create: { categorySlug: "2f53-verify-cat", locationSlug: "2f53-verify-loc" } },
    },
  });
  const unskilled = await prisma.staff.create({ data: { staffCode: "2F53-NOSKILL", role: "technician", status: "active" } });
  const sales = await prisma.staff.create({ data: { staffCode: "2F53-SALES", role: "sales", status: "active" } });
  ids.staff.push(skilled.id, skilledB.id, unskilled.id, sales.id);

  const actor = { id: "verify-2f53", email: "verify-2f53@alnajah.local" };
  const bookingA = await createPublicBooking(
    {
      type: "standard",
      name: "2F53 Booking A",
      phone: `${PHONE}01`,
      requirement: "Please book a plumber visit this week.",
      serviceSlug: "2f53-verify-service",
      locationSlug: "2f53-verify-loc",
      city: "Dubai",
      area: "Marina",
      locale: "en",
      source: "booking",
    },
    "198.51.100.21",
  );
  assert(bookingA.ok && "id" in bookingA && bookingA.id, "booking A created");
  ids.bookings.push(bookingA.id);
  const bookingARow = await prisma.booking.findUnique({ where: { id: bookingA.id } });
  if (bookingARow?.leadId) ids.leads.push(bookingARow.leadId);

  const woA = await createWorkOrderFromBooking(bookingA.id, actor.email);
  assert(woA, "work order created from booking");
  ids.workOrders.push(woA.id);
  assert(woA.status === "created", "WO without technician stays created");
  assert((await jobCount("WORK_ORDER_ASSIGNED", woA.id)) === 0, "unassigned create does not emit ASSIGNED");
  assert((await jobCount("WORK_ORDER_STARTED", woA.id)) === 0, "create does not emit STARTED");
  assert((await jobCount("WORK_ORDER_COMPLETED", woA.id)) === 0, "create does not emit COMPLETED");

  const woAgain = await createWorkOrderFromBooking(bookingA.id, actor.email);
  assert(woAgain?.id === woA.id, "create-from-booking is idempotent");
  assert((await jobCount("WORK_ORDER_ASSIGNED", woA.id)) === 0, "idempotent create does not emit");

  const skillGate = await assertTechnicianAssignmentAllowed(unskilled.id, {
    categorySlug: "2f53-verify-cat",
    locationSlug: "2f53-verify-loc",
  });
  assert(!skillGate.ok && skillGate.error === "skill", "StaffSkill rejects unskilled technician");

  const assigned = await persistWorkOrderUpdate(woA.id, { technicianId: skilled.id }, actor.email);
  assert(assigned?.technicianId === skilled.id, "human technician assignment stored");
  assert((await jobCount("WORK_ORDER_ASSIGNED", woA.id)) === 1, "WORK_ORDER_ASSIGNED on first technician");
  await persistWorkOrderUpdate(woA.id, { technicianId: skilled.id, status: "assigned" }, actor.email);
  assert((await jobCount("WORK_ORDER_ASSIGNED", woA.id)) === 1, "staying assigned does not duplicate");

  const assignRule = await makeRule({
    key: "2f53-verify-assign-tech",
    name: "Assign tech",
    trigger: "WORK_ORDER_ASSIGNED",
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([{ type: "ASSIGN_STAFF", role: "technician", target: "work_order_technician" }]),
  });
  await emitDomainEventSafe({
    trigger: "WORK_ORDER_ASSIGNED",
    subjectId: woA.id,
    occurrenceKey: "assign-after-human",
  });
  await drain([woA.id]);
  const afterHuman = await prisma.workOrder.findUnique({ where: { id: woA.id } });
  assert(afterHuman?.technicianId === skilled.id, "automation does not overwrite human WO assignment");
  assert(assignRule.id, "assign rule created");

  await persistWorkOrderUpdate(woA.id, { status: "in_progress" }, actor.email);
  assert((await jobCount("WORK_ORDER_STARTED", woA.id)) === 1, "WORK_ORDER_STARTED on in_progress");
  await persistWorkOrderUpdate(woA.id, { status: "in_progress" }, actor.email);
  assert((await jobCount("WORK_ORDER_STARTED", woA.id)) === 1, "staying in_progress does not duplicate STARTED");

  const invoicesBeforeComplete = await prisma.invoice.count();
  const completeRule = await makeRule({
    key: "2f53-verify-wo-complete",
    name: "WO complete tasks",
    trigger: "WORK_ORDER_COMPLETED",
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([
      { type: "CREATE_INVOICE_TASK", title: "2F53 create invoice" },
      { type: "CREATE_REVIEW_REQUEST_TASK", title: "2F53 request review" },
    ]),
  });
  const forbiddenWo = await makeRule({
    key: "2f53-verify-forbidden-wo",
    name: "Forbidden on complete",
    trigger: "WORK_ORDER_COMPLETED",
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([
      { type: "CREATE_INVOICE" },
      { type: "CREATE_WORK_ORDER" },
      { type: "MODIFY_PRICE" },
      { type: "DELETE_CUSTOMER" },
    ]),
  });
  await persistWorkOrderUpdate(woA.id, { status: "completed" }, actor.email);
  assert((await jobCount("WORK_ORDER_COMPLETED", woA.id)) === 1, "WORK_ORDER_COMPLETED on completed");
  await persistWorkOrderUpdate(woA.id, { status: "completed" }, actor.email);
  assert((await jobCount("WORK_ORDER_COMPLETED", woA.id)) === 1, "staying completed does not duplicate");
  await drain([woA.id]);
  const completeTasks = await prisma.opsTask.findMany({ where: { ruleId: completeRule.id }, orderBy: { createdAt: "asc" } });
  assert(completeTasks.length === 2, "completed WO creates invoice + review-request tasks");
  assert(completeTasks.some((row) => row.kind === "invoice"), "CREATE_INVOICE_TASK kind is invoice");
  assert(completeTasks.some((row) => row.kind === "review_request"), "CREATE_REVIEW_REQUEST_TASK kind is review_request");
  ids.tasks.push(...completeTasks.map((row) => row.id));
  assert((await prisma.invoice.count()) === invoicesBeforeComplete, "completed WO must not create an Invoice");
  const woStill = await prisma.workOrder.findUnique({ where: { id: woA.id } });
  assert(woStill?.status === "completed", "work order remains completed");
  const forbiddenWoRun = await prisma.automationRun.findFirst({
    where: { ruleId: forbiddenWo.id },
    orderBy: { createdAt: "desc" },
  });
  const forbiddenWoActions = JSON.parse(forbiddenWoRun?.actionsJson || "[]") as Array<{ error?: string }>;
  assert(forbiddenWoActions.every((row) => row.error === "forbidden_action"), "forbidden WO actions fail safely");
  await drain([woA.id]);
  assert((await prisma.opsTask.count({ where: { ruleId: completeRule.id } })) === 2, "WO complete tasks are idempotent");
  const invoiceTaskAudit = await prisma.auditLog.findFirst({
    where: { action: "task.create", entityId: completeTasks[0].id },
  });
  assert(invoiceTaskAudit, "task creation audited");

  const bookingB = await createPublicBooking(
    {
      type: "standard",
      name: "2F53 Booking B",
      phone: `${PHONE}02`,
      requirement: "Second visit for automation assign.",
      serviceSlug: "2f53-verify-service",
      locationSlug: "2f53-verify-loc",
      city: "Dubai",
      area: "Marina",
      locale: "en",
      source: "booking",
    },
    "198.51.100.22",
  );
  assert(bookingB.ok && "id" in bookingB && bookingB.id, "booking B created");
  ids.bookings.push(bookingB.id);
  const bookingBRow = await prisma.booking.findUnique({ where: { id: bookingB.id } });
  if (bookingBRow?.leadId) ids.leads.push(bookingBRow.leadId);
  const woB = await createWorkOrderFromBooking(bookingB.id, actor.email);
  assert(woB, "work order B created");
  ids.workOrders.push(woB.id);
  await makeRule({
    key: "2f53-verify-auto-assign",
    name: "Auto assign on start",
    trigger: "WORK_ORDER_STARTED",
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([{ type: "ASSIGN_STAFF", role: "technician", target: "work_order_technician" }]),
  });
  await persistWorkOrderUpdate(woB.id, { status: "in_progress" }, actor.email);
  await drain([woB.id]);
  const autoAssigned = await prisma.workOrder.findUnique({ where: { id: woB.id } });
  assert(autoAssigned?.technicianId === skilled.id, "automation assigns matching technician");
  assert((await jobCount("WORK_ORDER_ASSIGNED", woB.id)) === 1, "automation technician assign emits WORK_ORDER_ASSIGNED");

  const draft = await createInvoice(invoiceFields("DRAFT", `${PHONE}03`), actor);
  ids.invoices.push(draft.id);
  assert((await jobCount("INVOICE_ISSUED", draft.id)) === 0, "DRAFT create does not emit ISSUED");
  assert((await jobCount("INVOICE_PAID", draft.id)) === 0, "DRAFT create does not emit PAID");
  await updateInvoice(draft.id, invoiceFields("DRAFT", `${PHONE}03`), actor.email);
  assert((await jobCount("INVOICE_ISSUED", draft.id)) === 0, "staying DRAFT does not emit");

  const issued = await updateInvoice(draft.id, invoiceFields("ISSUED", `${PHONE}03`), actor.email);
  assert(issued, "invoice issued");
  assert((await jobCount("INVOICE_ISSUED", draft.id)) === 1, "INVOICE_ISSUED on transition to ISSUED");
  await updateInvoice(draft.id, invoiceFields("ISSUED", `${PHONE}03`), actor.email);
  assert((await jobCount("INVOICE_ISSUED", draft.id)) === 1, "staying ISSUED does not duplicate");
  await updateInvoice(draft.id, invoiceFields("PARTIALLY_PAID", `${PHONE}03`), actor.email);
  assert((await jobCount("INVOICE_PAID", draft.id)) === 0, "PARTIALLY_PAID does not emit INVOICE_PAID");

  await prisma.payment.create({ data: { invoiceId: draft.id, status: "unconfigured" } });
  assert((await jobCount("INVOICE_PAID", draft.id)) === 0, "Payment.unconfigured never triggers INVOICE_PAID");

  const delayRule = await makeRule({
    key: "2f53-verify-issued-delay",
    name: "Delayed issued",
    trigger: "INVOICE_ISSUED",
    delaySeconds: 7200,
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([{ type: "CREATE_TASK", title: "2F53 issued follow-up" }]),
  });
  const issuedAtCreate = await createInvoice(invoiceFields("ISSUED", `${PHONE}04`), actor);
  ids.invoices.push(issuedAtCreate.id);
  assert((await jobCount("INVOICE_ISSUED", issuedAtCreate.id)) === 1, "create-as-ISSUED emits INVOICE_ISSUED");
  assert((await jobCount("INVOICE_PAID", issuedAtCreate.id)) === 0, "create-as-ISSUED does not emit PAID");
  await drain([issuedAtCreate.id]);
  const delayedChild = await prisma.automationJob.findFirst({
    where: { trigger: "INVOICE_ISSUED", subjectId: issuedAtCreate.id, ruleId: delayRule.id },
  });
  assert(delayedChild, "INVOICE_ISSUED delay enqueues a child job");
  await updateInvoice(issuedAtCreate.id, invoiceFields("PAID", `${PHONE}04`), actor.email);
  assert((await jobCount("INVOICE_PAID", issuedAtCreate.id)) === 1, "INVOICE_PAID when status becomes PAID");
  await prisma.automationJob.update({
    where: { id: delayedChild.id },
    data: { runAt: new Date(Date.now() - 1000), status: "pending" },
  });
  await drain([issuedAtCreate.id]);
  const skipRun = await prisma.automationRun.findFirst({
    where: { ruleId: delayRule.id },
    orderBy: { createdAt: "desc" },
  });
  assert(skipRun?.error === "invoice_not_issued", "delayed ISSUED skips after status leaves ISSUED");
  assert((await prisma.opsTask.count({ where: { ruleId: delayRule.id } })) === 0, "skipped issued rule creates no task");

  const paidCreate = await createInvoice(invoiceFields("PAID", `${PHONE}05`), actor);
  ids.invoices.push(paidCreate.id);
  assert((await jobCount("INVOICE_ISSUED", paidCreate.id)) === 0, "create-as-PAID does not emit ISSUED");
  assert((await jobCount("INVOICE_PAID", paidCreate.id)) === 1, "create-as-PAID emits INVOICE_PAID");
  await updateInvoice(paidCreate.id, invoiceFields("PAID", `${PHONE}05`), actor.email);
  assert((await jobCount("INVOICE_PAID", paidCreate.id)) === 1, "staying PAID does not duplicate");

  const paidRule = await makeRule({
    key: "2f53-verify-paid",
    name: "Paid task",
    trigger: "INVOICE_PAID",
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([{ type: "CREATE_TASK", title: "2F53 paid follow-up" }]),
  });
  const notifyRule = await makeRule({
    key: "2f53-verify-notify",
    name: "Customer email",
    trigger: "INVOICE_PAID",
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([{ type: "SEND_NOTIFICATION", channel: "email", audience: "customer", title: "2F53 paid" }]),
  });
  await drain([paidCreate.id]);
  const paidTasks = await prisma.opsTask.findMany({ where: { ruleId: paidRule.id } });
  assert(paidTasks.length === 1, "INVOICE_PAID creates a task");
  ids.tasks.push(paidTasks[0].id);
  const notifyRun = await prisma.automationRun.findFirst({
    where: { ruleId: notifyRule.id },
    orderBy: { createdAt: "desc" },
  });
  const notifyActions = JSON.parse(notifyRun?.actionsJson || "[]") as Array<{ error?: string }>;
  assert(notifyActions.some((row) => row.error === "provider_unconfigured"), "customer email skipped without provider");

  const high = await createPublicReview(
    {
      type: "service",
      stars: 5,
      body: "Great service and the team was professional throughout.",
      authorName: "2F53 Reviewer High",
      serviceSlug: "2f53-verify-service",
      locationSlug: "2f53-verify-loc",
      locale: "en",
    },
    "198.51.100.31",
  );
  assert(high.ok && "id" in high && high.id, "high rating review created");
  ids.reviews.push(high.id);
  const highRow = await prisma.review.findUnique({ where: { id: high.id } });
  assert(highRow?.status === "PENDING", "new review stays PENDING");
  assert((await jobCount("REVIEW_RECEIVED", high.id)) === 1, "REVIEW_RECEIVED on create");
  assert((await jobCount("LOW_RATING_REVIEW", high.id)) === 0, "5-star does not emit LOW_RATING_REVIEW");
  const highDup = await createPublicReview(
    {
      type: "service",
      stars: 5,
      body: "Great service and the team was professional throughout.",
      authorName: "2F53 Reviewer High",
      serviceSlug: "2f53-verify-service",
      locationSlug: "2f53-verify-loc",
      locale: "en",
    },
    "198.51.100.31",
  );
  assert(highDup.ok && "duplicate" in highDup && highDup.duplicate, "duplicate review ignored");
  assert((await jobCount("REVIEW_RECEIVED", high.id)) === 1, "duplicate review does not re-emit");
  await setReviewModeration(high.id, "APPROVED");
  assert((await jobCount("REVIEW_RECEIVED", high.id)) === 1, "moderation does not emit REVIEW_RECEIVED");
  assert((await jobCount("LOW_RATING_REVIEW", high.id)) === 0, "moderation does not emit LOW_RATING_REVIEW");

  const lowRatingRule = await makeRule({
    key: "2f53-verify-low-rating",
    name: "Low rating CS",
    trigger: "LOW_RATING_REVIEW",
    enabled: true,
    conditionsJson: JSON.stringify([{ field: "stars", op: "lte", value: 2 }]),
    actionsJson: JSON.stringify([{ type: "CREATE_TASK", kind: "customer_service", title: "2F53 CS follow-up" }]),
  });
  const forbiddenReview = await makeRule({
    key: "2f53-verify-forbidden-review",
    name: "Forbidden review actions",
    trigger: "LOW_RATING_REVIEW",
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([{ type: "APPROVE_REVIEW" }, { type: "REJECT_REVIEW" }]),
  });
  const low = await createPublicReview(
    {
      type: "service",
      stars: 2,
      body: "The visit was poor and I am not satisfied with the work.",
      authorName: "2F53 Reviewer Low",
      serviceSlug: "2f53-verify-service",
      locationSlug: "2f53-verify-loc",
      locale: "en",
    },
    "198.51.100.32",
  );
  assert(low.ok && "id" in low && low.id, "low rating review created");
  ids.reviews.push(low.id);
  const lowRow = await prisma.review.findUnique({ where: { id: low.id } });
  assert(lowRow?.status === "PENDING", "low rating stays PENDING for human moderation");
  assert((await jobCount("REVIEW_RECEIVED", low.id)) === 1, "REVIEW_RECEIVED for low rating");
  assert((await jobCount("LOW_RATING_REVIEW", low.id)) === 1, "LOW_RATING_REVIEW when stars <= 2");
  await drain([low.id]);
  const csTasks = await prisma.opsTask.findMany({ where: { ruleId: lowRatingRule.id } });
  assert(csTasks.length === 1, "low rating creates customer-service task");
  assert(csTasks[0].kind === "customer_service", "CS task kind");
  ids.tasks.push(csTasks[0].id);
  const stillPending = await prisma.review.findUnique({ where: { id: low.id } });
  assert(stillPending?.status === "PENDING", "automation does not approve or reject the review");
  const forbiddenReviewRun = await prisma.automationRun.findFirst({
    where: { ruleId: forbiddenReview.id },
    orderBy: { createdAt: "desc" },
  });
  const forbiddenReviewActions = JSON.parse(forbiddenReviewRun?.actionsJson || "[]") as Array<{ error?: string }>;
  assert(forbiddenReviewActions.every((row) => row.error === "forbidden_action"), "approve/reject review actions fail");
  await setReviewModeration(low.id, "APPROVED");
  const approvedLow = await prisma.review.findUnique({ where: { id: low.id } });
  assert(approvedLow?.status === "APPROVED", "human can approve a negative review");
  const publicLow = await getApprovedServiceReviews({ serviceId: service.id });
  assert(publicLow.some((row) => row.id === low.id && row.stars === 2), "negative review remains public after approval");

  await emitDomainEventSafe({ trigger: "LOW_RATING_REVIEW", subjectId: high.id, occurrenceKey: "forced-low" });
  await drain([high.id]);
  const skipLow = await prisma.automationRun.findFirst({
    where: { ruleId: lowRatingRule.id, subjectId: high.id },
    orderBy: { createdAt: "desc" },
  });
  assert(skipLow?.error === "not_low_rating", "engine skips LOW_RATING_REVIEW when stars > 2");
  assert((await prisma.opsTask.count({ where: { ruleId: lowRatingRule.id } })) === 1, "high rating does not create extra CS task");

  const qna = await createPublicQuestion(
    { askerName: "2F53 Asker", body: "2F53 QNA how often should filters be replaced please?", locale: "en" },
    "198.51.100.41",
  );
  assert(qna.ok && "id" in qna && qna.id, "question created");
  ids.questions.push(qna.id);
  const qnaRow = await prisma.question.findUnique({ where: { id: qna.id } });
  assert(qnaRow?.moderationStatus === "PENDING" && qnaRow.status === "draft", "Q&A stays PENDING draft");
  assert((await jobCount("QNA_RECEIVED", qna.id)) === 1, "QNA_RECEIVED after successful create");
  const qnaDup = await createPublicQuestion(
    { askerName: "2F53 Asker", body: "2F53 QNA how often should filters be replaced please?", locale: "en" },
    "198.51.100.41",
  );
  assert(qnaDup.ok && "duplicate" in qnaDup && qnaDup.duplicate, "duplicate question ignored");
  assert((await jobCount("QNA_RECEIVED", qna.id)) === 1, "duplicate Q&A does not re-emit");
  const publicQa = await getApprovedQuestions({});
  assert(!publicQa.some((row) => row.id === qna.id), "PENDING Q&A is not published");
  await setQuestionModeration(qna.id, "APPROVED");
  const afterMod = await prisma.question.findUnique({ where: { id: qna.id } });
  assert(afterMod?.status === "draft", "approval without answer does not auto-publish");
  assert((await jobCount("QNA_RECEIVED", qna.id)) === 1, "moderation does not emit QNA_RECEIVED");

  const throwingPayload: Record<string, string> = {};
  Object.defineProperty(throwingPayload, "ip", {
    enumerable: true,
    get() {
      throw new Error("payload boom");
    },
  });
  const isolatedReview = await createPublicReview(
    {
      type: "service",
      stars: 4,
      body: "Solid work overall and I would book again next season.",
      authorName: "2F53 Reviewer Iso",
      serviceSlug: "2f53-verify-service",
      locale: "en",
    },
    "198.51.100.33",
  );
  assert(isolatedReview.ok && "id" in isolatedReview && isolatedReview.id, "isolation review created");
  ids.reviews.push(isolatedReview.id);
  const isolatedEnqueue = await enqueueDomainEventSafe({
    trigger: "REVIEW_RECEIVED",
    subjectType: "Review",
    subjectId: isolatedReview.id,
    occurrenceKey: "isolation",
    payload: throwingPayload,
  });
  assert(isolatedEnqueue.ok === false, "automation enqueue failure is swallowed");
  assert(await prisma.review.findUnique({ where: { id: isolatedReview.id } }), "review write survives automation failure");
  const isolatedQna = await prisma.question.findUnique({ where: { id: qna.id } });
  assert(isolatedQna, "question write is independent of later automation failure");

  const jobs = await prisma.automationJob.findMany({
    where: {
      subjectId: { in: [...ids.workOrders, ...ids.invoices, ...ids.reviews, ...ids.questions] },
    },
  });
  assert(jobs.every((job) => !containsBlockedPrivacy(JSON.parse(job.payloadJson || "{}"))), "job payloads have no private fields");
  assert(jobs.every((job) => !job.payloadJson.toLowerCase().includes("body")), "review/Q&A body is not stored on jobs");

  const manager = session("manager");
  const salesSession = session("sales");
  const cs = session("customer_service");
  const supervisor = session("supervisor", "sup-1");
  const tech = session("technician", skilled.id);
  const content = session("content_manager");
  const invoiceTask = completeTasks.find((row) => row.kind === "invoice");
  assert(invoiceTask, "invoice task exists");
  assert(canViewTasks("manager") && canViewTasks("technician") && canViewTasks("customer_service"), "operational roles can view tasks");
  assert(!canViewTasks("content_manager"), "content_manager cannot view tasks");
  assert(canViewTask(manager, invoiceTask), "manager sees WO tasks");
  assert(canViewTask(supervisor, invoiceTask), "supervisor sees WO tasks");
  assert(!canViewTask(salesSession, invoiceTask), "sales does not see work-order tasks");
  assert(!canViewTask(content, invoiceTask), "content_manager sees no operational tasks");
  assert(canViewTask(cs, csTasks[0]), "customer service sees review follow-up tasks");
  assert(!can("technician", "invoices"), "technician cannot manage invoices");
  assert(!can("content_manager", "work_orders"), "content_manager cannot manage work orders");
  assert(!can("content_manager", "automation"), "content_manager cannot manage automation");
  assert(can("manager", "automation") && can("manager", "invoices"), "manager may manage automation and invoices");
  assert(can("customer_service", "reviews") && can("content_manager", "reviews"), "review moderation remains human RBAC");

  const techTasks = await tasksVisibleTo(tech);
  assert(techTasks.some((row) => row.id === invoiceTask.id), "technician sees tasks on assigned work");
  const contentTasks = await tasksVisibleTo(content);
  assert(contentTasks.length === 0, "content_manager task list is empty");

  const done = await updateOpsTask({ id: invoiceTask.id, session: manager, status: "done" });
  assert(done.ok, "manager completes task");
  const completeAudit = await prisma.auditLog.findFirst({ where: { action: "task.complete", entityId: invoiceTask.id } });
  assert(completeAudit, "task completion audited");
  const reviewTask = completeTasks.find((row) => row.kind === "review_request");
  assert(reviewTask, "review request task exists");
  const cancelled = await updateOpsTask({ id: reviewTask.id, session: manager, status: "cancelled" });
  assert(cancelled.ok, "manager cancels task");
  const cancelAudit = await prisma.auditLog.findFirst({ where: { action: "task.cancel", entityId: reviewTask.id } });
  assert(cancelAudit, "task cancellation audited");
  const reassign = await updateOpsTask({ id: csTasks[0].id, session: manager, assigneeStaffId: sales.id });
  assert(reassign.ok, "manager reassigns task");
  const reassignAudit = await prisma.auditLog.findFirst({ where: { action: "task.reassign", entityId: csTasks[0].id } });
  assert(reassignAudit, "task reassignment audited");
  const contentDenied = await updateOpsTask({ id: csTasks[0].id, session: content, status: "done" });
  assert(!contentDenied.ok && contentDenied.error === "forbidden", "content_manager cannot manage tasks");

  const autoAssign = await assignStaffForAutomation({
    target: "work_order_technician",
    role: "technician",
    subjectType: "WorkOrder",
    subjectId: woA.id,
    facts: { categorySlug: "2f53-verify-cat", locationSlug: "2f53-verify-loc" },
  });
  assert(!autoAssign.ok && "error" in autoAssign && autoAssign.error === "human_override", "human WO technician is preserved");

  const examples = await prisma.automationRule.findMany({
    where: { key: { in: EXAMPLE_AUTOMATION_RULES.map((rule) => rule.key) } },
  });
  assert(examples.every((rule) => !rule.enabled), "seed example rules remain disabled");
  const woSeed = examples.find((rule) => rule.key === "wo-completed-invoice-review");
  const lowSeed = examples.find((rule) => rule.key === "low-rating-cs");
  assert(woSeed && !woSeed.enabled, "WO completed example rule stays disabled");
  assert(lowSeed && !lowSeed.enabled, "low-rating example rule stays disabled");

  console.log("Phase 2F.5.3 verification passed.");
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await wipeLeftovers().catch((error) => console.error(error));
    await prisma.$disconnect();
  });
