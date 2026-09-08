import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { hashPassword } from "../src/lib/admin/crypto";
import { can } from "../src/lib/admin/rbac";
import { cofounderFailsafeReply } from "../src/lib/cofounder/failsafe";
import {
  consumeCofounderDailyChat,
  DEFAULT_COFOUNDER_DAILY_CHAT_LIMIT,
  getCofounderDailyUsage,
  resolveCofounderDailyChatLimit,
} from "../src/lib/cofounder/limits";
import { getPriorityActions } from "../src/lib/cofounder/priority";
import { containsBlockedPrivacy } from "../src/lib/cofounder/privacy";
import { dashboardPromptsForRole, suggestedPromptsForRole } from "../src/lib/cofounder/prompts";
import { toolResultCards } from "../src/lib/cofounder/result-cards";
import { toolAllowed, toolsForRole } from "../src/lib/cofounder/rbac";
import { executeCofounderTool } from "../src/lib/cofounder/tools";
import {
  COFOUNDER_TIMEOUT_MS,
  FORBIDDEN_COFOUNDER_TOOLS,
  MAX_TURNS,
  MAX_USER_MESSAGE,
  type CofounderSession,
} from "../src/lib/cofounder/types";
import { BUSINESS_TZ } from "../src/lib/insights/dates";

const ids = {
  users: [] as string[],
  leads: [] as string[],
  bookings: [] as string[],
  workOrders: [] as string[],
  quotes: [] as string[],
  invoices: [] as string[],
  customers: [] as string[],
  reviews: [] as string[],
  questions: [] as string[],
  amc: [] as string[],
};

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function session(userId: string, role: string, staffId: string | null = null): CofounderSession {
  return { id: userId, email: `${role}@2g5.verify.local`, role, staffId, frozenRole: role };
}

function runRegression(script: string) {
  const result = spawnSync("npx", ["tsx", `scripts/${script}`], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: true,
    stdio: "inherit",
  });
  assert(result.status === 0, `${script} failed`);
}

async function wipe() {
  await prisma.staffAiDailyUsage.deleteMany({ where: { user: { email: { startsWith: "2g5-" } } } });
  await prisma.staffAiProposal.deleteMany({ where: { actorEmail: { contains: "2g5.verify" } } });
  await prisma.staffAiConversation.deleteMany({ where: { user: { email: { startsWith: "2g5-" } } } });
  if (ids.amc.length) await prisma.amcContract.deleteMany({ where: { id: { in: ids.amc } } });
  if (ids.invoices.length) {
    await prisma.payment.deleteMany({ where: { invoiceId: { in: ids.invoices } } });
    await prisma.invoice.deleteMany({ where: { id: { in: ids.invoices } } });
  }
  if (ids.quotes.length) await prisma.quote.deleteMany({ where: { id: { in: ids.quotes } } });
  if (ids.reviews.length) await prisma.review.deleteMany({ where: { id: { in: ids.reviews } } });
  if (ids.questions.length) await prisma.question.deleteMany({ where: { id: { in: ids.questions } } });
  if (ids.workOrders.length) await prisma.workOrder.deleteMany({ where: { id: { in: ids.workOrders } } });
  if (ids.bookings.length) await prisma.booking.deleteMany({ where: { id: { in: ids.bookings } } });
  if (ids.leads.length) {
    await prisma.opsTask.deleteMany({ where: { subjectId: { in: ids.leads } } });
    await prisma.leadScoreHistory.deleteMany({ where: { leadId: { in: ids.leads } } });
    await prisma.leadScore.deleteMany({ where: { leadId: { in: ids.leads } } });
    await prisma.lead.deleteMany({ where: { id: { in: ids.leads } } });
  }
  await prisma.lead.deleteMany({ where: { phone: { startsWith: "+9715090388" } } });
  if (ids.customers.length) await prisma.customer.deleteMany({ where: { id: { in: ids.customers } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: "2g5-" } } });
}

