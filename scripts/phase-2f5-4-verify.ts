import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { can } from "../src/lib/admin/rbac";
import { amcDateInput, createAmcContract, updateAmcContract } from "../src/lib/admin/amc";
import { EXAMPLE_AUTOMATION_RULES, upsertDisabledExampleRules } from "../src/lib/automation/catalog";
import { scanAmcRenewals, amcOccurrenceKey } from "../src/lib/automation/amc-scan";
import { processJob } from "../src/lib/automation/engine";
import { containsBlockedPrivacy } from "../src/lib/automation/privacy";
import { assignStaffForAutomation } from "../src/lib/automation/assign";
import { canViewTask } from "../src/lib/automation/tasks";
import type { StaffSession } from "../src/lib/admin/auth";

const ids = {
  customers: [] as string[],
  contracts: [] as string[],
  staff: [] as string[],
  rules: [] as string[],
};
const pausedSales: string[] = [];

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function dayOffset(days: number) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

async function drain(subjectIds: string[]) {
  for (let i = 0; i < 40; i += 1) {
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

async function wipe() {
  const leftoverCustomers = await prisma.customer.findMany({
    where: { OR: [{ name: { startsWith: "2F54" } }, { id: { in: ids.customers } }] },
    select: { id: true },
  });
  const leftoverContracts = await prisma.amcContract.findMany({
    where: {
      OR: [{ id: { in: ids.contracts } }, { customerId: { in: leftoverCustomers.map((row) => row.id) } }, { reference: { startsWith: "2F54" } }],
    },
    select: { id: true },
  });
  const contractIds = leftoverContracts.map((row) => row.id);
  const verifyRules = await prisma.automationRule.findMany({
    where: { OR: [{ key: { startsWith: "2f54-verify-" } }, { id: { in: ids.rules } }] },
    select: { id: true },
  });
  const ruleIds = verifyRules.map((row) => row.id);
  if (ruleIds.length) await prisma.automationRun.deleteMany({ where: { ruleId: { in: ruleIds } } });
  if (contractIds.length) {
    await prisma.automationRun.deleteMany({ where: { subjectId: { in: contractIds } } });
    await prisma.automationJob.deleteMany({ where: { subjectId: { in: contractIds } } });
    await prisma.opsTask.deleteMany({ where: { subjectId: { in: contractIds } } });
    await prisma.amcContract.deleteMany({ where: { id: { in: contractIds } } });
  }
  if (ruleIds.length) {
    await prisma.opsTask.deleteMany({ where: { ruleId: { in: ruleIds } } });
    await prisma.automationJob.deleteMany({ where: { ruleId: { in: ruleIds } } });
    await prisma.automationRule.deleteMany({ where: { id: { in: ruleIds } } });
  }
  if (leftoverCustomers.length) await prisma.customer.deleteMany({ where: { id: { in: leftoverCustomers.map((row) => row.id) } } });
  await prisma.staff.deleteMany({ where: { staffCode: { in: ["2F54-SALES-A", "2F54-SALES-B", "2F54-INACTIVE"] } } });
}

async function main() {
  await wipe();
  await upsertDisabledExampleRules(prisma);
  await prisma.automationRule.updateMany({
    where: { key: { in: EXAMPLE_AUTOMATION_RULES.map((rule) => rule.key) } },
    data: { enabled: false },
  });

  assert(can("manager", "amc") && can("super_admin", "amc"), "manager/super_admin may manage AMC");
  assert(!can("sales", "amc") && !can("technician", "amc") && !can("content_manager", "amc"), "other roles cannot manage AMC");
  assert(can("manager", "automation") && !can("sales", "automation"), "only managers enable AMC automation");

  const customer = await prisma.customer.create({ data: { name: "2F54 AMC Customer" } });
  ids.customers.push(customer.id);
  const created = await createAmcContract(
    {
      customerId: customer.id,
      reference: "2F54-IN",
      startDate: dayOffset(-20),
      endDate: dayOffset(10),
      frequency: "quarterly",
      coveredServices: "AC maintenance",
      locationLabel: "Dubai",
      propertyLabel: "Villa",
      notes: "Do not copy this note into jobs.",
      status: "active",
    },
    "manager@verify.local",
  );
  assert(created.ok, "AMC create");
  ids.contracts.push(created.row.id);
  const createAudit = await prisma.auditLog.findFirst({ where: { action: "amc.create", entityId: created.row.id } });
  assert(createAudit, "AMC create audited");
  assert(!createAudit.meta.includes("Do not copy"), "create audit has no notes");

  const updated = await updateAmcContract(
    created.row.id,
    {
      customerId: customer.id,
      reference: "2F54-IN",
      startDate: dayOffset(-20),
      endDate: dayOffset(10),
      frequency: "monthly",
      coveredServices: "AC maintenance",
      locationLabel: "Dubai",
      propertyLabel: "Villa",
      notes: "Updated notes stay on the contract only.",
      status: "active",
    },
    "manager@verify.local",
  );
  assert(updated.ok && updated.row.frequency === "monthly", "AMC edit");
  const updateAudit = await prisma.auditLog.findFirst({ where: { action: "amc.update", entityId: created.row.id } });
  assert(updateAudit, "AMC edit audited");

  const outside = await createAmcContract(
    {
      customerId: customer.id,
      reference: "2F54-OUT",
      startDate: dayOffset(-10),
      endDate: dayOffset(60),
      frequency: "yearly",
      coveredServices: "Plumbing",
      locationLabel: "Sharjah",
      propertyLabel: "Office",
      notes: "",
      status: "active",
    },
    "manager@verify.local",
  );
  assert(outside.ok, "outside-window contract");
  ids.contracts.push(outside.row.id);

  const inactive = await createAmcContract(
    {
      customerId: customer.id,
      reference: "2F54-OFF",
      startDate: dayOffset(-10),
      endDate: dayOffset(8),
      frequency: "yearly",
      coveredServices: "Electrical",
      locationLabel: "Abu Dhabi",
      propertyLabel: "Store",
      notes: "",
      status: "active",
    },
    "manager@verify.local",
  );
  assert(inactive.ok, "inactive contract create");
  ids.contracts.push(inactive.row.id);
  const deactivated = await updateAmcContract(
    inactive.row.id,
    {
      customerId: customer.id,
      reference: "2F54-OFF",
      startDate: dayOffset(-10),
      endDate: dayOffset(8),
      frequency: "yearly",
      coveredServices: "Electrical",
      locationLabel: "Abu Dhabi",
      propertyLabel: "Store",
      notes: "",
      status: "inactive",
    },
    "manager@verify.local",
  );
  assert(deactivated.ok && deactivated.row.status === "inactive", "AMC deactivate");
  const deactivateAudit = await prisma.auditLog.findFirst({ where: { action: "amc.deactivate", entityId: inactive.row.id } });
  assert(deactivateAudit, "deactivate audited");
  const reactivated = await updateAmcContract(
    inactive.row.id,
    {
      customerId: customer.id,
      reference: "2F54-OFF",
      startDate: dayOffset(-10),
      endDate: dayOffset(8),
      frequency: "yearly",
      coveredServices: "Electrical",
      locationLabel: "Abu Dhabi",
      propertyLabel: "Store",
      notes: "",
      status: "active",
    },
    "manager@verify.local",
  );
  assert(reactivated.ok, "AMC activate");
  const activateAudit = await prisma.auditLog.findFirst({ where: { action: "amc.activate", entityId: inactive.row.id } });
  assert(activateAudit, "activate audited");
  const deactivatedAgain = await updateAmcContract(
    inactive.row.id,
    {
      customerId: customer.id,
      reference: "2F54-OFF",
      startDate: dayOffset(-10),
      endDate: dayOffset(8),
      frequency: "yearly",
      coveredServices: "Electrical",
      locationLabel: "Abu Dhabi",
      propertyLabel: "Store",
      notes: "",
      status: "inactive",
    },
    "manager@verify.local",
  );
  assert(deactivatedAgain.ok && deactivatedAgain.row.status === "inactive", "leave inactive for scan skip");

  const invoicesBefore = await prisma.invoice.count();
  const bookingsBefore = await prisma.booking.count();
  const paymentsBefore = await prisma.payment.count();
  const endBefore = created.row.endDate?.toISOString();

  const firstScan = await scanAmcRenewals({ windowDays: 30 });
  const scanAudit = await prisma.auditLog.findFirst({ where: { action: "amc.renewal_scan" }, orderBy: { createdAt: "desc" } });
  assert(scanAudit, "renewal scan audited");
  assert((await prisma.automationJob.count({ where: { trigger: "AMC_RENEWAL_APPROACHING", subjectId: created.row.id } })) === 1, "in-window active contract emits once");
  assert((await prisma.automationJob.count({ where: { trigger: "AMC_RENEWAL_APPROACHING", subjectId: outside.row.id } })) === 0, "outside-window contract does not emit");
  assert((await prisma.automationJob.count({ where: { trigger: "AMC_RENEWAL_APPROACHING", subjectId: inactive.row.id } })) === 0, "inactive contract does not emit");

  const secondScan = await scanAmcRenewals({ windowDays: 30 });
  assert(secondScan.duplicates >= 1, "repeated scan is idempotent");
  assert((await prisma.automationJob.count({ where: { trigger: "AMC_RENEWAL_APPROACHING", subjectId: created.row.id } })) === 1, "no duplicate jobs");
  assert(firstScan.windowDays === 30, "default window is 30 days");

  await drain(ids.contracts);
  assert((await prisma.opsTask.count({ where: { subjectId: created.row.id, kind: "amc_renewal" } })) === 0, "disabled example rule creates no task");

  const otherSales = await prisma.staff.findMany({
    where: { role: "sales", status: "active", staffCode: { notIn: ["2F54-SALES-A", "2F54-SALES-B"] } },
    select: { id: true },
  });
  pausedSales.push(...otherSales.map((row) => row.id));
  if (pausedSales.length) {
    await prisma.staff.updateMany({ where: { id: { in: pausedSales } }, data: { status: "inactive" } });
  }
  const salesA = await prisma.staff.create({ data: { staffCode: "2F54-SALES-A", role: "sales", status: "active" } });
  const salesB = await prisma.staff.create({ data: { staffCode: "2F54-SALES-B", role: "sales", status: "active" } });
  await prisma.staff.create({ data: { staffCode: "2F54-INACTIVE", role: "sales", status: "inactive" } });
  ids.staff.push(salesA.id, salesB.id);

  const rule = await prisma.automationRule.create({
    data: {
      key: "2f54-verify-amc",
      name: "Verify AMC renewal",
      enabled: true,
      trigger: "AMC_RENEWAL_APPROACHING",
      delaySeconds: 0,
      conditionsJson: "[]",
      actionsJson: JSON.stringify([
        { type: "CREATE_AMC_RENEWAL_TASK", title: "AMC renewal follow-up", dueInHours: 720 },
        { type: "ASSIGN_STAFF", role: "sales", target: "amc" },
      ]),
      updatedBy: "verify",
    },
  });
  ids.rules.push(rule.id);

  await prisma.automationJob.updateMany({
    where: { trigger: "AMC_RENEWAL_APPROACHING", subjectId: created.row.id },
    data: { status: "pending", runAt: new Date(Date.now() - 1000) },
  });
  await drain(ids.contracts);
  const tasks = await prisma.opsTask.findMany({ where: { subjectId: created.row.id, kind: "amc_renewal" } });
  assert(tasks.length === 1, "enabled rule creates one amc_renewal task");
  assert(tasks[0].title === "AMC renewal follow-up", "suggested title");
  assert(tasks[0].subjectType === "AmcContract" && tasks[0].subjectId === created.row.id, "task linked to contract");
  assert(tasks[0].dueAt && amcDateInput(tasks[0].dueAt) === amcDateInput(created.row.endDate), "due date follows contract end");
  assert(tasks[0].assigneeStaffId === salesA.id, "assigns lowest-code active sales");
  const salesSession = { id: "u-sales", email: "sales@verify.local", name: "sales", role: "sales", staffId: salesA.id } satisfies StaffSession;
  const techSession = { id: "u-tech", email: "tech@verify.local", name: "tech", role: "technician", staffId: "not-assigned" } satisfies StaffSession;
  assert(canViewTask(salesSession, tasks[0]), "sales can view AMC renewal task");
  assert(!canViewTask(techSession, tasks[0]), "technician cannot view AMC renewal task they do not own");
  const taskAudit = await prisma.auditLog.findFirst({ where: { action: "task.create", entityId: tasks[0].id } });
  assert(taskAudit, "task creation audited");
  const assignAudit = await prisma.auditLog.findFirst({ where: { action: "amc.assign", entityId: created.row.id } });
  assert(assignAudit, "staff assignment audited");
  const assigned = await prisma.amcContract.findUnique({ where: { id: created.row.id } });
  assert(assigned?.assignedStaffId === salesA.id, "contract assigned to sales");
  assert(assigned?.endDate?.toISOString() === endBefore, "scan does not renew the contract");

  await scanAmcRenewals({ windowDays: 30 });
  await drain(ids.contracts);
  assert((await prisma.opsTask.count({ where: { subjectId: created.row.id, kind: "amc_renewal" } })) === 1, "no duplicate AMC renewal task");

  const noSalesCustomer = await prisma.customer.create({ data: { name: "2F54 No Sales" } });
  ids.customers.push(noSalesCustomer.id);
  const noSales = await createAmcContract(
    {
      customerId: noSalesCustomer.id,
      reference: "2F54-NOSALES",
      startDate: dayOffset(-5),
      endDate: dayOffset(5),
      frequency: "yearly",
      coveredServices: "General",
      locationLabel: "Dubai",
      propertyLabel: "Flat",
      notes: "",
      status: "active",
    },
    "manager@verify.local",
  );
  assert(noSales.ok, "no-sales contract");
  ids.contracts.push(noSales.row.id);
  await prisma.staff.updateMany({ where: { id: { in: [salesA.id, salesB.id] } }, data: { status: "inactive" } });
  await scanAmcRenewals({ windowDays: 30 });
  await drain([noSales.row.id]);
  const unassigned = await prisma.opsTask.findMany({ where: { subjectId: noSales.row.id, kind: "amc_renewal" } });
  assert(unassigned.length === 1, "task still created without sales");
  assert(!unassigned[0].assigneeStaffId, "task remains unassigned when no eligible sales");
  await prisma.staff.updateMany({ where: { id: { in: [salesA.id, salesB.id] } }, data: { status: "active" } });

  const human = await createAmcContract(
    {
      customerId: customer.id,
      reference: "2F54-HUMAN",
      startDate: dayOffset(-5),
      endDate: dayOffset(7),
      frequency: "yearly",
      coveredServices: "General",
      locationLabel: "Dubai",
      propertyLabel: "Warehouse",
      notes: "",
      status: "active",
    },
    "manager@verify.local",
  );
  assert(human.ok, "human-assignment contract");
  ids.contracts.push(human.row.id);
  await prisma.amcContract.update({ where: { id: human.row.id }, data: { assignedStaffId: salesB.id } });
  await scanAmcRenewals({ windowDays: 30 });
  await drain([human.row.id]);
  const afterHuman = await prisma.amcContract.findUnique({ where: { id: human.row.id } });
  assert(afterHuman?.assignedStaffId === salesB.id, "human assignment preserved");
  const humanAssign = await assignStaffForAutomation({
    target: "amc",
    role: "sales",
    subjectType: "AmcContract",
    subjectId: human.row.id,
    facts: {},
  });
  assert(!humanAssign.ok && "error" in humanAssign && humanAssign.error === "human_override", "ASSIGN_STAFF does not overwrite human AMC assignment");

  const job = await prisma.automationJob.findFirst({
    where: { trigger: "AMC_RENEWAL_APPROACHING", subjectId: created.row.id },
  });
  assert(job, "renewal job exists");
  const payload = JSON.parse(job.payloadJson || "{}") as Record<string, unknown>;
  assert(payload.windowDays === 30 && typeof payload.endDate === "string", "payload is operational");
  assert(!containsBlockedPrivacy(payload), "payload has no blocked privacy keys");
  assert(!job.payloadJson.toLowerCase().includes("phone"), "no phone in payload");
  assert(!job.payloadJson.toLowerCase().includes("email"), "no email in payload");
  assert(!job.payloadJson.toLowerCase().includes("notes"), "no notes in payload");
  assert(job.idempotencyKey.includes(amcOccurrenceKey(created.row.endDate as Date, 30)), "occurrence is per contract/window");

  const runs = await prisma.automationRun.findMany({ where: { subjectId: { in: ids.contracts } } });
  for (const run of runs) {
    assert(!containsBlockedPrivacy(run), "run log has no blocked privacy keys");
    assert(!run.actionsJson.toLowerCase().includes("phone"), "run log has no phone");
    assert(!run.actionsJson.toLowerCase().includes("email"), "run log has no email");
    assert(!run.actionsJson.toLowerCase().includes("whatsapp"), "run log has no whatsapp");
  }

  assert((await prisma.invoice.count()) === invoicesBefore, "no invoice created");
  assert((await prisma.booking.count()) === bookingsBefore, "no booking created");
  assert((await prisma.payment.count()) === paymentsBefore, "no payment changes");
  const seed = await prisma.automationRule.findUnique({ where: { key: "amc-renewal-approaching" } });
  assert(seed && !seed.enabled, "example AMC rule stays disabled");
  assert(seed.actionsJson.includes("CREATE_AMC_RENEWAL_TASK") && seed.actionsJson.includes("\"amc\""), "seed rule uses AMC assignment target");

  const analyticsSrc = readFileSync(join(process.cwd(), "src/app/admin/analytics/page.tsx"), "utf8");
  assert(analyticsSrc.includes("Renewals: No data yet"), "analytics renewal copy unchanged");
  const insightsSrc = readFileSync(join(process.cwd(), "src/lib/insights/query.ts"), "utf8");
  assert(insightsSrc.includes('renewals: "none"'), "insights still does not invent renewal counts");
  const sitemapSrc = readFileSync(join(process.cwd(), "src/app/sitemap.ts"), "utf8");
  assert(!sitemapSrc.includes("/amc"), "public sitemap has no AMC routes");
  const publicSrc = readFileSync(join(process.cwd(), "src/lib/ai/orchestrator.ts"), "utf8");
  assert(publicSrc.includes("runAlnajahAi") && !publicSrc.includes("scanAmcRenewals"), "public AI does not run AMC scan");
  const tickSrc = readFileSync(join(process.cwd(), "src/lib/automation/tick.ts"), "utf8");
  assert(tickSrc.includes("scanAmcRenewals"), "tick runs the renewal scan");
  const amcPage = readFileSync(join(process.cwd(), "src/app/admin/amc/page.tsx"), "utf8");
  assert(amcPage.includes("automation tick"), "admin list does not imply page-load scan");

  console.log("Phase 2F.5.4 verification passed.");
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (pausedSales.length) {
      await prisma.staff.updateMany({ where: { id: { in: pausedSales } }, data: { status: "active" } }).catch((error) => console.error(error));
    }
    await wipe().catch((error) => console.error(error));
    await prisma.$disconnect();
  });
