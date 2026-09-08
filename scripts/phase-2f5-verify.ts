import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { createLead } from "../src/lib/leads";
import { canManageAutomation, can } from "../src/lib/admin/rbac";
import { EXAMPLE_AUTOMATION_RULES, upsertDisabledExampleRules } from "../src/lib/automation/catalog";
import { enqueueDomainEvent, enqueueDomainEventSafe } from "../src/lib/automation/enqueue";
import { processDueJobs } from "../src/lib/automation/tick";
import { retryJob } from "../src/lib/automation/engine";
import { containsBlockedPrivacy } from "../src/lib/automation/privacy";
import { retryDelayMs } from "../src/lib/automation/retry";
import { authorizeTick, GET as tickGet, POST as tickPost } from "../src/app/api/internal/automation/tick/route";

const ids = {
  rules: [] as string[],
  jobs: [] as string[],
  leads: [] as string[],
  workOrders: [] as string[],
  bookings: [] as string[],
  staff: [] as string[],
  services: [] as string[],
  categories: [] as string[],
  locations: [] as string[],
};

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function walkFiles(dir: string, acc: string[] = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walkFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(full);
  }
  return acc;
}

async function wipeLeftovers() {
  const leftoverLeads = await prisma.lead.findMany({
    where: { OR: [{ phone: { startsWith: "+97150901850" } }, { id: { in: ids.leads } }] },
    select: { id: true },
  });
  const leftoverLeadIds = leftoverLeads.map((row) => row.id);
  const verifyRules = await prisma.automationRule.findMany({
    where: { OR: [{ key: { startsWith: "2f5-verify-" } }, { id: { in: ids.rules } }] },
    select: { id: true },
  });
  const ruleIds = verifyRules.map((row) => row.id);
  const leftoverWo = await prisma.workOrder.findMany({
    where: { OR: [{ number: "ALN-WO-2F5-001" }, { id: { in: ids.workOrders } }] },
    select: { id: true },
  });
  const leftoverBookings = await prisma.booking.findMany({
    where: { OR: [{ number: "ALN-2F5-VERIFY" }, { id: { in: ids.bookings } }] },
    select: { id: true },
  });
  const subjectIds = [...leftoverLeadIds, ...leftoverWo.map((row) => row.id), ...leftoverBookings.map((row) => row.id)];
  if (ruleIds.length) await prisma.automationRun.deleteMany({ where: { ruleId: { in: ruleIds } } });
  if (subjectIds.length) {
    await prisma.automationRun.deleteMany({ where: { subjectId: { in: subjectIds } } });
    await prisma.automationJob.deleteMany({ where: { subjectId: { in: subjectIds } } });
  }
  if (ids.jobs.length) {
    await prisma.automationRun.deleteMany({ where: { jobId: { in: ids.jobs } } });
    await prisma.automationJob.deleteMany({ where: { id: { in: ids.jobs } } });
  }
  if (ruleIds.length) {
    await prisma.opsTask.deleteMany({ where: { ruleId: { in: ruleIds } } });
    await prisma.automationJob.deleteMany({ where: { ruleId: { in: ruleIds } } });
    await prisma.automationRule.deleteMany({ where: { id: { in: ruleIds } } });
  }
  await prisma.opsTask.deleteMany({ where: { title: { startsWith: "2F5" } } });
  await prisma.adminNotification.deleteMany({ where: { title: { startsWith: "2F5" } } });
  if (leftoverWo.length) await prisma.workOrder.deleteMany({ where: { id: { in: leftoverWo.map((row) => row.id) } } });
  if (leftoverBookings.length) await prisma.booking.deleteMany({ where: { id: { in: leftoverBookings.map((row) => row.id) } } });
  if (leftoverLeadIds.length) {
    await prisma.leadScoreHistory.deleteMany({ where: { leadId: { in: leftoverLeadIds } } });
    await prisma.leadScore.deleteMany({ where: { leadId: { in: leftoverLeadIds } } });
    await prisma.lead.deleteMany({ where: { id: { in: leftoverLeadIds } } });
  }
  await prisma.staff.deleteMany({ where: { staffCode: { in: ["2F5-SKILL", "2F5-NOSKILL", "2F5-SALES"] } } });
  const leftoverServices = await prisma.service.findMany({ where: { slug: "2f5-verify-service" }, select: { id: true } });
  if (leftoverServices.length) {
    await prisma.serviceI18n.deleteMany({ where: { serviceId: { in: leftoverServices.map((row) => row.id) } } });
    await prisma.service.deleteMany({ where: { id: { in: leftoverServices.map((row) => row.id) } } });
  }
  const leftoverCats = await prisma.serviceCategory.findMany({ where: { slug: "2f5-verify-cat" }, select: { id: true } });
  if (leftoverCats.length) {
    await prisma.serviceCategoryI18n.deleteMany({ where: { categoryId: { in: leftoverCats.map((row) => row.id) } } });
    await prisma.serviceCategory.deleteMany({ where: { id: { in: leftoverCats.map((row) => row.id) } } });
  }
  const leftoverLocs = await prisma.location.findMany({ where: { slug: "2f5-verify-loc" }, select: { id: true } });
  if (leftoverLocs.length) {
    await prisma.locationI18n.deleteMany({ where: { locationId: { in: leftoverLocs.map((row) => row.id) } } });
    await prisma.location.deleteMany({ where: { id: { in: leftoverLocs.map((row) => row.id) } } });
  }
}

