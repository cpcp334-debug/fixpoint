import { prisma } from "../src/server/db";
import { createLead } from "../src/lib/leads";
import { createPublicBooking, setBookingStatus, confirmBookingTime, assignBookingStaff } from "../src/lib/bookings";
import { createQuote, updateQuote, type QuoteInput } from "../src/lib/admin/quotes";
import { scoreLead, scoreLeadSafe } from "../src/lib/quality/run";
import { overrideLeadQuality } from "../src/lib/quality/override";
import { EXAMPLE_AUTOMATION_RULES, upsertDisabledExampleRules } from "../src/lib/automation/catalog";
import { emitDomainEventSafe } from "../src/lib/automation/emit";
import { enqueueDomainEventSafe } from "../src/lib/automation/enqueue";
import { processDueJobs } from "../src/lib/automation/tick";
import { assignLeadStaff, assertTechnicianAssignmentAllowed } from "../src/lib/automation/assign";
import { canViewTask, canViewTasks, tasksVisibleTo, updateOpsTask } from "../src/lib/automation/tasks";
import { can } from "../src/lib/admin/rbac";
import type { StaffSession } from "../src/lib/admin/auth";
import type { QuoteStatus } from "@prisma/client";

const ids = {
  rules: [] as string[],
  leads: [] as string[],
  bookings: [] as string[],
  quotes: [] as string[],
  workOrders: [] as string[],
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

function quoteFields(status: QuoteStatus, phone: string): QuoteInput {
  return {
    customerName: "2F52 Quote",
    customerPhone: phone,
    locationLabel: "Verify Loc",
    serviceLabel: "Verify Service",
    scope: "Scope",
    materials: "",
    labor: "",
    exclusions: "",
    taxesNote: "",
    validity: "",
    paymentTerms: "",
    estimatedDuration: "",
    warrantyTerms: "",
    notes: "",
    subtotalLabel: "",
    discountLabel: "",
    taxLabel: "",
    totalLabel: "",
    humanApproved: true,
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

async function wipeLeftovers() {
  const leftoverLeads = await prisma.lead.findMany({
    where: { OR: [{ phone: { startsWith: "+9715090285" } }, { id: { in: ids.leads } }] },
    select: { id: true },
  });
  const leftoverLeadIds = leftoverLeads.map((row) => row.id);
  const leftoverQuotes = await prisma.quote.findMany({
    where: { OR: [{ customerPhone: { startsWith: "+9715090285" } }, { id: { in: ids.quotes } }] },
    select: { id: true },
  });
  const leftoverBookings = await prisma.booking.findMany({
    where: {
      OR: [{ phone: { startsWith: "+9715090285" } }, { number: { startsWith: "ALN-2F52" } }, { id: { in: ids.bookings } }],
    },
    select: { id: true },
  });
  const leftoverWo = await prisma.workOrder.findMany({
    where: { OR: [{ number: { startsWith: "ALN-WO-2F52" } }, { id: { in: ids.workOrders } }] },
    select: { id: true },
  });
  const verifyRules = await prisma.automationRule.findMany({
    where: { OR: [{ key: { startsWith: "2f52-verify-" } }, { id: { in: ids.rules } }] },
    select: { id: true },
  });
  const ruleIds = verifyRules.map((row) => row.id);
  const subjectIds = [
    ...leftoverLeadIds,
    ...leftoverQuotes.map((row) => row.id),
    ...leftoverBookings.map((row) => row.id),
    ...leftoverWo.map((row) => row.id),
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
  await prisma.opsTask.deleteMany({ where: { title: { startsWith: "2F52" } } });
  if (leftoverQuotes.length) {
    await prisma.quoteItem.deleteMany({ where: { quoteId: { in: leftoverQuotes.map((row) => row.id) } } });
    await prisma.quote.deleteMany({ where: { id: { in: leftoverQuotes.map((row) => row.id) } } });
  }
  if (leftoverWo.length) await prisma.workOrder.deleteMany({ where: { id: { in: leftoverWo.map((row) => row.id) } } });
  if (leftoverBookings.length) await prisma.booking.deleteMany({ where: { id: { in: leftoverBookings.map((row) => row.id) } } });
  if (leftoverLeadIds.length) {
    await prisma.leadScoreHistory.deleteMany({ where: { leadId: { in: leftoverLeadIds } } });
    await prisma.leadScore.deleteMany({ where: { leadId: { in: leftoverLeadIds } } });
    await prisma.lead.deleteMany({ where: { id: { in: leftoverLeadIds } } });
  }
  await prisma.staff.deleteMany({
    where: { staffCode: { in: ["2F52-SKILL", "2F52-NOSKILL", "2F52-SALES-A", "2F52-SALES-B"] } },
  });
  const leftoverServices = await prisma.service.findMany({ where: { slug: "2f52-verify-service" }, select: { id: true } });
  if (leftoverServices.length) {
    await prisma.serviceI18n.deleteMany({ where: { serviceId: { in: leftoverServices.map((row) => row.id) } } });
    await prisma.service.deleteMany({ where: { id: { in: leftoverServices.map((row) => row.id) } } });
  }
  const leftoverCats = await prisma.serviceCategory.findMany({ where: { slug: "2f52-verify-cat" }, select: { id: true } });
  if (leftoverCats.length) {
    await prisma.serviceCategoryI18n.deleteMany({ where: { categoryId: { in: leftoverCats.map((row) => row.id) } } });
    await prisma.serviceCategory.deleteMany({ where: { id: { in: leftoverCats.map((row) => row.id) } } });
  }
  const leftoverLocs = await prisma.location.findMany({ where: { slug: "2f52-verify-loc" }, select: { id: true } });
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
    data: { slug: "2f52-verify-cat", sortOrder: 98, translations: { create: [{ locale: "en", name: "Verify 2F52" }] } },
  });
  ids.categories.push(category.id);
  const service = await prisma.service.create({
    data: {
      categoryId: category.id,
      slug: "2f52-verify-service",
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
      slug: "2f52-verify-loc",
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
      staffCode: "2F52-SKILL",
      role: "technician",
      status: "active",
      skills: { create: { categorySlug: "2f52-verify-cat", locationSlug: "2f52-verify-loc" } },
    },
  });
  const unskilled = await prisma.staff.create({ data: { staffCode: "2F52-NOSKILL", role: "technician", status: "active" } });
  const salesA = await prisma.staff.create({ data: { staffCode: "2F52-SALES-A", role: "sales", status: "active" } });
  const salesB = await prisma.staff.create({ data: { staffCode: "2F52-SALES-B", role: "sales", status: "active" } });
  ids.staff.push(skilled.id, unskilled.id, salesA.id, salesB.id);

  const newLead = await createLead(
    {
      name: "2F52 New Lead",
      phone: "+971509028501",
      email: "new@verify.local",
      requirement: "Need AC repair at the villa this week please.",
      source: "quote",
      locale: "en",
      serviceSlug: "2f52-verify-service",
      locationSlug: "2f52-verify-loc",
      city: "Dubai",
      area: "Marina",
      propertyType: "villa",
    },
    "198.51.100.10",
  );
  assert(newLead.ok && "id" in newLead && newLead.id, "createLead succeeds");
  ids.leads.push(newLead.id);
  const newLeadJobs = await prisma.automationJob.findMany({
    where: { trigger: "NEW_LEAD", subjectId: newLead.id },
  });
  assert(newLeadJobs.length === 1, "NEW_LEAD enqueued after score attempt");
  const emitAudit = await prisma.auditLog.findFirst({
    where: { action: "automation.emit", entityId: newLead.id },
  });
  assert(emitAudit, "NEW_LEAD emission audited");
  const scored = await prisma.leadScore.findUnique({ where: { leadId: newLead.id } });
  assert(scored?.effectiveClass === "HOT", "fixture lead is HOT after scoring");
  assert((await jobCount("HOT_LEAD", newLead.id)) === 1, "HOT_LEAD fires on first transition into HOT");

  await scoreLead(newLead.id, { actor: "verify", cause: "RECOMPUTE" });
  assert((await jobCount("HOT_LEAD", newLead.id)) === 1, "recompute staying HOT does not duplicate HOT_LEAD");

  const warmLead = await prisma.lead.create({
    data: {
      source: "contact",
      name: "2F52 Warm",
      phone: "+971509028502",
      requirement: "Need a general maintenance visit next month.",
      status: "NEW",
      score: { create: { score: 40, systemClass: "NORMAL", effectiveClass: "NORMAL", reasonsJson: "[]" } },
    },
  });
  ids.leads.push(warmLead.id);
  const over = await overrideLeadQuality({
    leadId: warmLead.id,
    class: "HOT",
    note: "Manager override to HOT",
    actorEmail: "manager@verify.local",
    actorRole: "manager",
  });
  assert(over.ok, "override to HOT");
  assert((await jobCount("HOT_LEAD", warmLead.id)) === 1, "human override into HOT emits once");
  await overrideLeadQuality({
    leadId: warmLead.id,
    class: "HOT",
    note: "Still HOT override",
    actorEmail: "manager@verify.local",
    actorRole: "manager",
  });
  assert((await jobCount("HOT_LEAD", warmLead.id)) === 1, "override staying HOT does not duplicate");
  await overrideLeadQuality({
    leadId: warmLead.id,
    class: "WARM",
    note: "Back to WARM",
    actorEmail: "manager@verify.local",
    actorRole: "manager",
  });
  await overrideLeadQuality({
    leadId: warmLead.id,
    class: "HOT",
    note: "HOT again after WARM",
    actorEmail: "manager@verify.local",
    actorRole: "manager",
  });
  assert((await jobCount("HOT_LEAD", warmLead.id)) === 2, "HOT after leaving HOT can fire again");

  const isolatedLead = await prisma.lead.create({
    data: {
      source: "contact",
      name: "2F52 Isolated",
      phone: "+971509028503",
      requirement: "Scoring failure must not block NEW_LEAD enqueue.",
      status: "NEW",
    },
  });
  ids.leads.push(isolatedLead.id);
  await scoreLeadSafe("missing-lead-id");
  const afterScoreFail = await emitDomainEventSafe({
    trigger: "NEW_LEAD",
    subjectId: isolatedLead.id,
    occurrenceKey: "after-score-fail",
  });
  assert(afterScoreFail.ok, "NEW_LEAD enqueue after scoring failure");
  const stillLead = await prisma.lead.findUnique({ where: { id: isolatedLead.id } });
  assert(stillLead, "lead remains if scoring failed");

  const throwingPayload: Record<string, string> = {};
  Object.defineProperty(throwingPayload, "ip", {
    enumerable: true,
    get() {
      throw new Error("payload boom");
    },
  });
  const isolatedEnqueue = await enqueueDomainEventSafe({
    trigger: "NEW_LEAD",
    subjectType: "Lead",
    subjectId: isolatedLead.id,
    occurrenceKey: "isolation",
    payload: throwingPayload,
  });
  assert(isolatedEnqueue.ok === false, "automation enqueue failure is swallowed");
  assert(await prisma.lead.findUnique({ where: { id: isolatedLead.id } }), "business row survives automation failure");

  const actor = { id: "verify-actor", email: "verify@alnajah.local" };
  const draftResult = await createQuote(quoteFields("DRAFT", "+971509028504"), actor);
  assert(draftResult.ok, "create draft quote");
  const draft = draftResult.quote;
  ids.quotes.push(draft.id);
  assert((await jobCount("QUOTE_CREATED", draft.id)) === 1, "QUOTE_CREATED on create");
  assert((await jobCount("QUOTE_SENT", draft.id)) === 0, "create as DRAFT does not emit QUOTE_SENT");
  const sent = await updateQuote(draft.id, quoteFields("SENT", "+971509028504"), actor.email);
  assert(sent.ok, "quote sent");
  assert((await jobCount("QUOTE_SENT", draft.id)) === 1, "QUOTE_SENT on transition");
  await updateQuote(draft.id, quoteFields("SENT", "+971509028504"), actor.email);
  assert((await jobCount("QUOTE_SENT", draft.id)) === 1, "staying SENT does not duplicate QUOTE_SENT");
  await updateQuote(draft.id, quoteFields("ACCEPTED", "+971509028504"), actor.email);
  assert((await jobCount("QUOTE_ACCEPTED", draft.id)) === 1, "QUOTE_ACCEPTED on transition");

  const rejectedResult = await createQuote(quoteFields("SENT", "+971509028505"), actor);
  assert(rejectedResult.ok, "create rejected path quote");
  const rejected = rejectedResult.quote;
  ids.quotes.push(rejected.id);
  assert((await jobCount("QUOTE_CREATED", rejected.id)) === 1, "QUOTE_CREATED for sent-at-create");
  assert((await jobCount("QUOTE_SENT", rejected.id)) === 1, "QUOTE_SENT when created as SENT");
  await updateQuote(rejected.id, quoteFields("REJECTED", "+971509028505"), actor.email);
  assert((await jobCount("QUOTE_REJECTED", rejected.id)) === 1, "QUOTE_REJECTED on transition");

  const delayResult = await createQuote(quoteFields("SENT", "+971509028506"), actor);
  assert(delayResult.ok, "create delay quote");
  const delayQuote = delayResult.quote;
  ids.quotes.push(delayQuote.id);
  const delayRule = await makeRule({
    key: "2f52-verify-quote-delay",
    name: "Delayed follow-up",
    trigger: "QUOTE_SENT",
    delaySeconds: 7200,
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([{ type: "CREATE_FOLLOW_UP", title: "2F52 delayed follow-up" }]),
  });
  await processDueJobs(20);
  const delayedChild = await prisma.automationJob.findFirst({
    where: { trigger: "QUOTE_SENT", subjectId: delayQuote.id, ruleId: delayRule.id },
  });
  assert(delayedChild, "QUOTE_SENT delay enqueues a child job");
  assert(delayedChild.runAt.getTime() > Date.now(), "delayed job is not due yet");
  assert((await prisma.opsTask.count({ where: { ruleId: delayRule.id } })) === 0, "follow-up waits for delay");
  await updateQuote(delayQuote.id, quoteFields("ACCEPTED", "+971509028506"), actor.email);
  await prisma.automationJob.update({
    where: { id: delayedChild.id },
    data: { runAt: new Date(Date.now() - 1000), status: "pending" },
  });
  await processDueJobs(20);
  assert((await prisma.opsTask.count({ where: { ruleId: delayRule.id } })) === 0, "accepted quote skips delayed follow-up");
  const skipRun = await prisma.automationRun.findFirst({
    where: { ruleId: delayRule.id },
    orderBy: { createdAt: "desc" },
  });
  assert(skipRun?.error === "quote_accepted", "accepted skip is recorded");

  const followResult = await createQuote(quoteFields("SENT", "+971509028507"), actor);
  assert(followResult.ok, "create follow quote");
  const followQuote = followResult.quote;
  ids.quotes.push(followQuote.id);
  const followRule = await makeRule({
    key: "2f52-verify-quote-follow",
    name: "Immediate follow-up",
    trigger: "QUOTE_SENT",
    delaySeconds: 0,
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([{ type: "CREATE_FOLLOW_UP", title: "2F52 quote follow-up" }]),
  });
  await processDueJobs(20);
  const followTasks = await prisma.opsTask.findMany({ where: { ruleId: followRule.id } });
  assert(followTasks.length === 1, "QUOTE_SENT follow-up task created");
  ids.tasks.push(followTasks[0].id);
  await processDueJobs(20);
  assert((await prisma.opsTask.count({ where: { ruleId: followRule.id } })) === 1, "follow-up task is idempotent");

  const booking = await createPublicBooking(
    {
      type: "standard",
      name: "2F52 Booking",
      phone: "+971509028508",
      requirement: "Please book a plumber visit this week.",
      serviceSlug: "2f52-verify-service",
      locationSlug: "2f52-verify-loc",
      city: "Dubai",
      area: "Marina",
      locale: "en",
      source: "booking",
    },
    "198.51.100.11",
  );
  assert(booking.ok && "id" in booking && booking.id, "public booking create");
  ids.bookings.push(booking.id);
  const bookingRow = await prisma.booking.findUnique({ where: { id: booking.id } });
  assert(bookingRow?.status === "requested", "BOOKING_REQUESTED stays a request");
  assert((await jobCount("BOOKING_REQUESTED", booking.id)) === 1, "BOOKING_REQUESTED emitted");
  assert((await jobCount("BOOKING_CONFIRMED", booking.id)) === 0, "request does not confirm");
  if (bookingRow?.leadId) ids.leads.push(bookingRow.leadId);
  assert(bookingRow?.leadId && (await jobCount("NEW_LEAD", bookingRow.leadId)) === 1, "new booking lead emits NEW_LEAD");

  const pending = await setBookingStatus(booking.id, "pending_confirmation");
  assert(pending.ok, "move to pending_confirmation");
  const statusConfirmed = await setBookingStatus(booking.id, "confirmed");
  assert(statusConfirmed.ok, "status path can set confirmed");
  assert((await jobCount("BOOKING_CONFIRMED", booking.id)) === 0, "setBookingStatus confirmed does not emit BOOKING_CONFIRMED");
  await setBookingStatus(booking.id, "rescheduled");
  assert((await jobCount("BOOKING_RESCHEDULED", booking.id)) === 1, "BOOKING_RESCHEDULED emitted");
  await setBookingStatus(booking.id, "pending_confirmation");

  const woBefore = await prisma.workOrder.count();
  const invoicesBefore = await prisma.invoice.count();
  const prepRule = await makeRule({
    key: "2f52-verify-wo-prep",
    name: "WO prep",
    trigger: "BOOKING_CONFIRMED",
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([{ type: "CREATE_WORK_ORDER_TASK", title: "2F52 prepare work order" }]),
  });
  const forbiddenRule = await makeRule({
    key: "2f52-verify-forbidden",
    name: "Forbidden on confirm",
    trigger: "BOOKING_CONFIRMED",
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([
      { type: "CONFIRM_BOOKING" },
      { type: "CREATE_WORK_ORDER" },
      { type: "CREATE_INVOICE" },
      { type: "MODIFY_PRICE" },
      { type: "APPROVE_REVIEW" },
      { type: "DELETE_CUSTOMER" },
    ]),
  });
  const confirmed = await confirmBookingTime(booking.id, "2026-09-20", "10:00");
  assert(confirmed.ok, "human confirm");
  assert((await jobCount("BOOKING_CONFIRMED", booking.id)) === 1, "BOOKING_CONFIRMED from confirmBookingTime");
  await processDueJobs(20);
  const prepTasks = await prisma.opsTask.findMany({ where: { ruleId: prepRule.id } });
  assert(prepTasks.length === 1, "BOOKING_CONFIRMED creates work-order-prep task");
  assert(prepTasks[0].kind === "work_order_prep", "prep task kind");
  ids.tasks.push(prepTasks[0].id);
  assert((await prisma.workOrder.count()) === woBefore, "must not create a WorkOrder");
  assert((await prisma.invoice.count()) === invoicesBefore, "must not create invoices");
  const afterConfirm = await prisma.booking.findUnique({ where: { id: booking.id } });
  assert(afterConfirm?.status === "confirmed", "booking remains human-confirmed");
  const forbiddenRun = await prisma.automationRun.findFirst({
    where: { ruleId: forbiddenRule.id },
    orderBy: { createdAt: "desc" },
  });
  const forbiddenActions = JSON.parse(forbiddenRun?.actionsJson || "[]") as Array<{ error?: string }>;
  assert(forbiddenActions.every((row) => row.error === "forbidden_action"), "forbidden confirm actions fail safely");

  const skillFail = await assignBookingStaff(booking.id, unskilled.id, undefined, "manager@verify.local");
  assert(!skillFail.ok && skillFail.error === "skill", "technician assign without StaffSkill is rejected");
  const skillGate = await assertTechnicianAssignmentAllowed(unskilled.id, {
    categorySlug: "2f52-verify-cat",
    locationSlug: "2f52-verify-loc",
  });
  assert(!skillGate.ok && skillGate.error === "skill", "StaffSkill helper rejects unskilled technician");
  const skillOk = await assignBookingStaff(booking.id, skilled.id, undefined, "manager@verify.local");
  assert(skillOk.ok, "technician assign with matching StaffSkill");
  const assigned = await prisma.booking.findUnique({ where: { id: booking.id } });
  assert(assigned?.technicianId === skilled.id, "skilled technician stored");
  const assignAudit = await prisma.auditLog.findFirst({
    where: { action: "booking.assign", entityId: booking.id },
  });
  assert(assignAudit, "booking assignment audited");

  const leadAssignForbidden = await assignLeadStaff({
    leadId: newLead.id,
    assignedStaffId: salesA.id,
    actorEmail: "tech@verify.local",
    actorRole: "technician",
  });
  assert(!leadAssignForbidden.ok && leadAssignForbidden.error === "forbidden", "technician cannot assign leads");
  const leadSkillFail = await assignLeadStaff({
    leadId: newLead.id,
    assignedStaffId: unskilled.id,
    actorEmail: "sales@verify.local",
    actorRole: "sales",
  });
  assert(!leadSkillFail.ok && leadSkillFail.error === "skill", "lead technician assign requires StaffSkill");
  const leadHuman = await assignLeadStaff({
    leadId: newLead.id,
    assignedStaffId: salesB.id,
    actorEmail: "sales@verify.local",
    actorRole: "sales",
  });
  assert(leadHuman.ok, "sales may assign a lead");
  const leadAssignAudit = await prisma.auditLog.findFirst({
    where: { action: "lead.assign", entityId: newLead.id },
  });
  assert(leadAssignAudit, "lead assignment audited");
  await makeRule({
    key: "2f52-verify-assign-sales",
    name: "Assign sales",
    trigger: "HOT_LEAD",
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([{ type: "ASSIGN_STAFF", role: "sales", target: "lead" }]),
  });
  await emitDomainEventSafe({
    trigger: "HOT_LEAD",
    subjectId: newLead.id,
    occurrenceKey: "assign-after-human",
  });
  await processDueJobs(20);
  const afterAuto = await prisma.lead.findUnique({ where: { id: newLead.id } });
  assert(afterAuto?.assignedStaffId === salesB.id, "automation does not overwrite human lead assignment");

  const taskRule = await makeRule({
    key: "2f52-verify-task",
    name: "Lead task",
    trigger: "NEW_LEAD",
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([{ type: "CREATE_TASK", title: "2F52 lead task", kind: "follow_up", priority: "urgent" }]),
  });
  await emitDomainEventSafe({ trigger: "NEW_LEAD", subjectId: isolatedLead.id, occurrenceKey: "task" });
  await processDueJobs(20);
  const createdTasks = await prisma.opsTask.findMany({ where: { ruleId: taskRule.id } });
  assert(createdTasks.length === 1, "enabled rule creates a task");
  const ops = createdTasks[0];
  ids.tasks.push(ops.id);
  assert(ops.source === "automation" && ops.priority === "urgent" && ops.kind === "follow_up", "task fields stored");
  await emitDomainEventSafe({ trigger: "NEW_LEAD", subjectId: isolatedLead.id, occurrenceKey: "task" });
  await processDueJobs(20);
  assert((await prisma.opsTask.count({ where: { ruleId: taskRule.id } })) === 1, "task create is idempotent");
  const taskAudit = await prisma.auditLog.findFirst({ where: { action: "task.create", entityId: ops.id } });
  assert(taskAudit, "task creation audited");

  const manager = session("manager");
  const sales = session("sales");
  const cs = session("customer_service");
  const supervisor = session("supervisor", "sup-1");
  const tech = session("technician", skilled.id);
  const content = session("content_manager");
  assert(canViewTasks("manager") && canViewTasks("sales") && canViewTasks("technician"), "operational roles can view tasks");
  assert(!canViewTasks("content_manager"), "content_manager cannot view tasks");
  assert(canViewTask(manager, ops), "manager sees all tasks");
  assert(canViewTask(sales, ops) && ops.subjectType === "Lead", "sales sees lead tasks");
  assert(!canViewTask(content, ops), "content_manager sees no operational tasks");
  assert(!canViewTask(tech, ops), "technician does not see unrelated lead tasks");
  assert(canViewTask(supervisor, prepTasks[0]), "supervisor sees operational booking tasks");
  assert(can(cs.role, "leads"), "customer service may access leads for assignment");

  const done = await updateOpsTask({ id: ops.id, session: manager, status: "done" });
  assert(done.ok, "manager completes task");
  const completeAudit = await prisma.auditLog.findFirst({ where: { action: "task.complete", entityId: ops.id } });
  assert(completeAudit, "task completion audited");
  const cancelTarget = followTasks[0];
  const cancelled = await updateOpsTask({ id: cancelTarget.id, session: manager, status: "cancelled" });
  assert(cancelled.ok, "manager cancels task");
  const cancelAudit = await prisma.auditLog.findFirst({ where: { action: "task.cancel", entityId: cancelTarget.id } });
  assert(cancelAudit, "task cancellation audited");
  const reassign = await updateOpsTask({ id: prepTasks[0].id, session: manager, assigneeStaffId: salesA.id });
  assert(reassign.ok, "manager reassigns task");
  const reassignAudit = await prisma.auditLog.findFirst({ where: { action: "task.reassign", entityId: prepTasks[0].id } });
  assert(reassignAudit, "task reassignment audited");
  const techDenied = await updateOpsTask({ id: prepTasks[0].id, session: content, status: "done" });
  assert(!techDenied.ok && techDenied.error === "forbidden", "content_manager cannot manage tasks");

  const wo = await prisma.workOrder.create({
    data: {
      number: "ALN-WO-2F52-001",
      bookingId: booking.id,
      serviceId: service.id,
      locationId: location.id,
      technicianId: skilled.id,
      serviceLabel: "Verify Service",
      locationLabel: "Verify Loc",
      status: "assigned",
    },
  });
  ids.workOrders.push(wo.id);
  const woTask = await prisma.opsTask.create({
    data: {
      kind: "work_order_prep",
      title: "2F52 WO visible",
      source: "manual",
      subjectType: "WorkOrder",
      subjectId: wo.id,
      idempotencyKey: `2f52-wo-task-${wo.id}`,
    },
  });
  ids.tasks.push(woTask.id);
  const techTasks = await tasksVisibleTo(tech);
  assert(techTasks.some((row) => row.id === woTask.id), "technician sees tasks on assigned work");
  const contentTasks = await tasksVisibleTo(content);
  assert(contentTasks.length === 0, "content_manager task list is empty");

  const examples = await prisma.automationRule.findMany({
    where: { key: { in: EXAMPLE_AUTOMATION_RULES.map((rule) => rule.key) } },
  });
  assert(examples.every((rule) => !rule.enabled), "seed example rules remain disabled");
  assert(!can("content_manager", "leads"), "content_manager has no lead assignment");

  console.log("Phase 2F.5.2 verification passed.");
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
