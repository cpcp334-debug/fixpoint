import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { hashPassword } from "../src/lib/admin/crypto";
import { executeAction } from "../src/lib/automation/actions";
import { canProposeAction, createTaskProposal, editTaskProposal, cancelTaskProposal, approveTaskProposal, proposalActionKey } from "../src/lib/cofounder/proposals";
import { toolAllowed, toolsForRole } from "../src/lib/cofounder/rbac";
import { executeCofounderTool } from "../src/lib/cofounder/tools";
import { FORBIDDEN_COFOUNDER_TOOLS, type CofounderSession } from "../src/lib/cofounder/types";
import { containsBlockedPrivacy } from "../src/lib/cofounder/privacy";

const ids = {
  users: [] as string[],
  leads: [] as string[],
  bookings: [] as string[],
  workOrders: [] as string[],
  staff: [] as string[],
  services: [] as string[],
  categories: [] as string[],
  proposals: [] as string[],
};

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function session(userId: string, role: string, staffId: string | null = null): CofounderSession {
  return { id: userId, email: `${role}@2g3.verify.local`, role, staffId, frozenRole: role };
}

async function wipe() {
  await prisma.staffAiProposal.deleteMany({ where: { OR: [{ actorEmail: { contains: "2g3.verify" } }, { id: { in: ids.proposals } }] } });
  await prisma.staffAiConversation.deleteMany({ where: { user: { email: { startsWith: "2g3-" } } } });
  if (ids.leads.length) {
    await prisma.opsTask.deleteMany({ where: { subjectId: { in: ids.leads } } });
    await prisma.leadScoreHistory.deleteMany({ where: { leadId: { in: ids.leads } } });
    await prisma.leadScore.deleteMany({ where: { leadId: { in: ids.leads } } });
    await prisma.lead.deleteMany({ where: { id: { in: ids.leads } } });
  }
  await prisma.opsTask.deleteMany({ where: { source: "cofounder", notes: { startsWith: "proposal:" } } });
  if (ids.workOrders.length) {
    await prisma.opsTask.deleteMany({ where: { subjectId: { in: ids.workOrders } } });
    await prisma.workOrder.deleteMany({ where: { id: { in: ids.workOrders } } });
  }
  if (ids.bookings.length) await prisma.booking.deleteMany({ where: { id: { in: ids.bookings } } });
  await prisma.staff.deleteMany({ where: { staffCode: { in: ["2G3-SALES", "2G3-ELEC", "2G3-PLUMB"] } } });
  const services = await prisma.service.findMany({ where: { slug: { startsWith: "2g3-verify-" } }, select: { id: true } });
  if (services.length) {
    await prisma.serviceI18n.deleteMany({ where: { serviceId: { in: services.map((row) => row.id) } } });
    await prisma.service.deleteMany({ where: { id: { in: services.map((row) => row.id) } } });
  }
  const cats = await prisma.serviceCategory.findMany({ where: { slug: { startsWith: "2g3-verify-" } }, select: { id: true } });
  if (cats.length) {
    await prisma.serviceCategoryI18n.deleteMany({ where: { categoryId: { in: cats.map((row) => row.id) } } });
    await prisma.serviceCategory.deleteMany({ where: { id: { in: cats.map((row) => row.id) } } });
  }
  await prisma.user.deleteMany({ where: { email: { startsWith: "2g3-" } } });
}