async function cleanup() {
  await wipeLeftovers();
}

async function makeRule(data: Parameters<typeof prisma.automationRule.create>[0]["data"]) {
  const row = await prisma.automationRule.create({ data: { ...data, enabled: data.enabled ?? true, updatedBy: "verify" } });
  ids.rules.push(row.id);
  return row;
}

async function main() {
  await wipeLeftovers();
  await upsertDisabledExampleRules(prisma);
  await prisma.automationRule.updateMany({
    where: { key: { in: EXAMPLE_AUTOMATION_RULES.map((rule) => rule.key) } },
    data: { enabled: false },
  });

  const examples = await prisma.automationRule.findMany({
    where: { key: { in: EXAMPLE_AUTOMATION_RULES.map((rule) => rule.key) } },
  });
  assert(examples.length === 6, "six example rules seeded");
  assert(examples.every((rule) => !rule.enabled), "example rules stay disabled");

  assert(canManageAutomation("super_admin") && canManageAutomation("manager") && canManageAutomation("admin"), "managers can configure");
  assert(!canManageAutomation("sales") && !canManageAutomation("technician") && !canManageAutomation("customer_service"), "other roles cannot configure");
  assert(can("super_admin", "automation") && !can("sales", "automation"), "automation permission");

  assert(retryDelayMs(1) === 60_000 && retryDelayMs(2) === 5 * 60_000 && retryDelayMs(3) === 25 * 60_000, "backoff");

  const publicDirs = ["src/lib/leads.ts", "src/lib/bookings.ts", "src/lib/reviews.ts", "src/lib/questions.ts", "src/lib/analytics"];
  const allowedAutomationImports = [
    /import\s+\{[^}]+\}\s+from\s+"@\/lib\/automation\/emit";\s*/g,
    /import\s+\{[^}]+\}\s+from\s+"@\/lib\/automation\/assign";\s*/g,
    /import\s+\{[^}]+\}\s+from\s+"@\/lib\/automation\/subject";\s*/g,
  ];
  for (const rel of publicDirs) {
    const full = join(process.cwd(), rel);
    const files = rel.endsWith(".ts") ? [full] : walkFiles(full);
    for (const file of files) {
      let text = readFileSync(file, "utf8");
      for (const pattern of allowedAutomationImports) text = text.replace(pattern, "");
      assert(!text.includes("@/lib/automation"), `${file} must not import automation engine internals`);
    }
  }
  const engineFiles = walkFiles(join(process.cwd(), "src/lib/automation"));
  for (const file of engineFiles) {
    const text = readFileSync(file, "utf8");
    assert(!text.includes("confirmBookingTime"), `${file} must not confirm bookings`);
    assert(!text.includes("createInvoice("), `${file} must not create invoices`);
    assert(!text.includes("createWorkOrderFromBooking"), `${file} must not create work orders`);
  }

  const leadWrite = await createLead(
    {
      name: "2F5 Isolation",
      phone: "+971509018501",
      requirement: "Public write must succeed even if automation is absent.",
      source: "quote",
      locale: "en",
    },
    "203.0.113.51",
  );
  assert(leadWrite.ok && "id" in leadWrite && leadWrite.id, "createLead still works");
  if (leadWrite.ok && "id" in leadWrite && leadWrite.id) ids.leads.push(leadWrite.id);

  const throwingPayload: Record<string, string> = {};
  Object.defineProperty(throwingPayload, "ip", {
    enumerable: true,
    get() {
      throw new Error("payload boom");
    },
  });
  const isolated = await enqueueDomainEventSafe({
    trigger: "NEW_LEAD",
    subjectType: "Lead",
    subjectId: leadWrite.ok && "id" in leadWrite && leadWrite.id ? leadWrite.id : "missing",
    occurrenceKey: "isolation",
    payload: throwingPayload,
  });
  assert(isolated.ok === false, "throwing payload is swallowed");
  const stillThere = await prisma.lead.findUnique({ where: { id: ids.leads[0] } });
  assert(stillThere, "lead remains after automation enqueue failure");

  const privacyLead = await prisma.lead.create({
    data: {
      source: "contact",
      name: "2F5 Privacy",
      phone: "+971509018502",
      requirement: "Do not log this requirement text in automation.",
      status: "NEW",
    },
  });
  ids.leads.push(privacyLead.id);
  const queued = await enqueueDomainEvent({
    trigger: "NEW_LEAD",
    subjectType: "Lead",
    subjectId: privacyLead.id,
    occurrenceKey: "privacy",
    payload: {
      ip: "1.2.3.4",
      phone: "+971509018502",
      email: "hidden@example.com",
      whatsapp: "+971509018502",
      requirement: "secret requirement",
      transcript: "full transcript",
      fingerprint: "abc",
      userAgent: "Mozilla",
      status: "NEW",
    },
  });
  assert(queued.ok && queued.jobId, "privacy enqueue");
  ids.jobs.push(queued.jobId);
  const job = await prisma.automationJob.findUnique({ where: { id: queued.jobId } });
  assert(job, "job stored");
  const payload = JSON.parse(job.payloadJson) as Record<string, unknown>;
  assert(payload.status === "NEW", "allowlisted operational field kept");
  assert(!("ip" in payload) && !("phone" in payload) && !("email" in payload), "pii stripped");
  assert(!("requirement" in payload) && !("transcript" in payload) && !("fingerprint" in payload), "sensitive keys stripped");
  assert(!containsBlockedPrivacy(payload), "payload privacy");

  const dup = await enqueueDomainEvent({
    trigger: "NEW_LEAD",
    subjectType: "Lead",
    subjectId: privacyLead.id,
    occurrenceKey: "privacy",
  });
  assert(dup.ok && dup.duplicate, "job idempotency");

  const taskRule = await makeRule({
    key: "2f5-verify-task",
    name: "Verify task",
    trigger: "NEW_LEAD",
    priority: 1,
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([{ type: "CREATE_TASK", title: "2F5 follow up" }]),
  });
  // Isolate from other pending NEW_LEAD jobs (e.g. createLead emit) so this assert stays deterministic.
  await prisma.automationJob.updateMany({
    where: {
      id: { not: queued.jobId },
      trigger: "NEW_LEAD",
      status: { in: ["pending", "failed"] },
      subjectId: { in: ids.leads },
    },
    data: { status: "succeeded", lastError: "verify_skip", startedAt: null },
  });
  await processDueJobs();
  const tasks = await prisma.opsTask.findMany({ where: { ruleId: taskRule.id, subjectId: privacyLead.id } });
  assert(tasks.length === 1, "engine creates one task");
  await processDueJobs();
  const tasksAgain = await prisma.opsTask.findMany({ where: { ruleId: taskRule.id, subjectId: privacyLead.id } });
  assert(tasksAgain.length === 1, "retry/process does not duplicate tasks");

  await prisma.automationJob.updateMany({ where: { id: queued.jobId }, data: { status: "failed", runAt: new Date(), attempt: 1, startedAt: null } });
  const retried = await retryJob(queued.jobId);
  assert(retried.ok, "admin retry");
  await processDueJobs();
  const afterRetry = await prisma.opsTask.findMany({ where: { ruleId: taskRule.id, subjectId: privacyLead.id } });
  assert(afterRetry.length === 1, "manual retry does not duplicate tasks");

  const hotLead = await prisma.lead.create({
    data: {
      source: "quote",
      name: "2F5 Hot",
      phone: "+971509018503",
      requirement: "Hot class condition check for automation verify.",
      status: "NEW",
      score: { create: { score: 40, systemClass: "NORMAL", effectiveClass: "NORMAL", reasonsJson: "[]" } },
    },
  });
  ids.leads.push(hotLead.id);
  const hotRule = await makeRule({
    key: "2f5-verify-hot-cond",
    name: "HOT only",
    trigger: "NEW_LEAD",
    enabled: true,
    conditionsJson: JSON.stringify([{ field: "qualityClass", op: "eq", value: "HOT" }]),
    actionsJson: JSON.stringify([{ type: "CREATE_TASK", title: "Should not fire" }]),
  });
  await enqueueDomainEvent({
    trigger: "NEW_LEAD",
    subjectType: "Lead",
    subjectId: hotLead.id,
    occurrenceKey: "not-hot",
  });
  await processDueJobs();
  const skipped = await prisma.opsTask.count({ where: { ruleId: hotRule.id } });
  assert(skipped === 0, "condition fail closed skips actions");
  const skipRun = await prisma.automationRun.findFirst({ where: { ruleId: hotRule.id }, orderBy: { createdAt: "desc" } });
  assert(skipRun && !skipRun.conditionPassed && skipRun.ok, "failed condition is recorded, not a crash");

  const unknownRule = await makeRule({
    key: "2f5-verify-unknown-field",
    name: "Unknown field",
    trigger: "NEW_LEAD",
    enabled: true,
    conditionsJson: JSON.stringify([{ field: "phone", op: "eq", value: "+971" }]),
    actionsJson: JSON.stringify([{ type: "CREATE_TASK", title: "Unknown field must not fire" }]),
  });
  await enqueueDomainEvent({
    trigger: "NEW_LEAD",
    subjectType: "Lead",
    subjectId: hotLead.id,
    occurrenceKey: "unknown-field",
  });
  await processDueJobs();
  assert((await prisma.opsTask.count({ where: { ruleId: unknownRule.id } })) === 0, "unknown condition fails closed");

  const unknownActionRule = await makeRule({
    key: "2f5-verify-unknown-action",
    name: "Unknown action",
    trigger: "NEW_LEAD",
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([{ type: "LAUNCH_ROCKET" }]),
  });
  await enqueueDomainEvent({
    trigger: "NEW_LEAD",
    subjectType: "Lead",
    subjectId: hotLead.id,
    occurrenceKey: "unknown-action",
  });
  await processDueJobs();
  const unknownRun = await prisma.automationRun.findFirst({ where: { ruleId: unknownActionRule.id }, orderBy: { createdAt: "desc" } });
  assert(unknownRun, "unknown action recorded");
  const unknownActions = JSON.parse(unknownRun.actionsJson) as Array<{ status: string; error?: string }>;
  assert(unknownActions[0]?.status === "failed" && unknownActions[0]?.error === "unknown_action", "unknown action fails safely");

  const invoicesBefore = await prisma.invoice.count();
  const woBefore = await prisma.workOrder.count();
  const booking = await prisma.booking.create({
    data: {
      number: "ALN-2F5-VERIFY",
      name: "2F5 Booking",
      phone: "+971509018504",
      requirement: "Must stay requested.",
      status: "requested",
    },
  });
  ids.bookings.push(booking.id);
  const forbiddenRule = await makeRule({
    key: "2f5-verify-forbidden",
    name: "Forbidden",
    trigger: "BOOKING_REQUESTED",
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([
      { type: "CONFIRM_BOOKING" },
      { type: "CREATE_INVOICE" },
      { type: "CREATE_WORK_ORDER" },
      { type: "APPROVE_REVIEW" },
      { type: "DELETE_CUSTOMER" },
      { type: "MODIFY_PRICE" },
    ]),
  });
  await enqueueDomainEvent({
    trigger: "BOOKING_REQUESTED",
    subjectType: "Booking",
    subjectId: booking.id,
    occurrenceKey: "forbidden",
  });
  await processDueJobs();
  const bookingAfter = await prisma.booking.findUnique({ where: { id: booking.id } });
  assert(bookingAfter?.status === "requested", "must never confirm bookings");
  assert((await prisma.invoice.count()) === invoicesBefore, "must never create invoices");
  assert((await prisma.workOrder.count()) === woBefore, "must never create work orders");
  const forbiddenRun = await prisma.automationRun.findFirst({ where: { ruleId: forbiddenRule.id }, orderBy: { createdAt: "desc" } });
  const forbiddenActions = JSON.parse(forbiddenRun?.actionsJson || "[]") as Array<{ error?: string }>;
  assert(forbiddenActions.every((row) => row.error === "forbidden_action"), "forbidden actions fail safely");

  const notifyRule = await makeRule({
    key: "2f5-verify-notify",
    name: "Notify",
    trigger: "NEW_LEAD",
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([
      { type: "SEND_NOTIFICATION", channel: "in_app", title: "2F5 in-app" },
      { type: "SEND_NOTIFICATION", channel: "whatsapp", title: "2F5 whatsapp" },
    ]),
  });
  delete process.env.AUTOMATION_WHATSAPP_PROVIDER;
  await enqueueDomainEvent({
    trigger: "NEW_LEAD",
    subjectType: "Lead",
    subjectId: hotLead.id,
    occurrenceKey: "notify",
  });
  await processDueJobs();
  const notifyRun = await prisma.automationRun.findFirst({ where: { ruleId: notifyRule.id }, orderBy: { createdAt: "desc" } });
  const notifyActions = JSON.parse(notifyRun?.actionsJson || "[]") as Array<{ status: string; error?: string; type: string }>;
  assert(notifyActions[0]?.status === "success", "in-app notification executes");
  assert(notifyActions[1]?.status === "skipped" && notifyActions[1]?.error === "provider_unconfigured", "whatsapp not claimed without provider");
  assert((await prisma.adminNotification.count({ where: { title: "2F5 in-app" } })) === 1, "in-app row stored");

  const category = await prisma.serviceCategory.create({
    data: { slug: "2f5-verify-cat", sortOrder: 99, translations: { create: [{ locale: "en", name: "Verify" }] } },
  });
  ids.categories.push(category.id);
  const service = await prisma.service.create({
    data: {
      categoryId: category.id,
      slug: "2f5-verify-service",
      serviceType: "maintenance",
      status: "active",
      translations: { create: [{ locale: "en", name: "Verify Service", shortDescription: "v", longDescription: "v", professionalFallback: "v", seoTitle: "v", metaDescription: "v" }] },
    },
  });
  ids.services.push(service.id);
  const location = await prisma.location.create({
    data: {
      slug: "2f5-verify-loc",
      type: "emirate",
      status: "active",
      serves: true,
      translations: { create: [{ locale: "en", name: "Verify Loc", intro: "", seoTitle: "v", metaDescription: "v" }] },
    },
  });
  ids.locations.push(location.id);
  const skilled = await prisma.staff.create({
    data: {
      staffCode: "2F5-SKILL",
      role: "technician",
      status: "active",
      skills: { create: { categorySlug: "2f5-verify-cat", locationSlug: "2f5-verify-loc" } },
    },
  });
  const unskilled = await prisma.staff.create({ data: { staffCode: "2F5-NOSKILL", role: "technician", status: "active" } });
  const sales = await prisma.staff.create({ data: { staffCode: "2F5-SALES", role: "sales", status: "active" } });
  ids.staff.push(skilled.id, unskilled.id, sales.id);
  const wo = await prisma.workOrder.create({
    data: {
      number: "ALN-WO-2F5-001",
      serviceId: service.id,
      locationId: location.id,
      serviceLabel: "Verify Service",
      locationLabel: "Verify Loc",
      status: "created",
    },
  });
  ids.workOrders.push(wo.id);
  const assignRule = await makeRule({
    key: "2f5-verify-assign-tech",
    name: "Assign tech",
    trigger: "WORK_ORDER_ASSIGNED",
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([{ type: "ASSIGN_STAFF", role: "technician", target: "work_order_technician" }]),
  });
  await enqueueDomainEvent({
    trigger: "WORK_ORDER_ASSIGNED",
    subjectType: "WorkOrder",
    subjectId: wo.id,
    occurrenceKey: "assign-tech",
  });
  await processDueJobs();
  const woAfter = await prisma.workOrder.findUnique({ where: { id: wo.id } });
  assert(woAfter?.technicianId === skilled.id, "technician assignment requires matching StaffSkill");
  assert(woAfter?.technicianId !== unskilled.id, "unskilled technician not assigned");
  const assignRun = await prisma.automationRun.findFirst({ where: { ruleId: assignRule.id }, orderBy: { createdAt: "desc" } });
  assert(assignRun?.ok, "skill-matched assign succeeds");

  const salesLead = await prisma.lead.create({
    data: { source: "contact", name: "2F5 Sales", phone: "+971509018505", requirement: "Assign sales by role without skills.", status: "NEW" },
  });
  ids.leads.push(salesLead.id);
  await makeRule({
    key: "2f5-verify-assign-sales",
    name: "Assign sales",
    trigger: "HOT_LEAD",
    enabled: true,
    conditionsJson: "[]",
    actionsJson: JSON.stringify([{ type: "ASSIGN_STAFF", role: "sales", target: "lead" }]),
  });
  await enqueueDomainEvent({
    trigger: "HOT_LEAD",
    subjectType: "Lead",
    subjectId: salesLead.id,
    occurrenceKey: "assign-sales",
  });
  await processDueJobs();
  const salesAfter = await prisma.lead.findUnique({ where: { id: salesLead.id } });
  assert(salesAfter?.assignedStaffId === sales.id, "sales assigned by role");

  process.env.AUTOMATION_CRON_SECRET = "phase-2f5-tick-secret-ok";
  const unauthorized = await tickPost(new Request("http://localhost/api/internal/automation/tick", { method: "POST" }));
  assert(unauthorized.status === 401, "tick requires secret");
  assert(!authorizeTick(new Request("http://localhost/api/internal/automation/tick", { method: "POST" })), "missing secret rejected");
  const getRes = tickGet();
  assert(getRes.status === 405, "tick GET is not allowed");
  const authorized = await tickPost(
    new Request("http://localhost/api/internal/automation/tick", {
      method: "POST",
      headers: { Authorization: "Bearer phase-2f5-tick-secret-ok" },
    }),
  );
  assert(authorized.status === 200, "tick POST with secret");
  const body = (await authorized.json()) as { ok: boolean };
  assert(body.ok, "tick body ok");

  const stillDisabled = await prisma.automationRule.findMany({
    where: { key: { in: EXAMPLE_AUTOMATION_RULES.map((rule) => rule.key) } },
  });
  assert(stillDisabled.every((rule) => !rule.enabled), "example rules remain disabled after tests");

  console.log("Phase 2F.5.1 verification passed.");
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup().catch((error) => console.error(error));
    await prisma.$disconnect();
  });