async function main() {
  await wipe();

  assert(MAX_USER_MESSAGE === 2000, "message limit");
  assert(MAX_TURNS === 12, "turn limit");
  assert(COFOUNDER_TIMEOUT_MS === 15_000, "timeout");
  assert(DEFAULT_COFOUNDER_DAILY_CHAT_LIMIT === 100, "default daily cap 100");
  assert(BUSINESS_TZ === "Asia/Dubai", "business timezone");
  const chatRoute = readFileSync(join(process.cwd(), "src/app/api/admin/ai/chat/route.ts"), "utf8");
  assert(chatRoute.includes("await rateLimit(`cofounder:${session.id}`, 30, 10 * 60 * 1000)"), "30/10min preserved");
  assert(chatRoute.includes("consumeCofounderDailyChat"), "daily limit enforced server-side");
  assert(readFileSync(join(process.cwd(), "src/lib/cofounder/orchestrator.ts"), "utf8").includes("COFOUNDER_MODEL"), "model override");
  assert(readFileSync(join(process.cwd(), "src/lib/ai/openai.ts"), "utf8").includes("OPENAI_MODEL"), "public model unchanged");
  assert(!readFileSync(join(process.cwd(), "src/lib/ai/openai.ts"), "utf8").includes("COFOUNDER_MODEL"), "public AI ignores COFOUNDER_MODEL");

  const salesPrompts = suggestedPromptsForRole("sales");
  const techPrompts = suggestedPromptsForRole("technician");
  const managerPrompts = suggestedPromptsForRole("manager");
  const contentPrompts = suggestedPromptsForRole("content_manager");
  assert(salesPrompts.some((p) => p.toLowerCase().includes("hot")), "sales HOT prompts");
  assert(techPrompts.some((p) => p.toLowerCase().includes("assigned") || p.toLowerCase().includes("sop")), "tech prompts");
  assert(managerPrompts.some((p) => p.toLowerCase().includes("amc") || p.toLowerCase().includes("invoice")), "manager overview prompts");
  assert(contentPrompts.every((p) => !p.toLowerCase().includes("invoice")), "content prompts stay content-focused");
  assert(dashboardPromptsForRole("sales").length <= 5, "dashboard prompt budget");

  assert(toolsForRole("sales").includes("get_priority_actions"), "sales priority tool");
  assert(toolsForRole("sales").includes("propose_draft_quote"), "2G.4 sales quote preserved");
  assert(!toolsForRole("sales").includes("propose_draft_invoice"), "2G.4 sales invoice deny preserved");
  assert(!toolAllowed("content_manager", "propose_task"), "content cannot propose tasks");
  assert(FORBIDDEN_COFOUNDER_TOOLS.includes("confirm_booking"), "booking confirmation still forbidden");
  assert(FORBIDDEN_COFOUNDER_TOOLS.includes("draft_quote"), "direct draft quote forbidden");

  const passwordHash = hashPassword("verify-password-12");
  const managerUser = await prisma.user.create({
    data: { email: "2g5-manager@verify.local", name: "2G5 Manager", passwordHash, role: "manager", active: true },
  });
  const salesUser = await prisma.user.create({
    data: { email: "2g5-sales@verify.local", name: "2G5 Sales", passwordHash, role: "sales", active: true },
  });
  const contentUser = await prisma.user.create({
    data: { email: "2g5-content@verify.local", name: "2G5 Content", passwordHash, role: "content_manager", active: true },
  });
  const techUser = await prisma.user.create({
    data: { email: "2g5-tech@verify.local", name: "2G5 Tech", passwordHash, role: "technician", active: true },
  });
  ids.users.push(managerUser.id, salesUser.id, contentUser.id, techUser.id);

  const manager = session(managerUser.id, "manager");
  const sales = session(salesUser.id, "sales");
  const content = session(contentUser.id, "content_manager");
  const tech = session(techUser.id, "technician");

  const lead = await prisma.lead.create({
    data: {
      source: "contact",
      name: "2G5 HOT Lead",
      phone: "+971509038801",
      requirement: "Needs follow-up.",
      status: "NEW",
      score: { create: { score: 91, systemClass: "HOT", effectiveClass: "HOT", reasonsJson: "[]" } },
    },
  });
  ids.leads.push(lead.id);

  const customer = await prisma.customer.create({ data: { name: "2G5 Customer", phone: "+971509038802" } });
  ids.customers.push(customer.id);

  const staleQuote = await prisma.quote.create({
    data: {
      quoteNumber: "ALN-Q-2G5-SENT",
      status: "SENT",
      customerName: "2G5 Quote",
      customerPhone: "+971509038803",
      sentAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
      scope: "Stale sent quote",
    },
  });
  ids.quotes.push(staleQuote.id);

  const booking = await prisma.booking.create({
    data: {
      number: "ALN-2G5-BOOK",
      name: "2G5 Booking",
      phone: "+971509038804",
      requirement: "Stay requested",
      status: "requested",
      customerId: customer.id,
    },
  });
  ids.bookings.push(booking.id);

  const wo = await prisma.workOrder.create({
    data: {
      number: "ALN-WO-2G5-DONE",
      status: "completed",
      customerId: customer.id,
      bookingId: booking.id,
      serviceLabel: "Plumbing",
    },
  });
  ids.workOrders.push(wo.id);

  const overdueInv = await prisma.invoice.create({
    data: {
      number: "ALN-INV-2G5-OD",
      status: "OVERDUE",
      customerName: "2G5 Overdue",
      customerPhone: "+971509038805",
      customerId: customer.id,
    },
  });
  ids.invoices.push(overdueInv.id);

  const review = await prisma.review.create({
    data: { type: "service", status: "PENDING", stars: 1, authorName: "2G5 Low", body: "Bad" },
  });
  ids.reviews.push(review.id);

  const question = await prisma.question.create({
    data: { body: "2G5 question?", askerName: "Asker", moderationStatus: "PENDING" },
  });
  ids.questions.push(question.id);

  const amc = await prisma.amcContract.create({
    data: {
      customerId: customer.id,
      reference: "2G5-AMC",
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      status: "active",
    },
  });
  ids.amc.push(amc.id);

  assert(can("sales", "quotes") && !can("sales", "invoices"), "dashboard permission baseline sales");
  assert(can("manager", "invoices") && can("manager", "amc"), "dashboard permission baseline manager");
  assert(!can("content_manager", "quotes"), "content no quotes");

  const salesPriority = await getPriorityActions(sales, 8);
  assert(salesPriority.some((row) => row.id === "hot-followup-gaps"), "sales sees HOT follow-up gaps");
  assert(salesPriority.some((row) => row.id === "stale-sent-quotes"), "sales sees stale quotes");
  assert(!salesPriority.some((row) => row.id === "overdue-invoices"), "sales does not see invoice priorities");
  assert(!salesPriority.some((row) => row.id === "amc-renewals"), "sales does not see AMC priorities");

  const managerPriority = await getPriorityActions(manager, 8);
  assert(managerPriority.some((row) => row.id === "overdue-invoices"), "manager overdue invoices");
  assert(managerPriority.some((row) => row.id === "completed-wo-no-invoice"), "manager WO without invoice");
  assert(managerPriority.some((row) => row.id === "amc-renewals"), "manager AMC renewals");
  assert(managerPriority.some((row) => row.id === "low-rating-reviews"), "manager low ratings");

  const contentPriority = await getPriorityActions(content, 8);
  assert(contentPriority.every((row) => row.id === "unanswered-qna" || row.id === "low-rating-reviews"), "content priorities limited");
  assert(!contentPriority.some((row) => row.id.startsWith("hot") || row.id.includes("invoice")), "content no finance/lead ops");

  const techPriority = await getPriorityActions(tech, 8);
  assert(!techPriority.some((row) => row.id === "hot-followup-gaps"), "tech no lead follow-up priority");

  const priorityTool = await executeCofounderTool(manager, "get_priority_actions", {});
  assert(priorityTool.ok && priorityTool.data && typeof priorityTool.data === "object", "priority tool ok");
  const actions = (priorityTool.data as { actions: unknown[] }).actions;
  assert(Array.isArray(actions) && actions.length > 0, "priority tool returns actions");
  const cards = toolResultCards("get_priority_actions", priorityTool.data);
  assert(cards.length > 0 && cards[0].title && typeof cards[0].count === "number", "structured priority cards");

  const brief = await executeCofounderTool(manager, "get_daily_brief", { range: "today" });
  assert(brief.ok && brief.data && typeof brief.data === "object", "daily brief");
  const briefData = brief.data as { sections?: Record<string, unknown[]>; timezone?: string; note?: string };
  assert(briefData.timezone === "Asia/Dubai", "brief timezone");
  assert(briefData.sections && Array.isArray(briefData.sections.business), "brief business section");
  assert(Array.isArray(briefData.sections?.finance), "brief finance section");
  assert(Array.isArray(briefData.sections?.amc), "brief amc section");
  const briefCards = toolResultCards("get_daily_brief", brief.data);
  assert(briefCards.length > 0, "brief cards");

  const salesBrief = await executeCofounderTool(sales, "get_daily_brief", { range: "today" });
  assert(salesBrief.ok, "sales brief");
  const salesBriefData = salesBrief.data as { sections?: { finance?: unknown[]; amc?: unknown[] } };
  assert((salesBriefData.sections?.finance || []).length === 0, "sales brief has no finance section metrics");
  assert((salesBriefData.sections?.amc || []).length === 0, "sales brief has no amc section");

  const paymentsBefore = await prisma.payment.count();
  const bookingBefore = await prisma.booking.findUnique({ where: { id: booking.id } });
  for (const name of FORBIDDEN_COFOUNDER_TOOLS) {
    const result = await executeCofounderTool(manager, name, { id: booking.id });
    assert(result.denied, `${name} denied`);
  }
  assert((await prisma.booking.findUnique({ where: { id: booking.id } }))?.status === bookingBefore?.status, "no booking mutation");
  assert((await prisma.payment.count()) === paymentsBefore, "no payment mutation");

  const prevLimit = process.env.COFOUNDER_DAILY_CHAT_LIMIT;
  process.env.COFOUNDER_DAILY_CHAT_LIMIT = "2";
  assert((await resolveCofounderDailyChatLimit()) === 2, "env daily limit configurable");
  const first = await consumeCofounderDailyChat(managerUser.id);
  const second = await consumeCofounderDailyChat(managerUser.id);
  const third = await consumeCofounderDailyChat(managerUser.id);
  assert(first.ok && second.ok && !third.ok, "daily cap blocks after limit");
  assert(first.timezone === "Asia/Dubai" && /^\d{4}-\d{2}-\d{2}$/.test(first.dayKey), "Dubai dayKey");
  const usage = await getCofounderDailyUsage(managerUser.id);
  assert(usage.used === 2 && usage.limit === 2 && !usage.ok, "usage reflects cap");
  if (prevLimit === undefined) delete process.env.COFOUNDER_DAILY_CHAT_LIMIT;
  else process.env.COFOUNDER_DAILY_CHAT_LIMIT = prevLimit;

  await prisma.siteSetting.upsert({
    where: { id: "site" },
    create: { id: "site", json: JSON.stringify({ cofounderDailyChatLimit: 77 }) },
    update: { json: JSON.stringify({ cofounderDailyChatLimit: 77 }) },
  });
  delete process.env.COFOUNDER_DAILY_CHAT_LIMIT;
  assert((await resolveCofounderDailyChatLimit()) === 77, "SiteSetting daily limit");
  await prisma.siteSetting.update({ where: { id: "site" }, data: { json: "{}" } });
  assert((await resolveCofounderDailyChatLimit()) === 100, "default daily limit restored");

  const failsafe = cofounderFailsafeReply();
  assert(failsafe.toLowerCase().includes("will not invent"), "failsafe refuses invention");
  assert(!containsBlockedPrivacy({ status: "ok", tool: "x" }), "privacy helper clean");

  const publicSrc = readFileSync(join(process.cwd(), "src/lib/ai/orchestrator.ts"), "utf8");
  assert(publicSrc.includes("runAlnajahAi") && publicSrc.includes("createLead"), "public AI intact");
  const publicRoute = readFileSync(join(process.cwd(), "src/app/api/ai/chat/route.ts"), "utf8");
  assert(publicRoute.includes("runAlnajahAi") && !publicRoute.includes("runCofounder"), "public chat route unchanged");
  const adminPage = readFileSync(join(process.cwd(), "src/app/admin/page.tsx"), "utf8");
  assert(adminPage.includes("getPriorityActions"), "dashboard Co-Founder snippet");
  assert(adminPage.toLowerCase().includes("operations inbox"), "dashboard remains operations inbox");
  assert(!adminPage.includes("loadInsights"), "dashboard is not full analytics");

  const financeSrc = readFileSync(join(process.cwd(), "src/lib/cofounder/finance.ts"), "utf8");
  assert(financeSrc.includes('status: "DRAFT"'), "quote/invoice safety preserved");
  assert(!/\bNumber\(/.test(financeSrc), "no price invention parsing");

  await wipe();
  console.log("2G5 core verification passed");
  runRegression("phase-2g1-verify.ts");
  runRegression("phase-2g2-verify.ts");
  runRegression("phase-2g3-verify.ts");
  runRegression("phase-2g4-verify.ts");
  console.log("2G5 + 2G.1/2G.2/2G.3/2G.4 verification passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await wipe().catch(() => undefined);
    await prisma.$disconnect();
  });