async function main() {
  await wipe();

  assert(toolsForRole("sales").includes("propose_follow_up"), "sales may propose follow-ups");
  assert(toolsForRole("sales").includes("get_followup_gaps"), "sales may read follow-up gaps");
  assert(!toolsForRole("content_manager").includes("propose_task"), "content cannot propose tasks");
  assert(!toolAllowed("content_manager", "propose_follow_up"), "content propose denied");
  assert(!toolAllowed("sales", "create_task"), "direct create_task stays forbidden");
  assert(!canProposeAction("content_manager", { actionType: "CREATE_FOLLOW_UP", subjectType: "Lead" }), "content RBAC");
  assert(canProposeAction("sales", { actionType: "CREATE_FOLLOW_UP", subjectType: "Lead" }), "sales lead follow-up");
  assert(!canProposeAction("sales", { actionType: "CREATE_TASK", subjectType: "WorkOrder" }), "sales cannot propose WO tasks");
  assert(canProposeAction("technician", { actionType: "CREATE_TASK", subjectType: "WorkOrder" }), "technician WO tasks");
  assert(!canProposeAction("technician", { actionType: "CREATE_FOLLOW_UP", subjectType: "Lead" }), "technician cannot propose lead follow-up");

  const passwordHash = hashPassword("verify-password-12");
  const managerUser = await prisma.user.create({
    data: { email: "2g3-manager@verify.local", name: "2G3 Manager", passwordHash, role: "manager", active: true },
  });
  const salesUser = await prisma.user.create({
    data: { email: "2g3-sales@verify.local", name: "2G3 Sales", passwordHash, role: "sales", active: true },
  });
  const contentUser = await prisma.user.create({
    data: { email: "2g3-content@verify.local", name: "2G3 Content", passwordHash, role: "content_manager", active: true },
  });
  const techUser = await prisma.user.create({
    data: { email: "2g3-tech@verify.local", name: "2G3 Tech", passwordHash, role: "technician", active: true },
  });
  ids.users.push(managerUser.id, salesUser.id, contentUser.id, techUser.id);

  const salesStaff = await prisma.staff.create({ data: { staffCode: "2G3-SALES", role: "sales", status: "active" } });
  const plumber = await prisma.staff.create({
    data: { staffCode: "2G3-PLUMB", role: "technician", status: "active", skills: { create: { categorySlug: "2g3-verify-plumb" } } },
  });
  const electrician = await prisma.staff.create({
    data: { staffCode: "2G3-ELEC", role: "technician", status: "active", skills: { create: { categorySlug: "electrical" } } },
  });
  ids.staff.push(salesStaff.id, plumber.id, electrician.id);
  await prisma.user.update({ where: { id: techUser.id }, data: { staffId: plumber.id } });

  const leadA = await prisma.lead.create({
    data: {
      source: "contact",
      name: "2G3 Lead A",
      phone: "+971509038601",
      requirement: "HOT follow-up needed.",
      status: "NEW",
      score: { create: { score: 90, systemClass: "HOT", effectiveClass: "HOT", reasonsJson: "[]" } },
    },
  });
  const leadB = await prisma.lead.create({
    data: {
      source: "contact",
      name: "2G3 Lead B",
      phone: "+971509038602",
      requirement: "Second HOT lead.",
      status: "NEW",
      score: { create: { score: 88, systemClass: "HOT", effectiveClass: "HOT", reasonsJson: "[]" } },
    },
  });
  const leadFail = await prisma.lead.create({
    data: {
      source: "contact",
      name: "2G3 Lead Fail",
      phone: "+971509038603",
      requirement: "Will be deleted.",
      status: "NEW",
      score: { create: { score: 70, systemClass: "WARM", effectiveClass: "WARM", reasonsJson: "[]" } },
    },
  });
  ids.leads.push(leadA.id, leadB.id, leadFail.id);

  const booking = await prisma.booking.create({
    data: { number: "ALN-2G3-VERIFY", name: "2G3 Booking", phone: "+971509038604", requirement: "Stay requested.", status: "requested" },
  });
  ids.bookings.push(booking.id);

  const category = await prisma.serviceCategory.create({
    data: { slug: "2g3-verify-plumb", sortOrder: 97, translations: { create: [{ locale: "en", name: "2G3 Plumb" }] } },
  });
  ids.categories.push(category.id);
  const service = await prisma.service.create({
    data: {
      categoryId: category.id,
      slug: "2g3-verify-plumb-svc",
      serviceType: "maintenance",
      status: "active",
      translations: {
        create: [{ locale: "en", name: "2G3 Plumb", shortDescription: "v", longDescription: "v", professionalFallback: "v", seoTitle: "v", metaDescription: "v" }],
      },
    },
  });
  ids.services.push(service.id);
  const wo = await prisma.workOrder.create({
    data: {
      number: "ALN-WO-2G3-001",
      serviceId: service.id,
      technicianId: plumber.id,
      status: "assigned",
      serviceLabel: "2G3 Plumb",
      locationLabel: "Verify",
    },
  });
  ids.workOrders.push(wo.id);

  const sales = session(salesUser.id, "sales", salesStaff.id);
  sales.email = salesUser.email;
  const manager = session(managerUser.id, "manager");
  manager.email = managerUser.email;
  const content = session(contentUser.id, "content_manager");
  content.email = contentUser.email;
  const tech = session(techUser.id, "technician", plumber.id);
  tech.email = techUser.email;

  const gaps = await executeCofounderTool(sales, "get_followup_gaps", {});
  assert(gaps.ok, "follow-up gaps tool");
  const gapData = gaps.data as { count: number; leads: Array<{ id: string }> };
  assert(gapData.count >= 2 && gapData.leads.some((row) => row.id === leadA.id), "gaps use real HOT leads");

  const contentPropose = await executeCofounderTool(content, "propose_follow_up", { subjectId: leadA.id });
  assert(contentPropose.denied, "content manager cannot propose");

  const tasksBefore = await prisma.opsTask.count();
  const quotesBefore = await prisma.quote.count();
  const invoicesBefore = await prisma.invoice.count();
  const pricesBefore = await prisma.pricingRule.count();
  const woBefore = await prisma.workOrder.count();
  const bookingsConfirmedBefore = await prisma.booking.count({ where: { status: "confirmed" } });

  const created = await createTaskProposal(sales, {
    title: "Create follow-up tasks",
    reason: "HOT lead with no open follow-up task",
    sopCode: "SOP-SALES-001",
    sopTitle: "HOT lead follow-up",
    items: [
      { actionType: "CREATE_FOLLOW_UP", subjectType: "Lead", subjectId: leadA.id, title: "Follow-up", dueInHours: 2, assigneeStaffId: salesStaff.id },
      { actionType: "CREATE_FOLLOW_UP", subjectType: "Lead", subjectId: leadB.id, title: "Follow-up", dueInHours: 2 },
    ],
  });
  assert(created.ok && "proposal" in created && created.proposal, "proposal created");
  const proposal = created.proposal;
  ids.proposals.push(proposal.id);
  assert(proposal.status === "PENDING", "pending status");
  assert((await prisma.opsTask.count()) === tasksBefore, "proposal does not create a task");
  const createAudit = await prisma.auditLog.findFirst({ where: { action: "cofounder.proposal.create", entityId: proposal.id } });
  assert(createAudit, "create audited");
  assert(!createAudit.meta.includes("HOT follow-up needed"), "audit has no customer requirement/transcript");

  const dupTool = await executeCofounderTool(sales, "propose_follow_up", { subjectId: leadA.id, title: "Follow-up", dueInHours: 2 });
  assert(dupTool.ok, "repeat propose is ok");
  const dupData = dupTool.data as { duplicate?: boolean; proposal?: { id: string } };
  assert(dupData.duplicate && dupData.proposal?.id === proposal.id, "repeat propose reuses pending proposal");

  const salesWo = await createTaskProposal(sales, {
    items: [{ actionType: "CREATE_TASK", subjectType: "WorkOrder", subjectId: wo.id, title: "Prep" }],
  });
  assert(!salesWo.ok && "denied" in salesWo && salesWo.denied, "sales cannot propose WO task");

  const techLead = await createTaskProposal(tech, {
    items: [{ actionType: "CREATE_FOLLOW_UP", subjectType: "Lead", subjectId: leadA.id, title: "Follow-up" }],
  });
  assert(!techLead.ok && "denied" in techLead && techLead.denied, "technician cannot propose lead follow-up");

  const edited = await editTaskProposal(sales, proposal.id, { title: "AMC-free follow-up", dueInHours: 4, assigneeStaffId: salesStaff.id });
  assert(edited.ok && edited.proposal.status === "PENDING", "edit keeps pending");
  assert(edited.proposal.items[0].title === "AMC-free follow-up", "title edited");
  assert(edited.proposal.items[0].dueInHours === 4, "due edited");

  const skillEdit = await editTaskProposal(sales, proposal.id, { assigneeStaffId: electrician.id });
  assert(!skillEdit.ok && "error" in skillEdit && skillEdit.error === "skill", "StaffSkill blocks unqualified technician assignee");

  const cancelLead = await prisma.lead.create({
    data: {
      source: "contact",
      name: "2G3 Lead Cancel",
      phone: "+971509038605",
      requirement: "Cancel this proposal.",
      status: "NEW",
    },
  });
  ids.leads.push(cancelLead.id);
  const toCancel = await createTaskProposal(sales, {
    items: [{ actionType: "CREATE_FOLLOW_UP", subjectType: "Lead", subjectId: cancelLead.id, title: "Follow-up", dueInHours: 2 }],
  });
  assert(toCancel.ok && "proposal" in toCancel && toCancel.proposal, "cancel proposal created");
  ids.proposals.push(toCancel.proposal.id);
  const cancelled = await cancelTaskProposal(sales, toCancel.proposal.id);
  assert(cancelled.ok && cancelled.proposal.status === "CANCELLED" && cancelled.tasksUnchanged, "cancel creates no task");
  const cancelAudit = await prisma.auditLog.findFirst({ where: { action: "cofounder.proposal.cancel", entityId: toCancel.proposal.id } });
  assert(cancelAudit, "cancel audited");

  const approved = await approveTaskProposal(sales, proposal.id);
  assert(approved.ok && approved.proposal.status === "APPROVED", "approve creates tasks");
  const tasks = await prisma.opsTask.findMany({ where: { notes: `proposal:${proposal.id}` } });
  assert(tasks.length === 2, "two follow-up tasks");
  assert(tasks.every((row) => row.source === "cofounder" && row.kind === "follow_up"), "source and kind");
  assert(tasks.some((row) => row.assigneeStaffId === salesStaff.id), "assignee set where provided");
  assert(tasks.every((row) => row.idempotencyKey.startsWith(`cofounder:${proposal.id}:`)), "idempotency key format");
  const taskAudit = await prisma.auditLog.findFirst({ where: { action: "cofounder.task.create", entityId: tasks[0].id } });
  assert(taskAudit, "cofounder task create audited");
  const execAudit = await prisma.auditLog.findFirst({ where: { action: "cofounder.proposal.execute", entityId: proposal.id } });
  assert(execAudit, "execute audited");
  const approveAudit = await prisma.auditLog.findFirst({ where: { action: "cofounder.proposal.approve", entityId: proposal.id } });
  assert(approveAudit, "approve audited");

  const second = await approveTaskProposal(sales, proposal.id);
  assert(second.ok && "duplicate" in second && second.duplicate, "duplicate approval rejected as idempotent");
  assert((await prisma.opsTask.count({ where: { notes: `proposal:${proposal.id}` } })) === 2, "no duplicate tasks");
  const replay = await executeAction({
    action: { type: "CREATE_FOLLOW_UP", title: "Follow-up", dueInHours: 4 },
    index: 0,
    ruleKey: "cofounder",
    ruleId: "",
    subjectType: "Lead",
    subjectId: leadA.id,
    occurrence: proposal.id,
    facts: {},
    idempotencyKey: proposalActionKey(proposal.id, 0),
    source: "cofounder",
  });
  assert(replay.status === "success" && replay.resultRef === tasks.find((row) => row.subjectId === leadA.id)?.id, "handler idempotency");

  const failProposal = await createTaskProposal(sales, {
    items: [{ actionType: "CREATE_FOLLOW_UP", subjectType: "Lead", subjectId: leadFail.id, title: "Follow-up", dueInHours: 2 }],
  });
  assert(failProposal.ok && "proposal" in failProposal && failProposal.proposal, "failure proposal created");
  ids.proposals.push(failProposal.proposal.id);
  await prisma.leadScoreHistory.deleteMany({ where: { leadId: leadFail.id } });
  await prisma.leadScore.deleteMany({ where: { leadId: leadFail.id } });
  await prisma.lead.delete({ where: { id: leadFail.id } });
  ids.leads = ids.leads.filter((id) => id !== leadFail.id);
  const failed = await approveTaskProposal(sales, failProposal.proposal.id);
  assert(!failed.ok && failed.proposal?.status === "FAILED", "missing subject fails the proposal");
  assert(!(await prisma.opsTask.findFirst({ where: { notes: `proposal:${failProposal.proposal.id}` } })), "failed execute creates no task");

  const techPropose = await createTaskProposal(tech, {
    items: [
      {
        actionType: "CREATE_TASK",
        subjectType: "WorkOrder",
        subjectId: wo.id,
        title: "Site prep",
        kind: "work_order_prep",
        assigneeStaffId: electrician.id,
      },
    ],
  });
  assert(techPropose.ok && "proposal" in techPropose && techPropose.proposal, "technician may propose on assigned WO");
  ids.proposals.push(techPropose.proposal.id);
  assert(!techPropose.proposal.items[0].assigneeStaffId, "unqualified technician assignee left empty");
  const techApproved = await approveTaskProposal(tech, techPropose.proposal.id);
  assert(techApproved.ok, "technician approve assigned WO task");
  const woTask = await prisma.opsTask.findFirst({ where: { notes: `proposal:${techPropose.proposal.id}` } });
  assert(woTask && !woTask.assigneeStaffId, "task remains unassigned when no qualified technician");

  for (const name of FORBIDDEN_COFOUNDER_TOOLS) {
    const result = await executeCofounderTool(manager, name, { id: booking.id });
    assert(result.denied, `${name} denied`);
  }
  const forbidden = await executeAction({
    action: { type: "CONFIRM_BOOKING" },
    index: 0,
    ruleKey: "cofounder",
    ruleId: "",
    subjectType: "Booking",
    subjectId: booking.id,
    occurrence: "verify",
    facts: {},
  });
  assert(forbidden.status === "failed", "CONFIRM_BOOKING cannot run");
  const price = await executeAction({
    action: { type: "MODIFY_PRICE" },
    index: 0,
    ruleKey: "cofounder",
    ruleId: "",
    subjectType: "Lead",
    subjectId: leadA.id,
    occurrence: "verify",
    facts: {},
  });
  assert(price.status === "failed", "MODIFY_PRICE cannot run");
  const stillRequested = await prisma.booking.findUnique({ where: { id: booking.id } });
  assert(stillRequested?.status === "requested", "booking not confirmed");
  assert((await prisma.quote.count()) === quotesBefore, "no quote created");
  assert((await prisma.invoice.count()) === invoicesBefore, "no invoice created");
  assert((await prisma.pricingRule.count()) === pricesBefore, "no price change");
  assert((await prisma.workOrder.count()) === woBefore, "no extra work order");
  assert((await prisma.booking.count({ where: { status: "confirmed" } })) === bookingsConfirmedBefore, "no booking confirmation");

  const stored = await prisma.staffAiProposal.findUnique({ where: { id: proposal.id } });
  assert(stored && !containsBlockedPrivacy(JSON.parse(stored.itemsJson)), "proposal payload has no blocked keys");
  assert(!stored.itemsJson.toLowerCase().includes("phone"), "proposal items have no phone");
  assert(!createAudit.meta.toLowerCase().includes("transcript"), "audit has no transcript");

  const publicSrc = readFileSync(join(process.cwd(), "src/lib/ai/orchestrator.ts"), "utf8");
  assert(publicSrc.includes("runAlnajahAi") && !publicSrc.includes("StaffAiProposal"), "public AI does not use proposals");
  const publicRoute = readFileSync(join(process.cwd(), "src/app/api/ai/chat/route.ts"), "utf8");
  assert(publicRoute.includes("runAlnajahAi") && !publicRoute.includes("runCofounder"), "public chat unchanged");
  const openaiSrc = readFileSync(join(process.cwd(), "src/lib/ai/openai.ts"), "utf8");
  assert(openaiSrc.includes("You are ALNAJAH AI for ALNAJAH ALDAEM"), "public system prompt unchanged");
  const sitemapSrc = readFileSync(join(process.cwd(), "src/app/sitemap.ts"), "utf8");
  assert(!sitemapSrc.includes("/proposals"), "no public proposal page");

  console.log("Phase 2G.3 verification passed.");
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await wipe().catch((error) => console.error(error));
    await prisma.$disconnect();
  });
