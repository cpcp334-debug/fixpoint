import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { hashPassword } from "../src/lib/admin/crypto";
import { cofounderFailsafeReply } from "../src/lib/cofounder/failsafe";
import { runCofounder } from "../src/lib/cofounder/orchestrator";
import { containsBlockedPrivacy, sanitizeCofounderData } from "../src/lib/cofounder/privacy";
import { toolAllowed, toolsForRole } from "../src/lib/cofounder/rbac";
import { executeCofounderTool } from "../src/lib/cofounder/tools";
import type { CofounderSession } from "../src/lib/cofounder/types";
import { FORBIDDEN_COFOUNDER_TOOLS } from "../src/lib/cofounder/types";

const ids = {
  users: [] as string[],
  leads: [] as string[],
  bookings: [] as string[],
  conversations: [] as string[],
};

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function session(role: string, staffId: string | null = null): CofounderSession {
  return { id: `u-${role}`, email: `${role}@verify.local`, role, staffId, frozenRole: role };
}

async function wipe() {
  if (ids.conversations.length) {
    await prisma.staffAiConversation.deleteMany({ where: { id: { in: ids.conversations } } });
  }
  await prisma.staffAiConversation.deleteMany({ where: { user: { email: { startsWith: "2g1-" } } } });
  if (ids.leads.length) {
    await prisma.leadScoreHistory.deleteMany({ where: { leadId: { in: ids.leads } } });
    await prisma.leadScore.deleteMany({ where: { leadId: { in: ids.leads } } });
    await prisma.lead.deleteMany({ where: { id: { in: ids.leads } } });
  }
  if (ids.bookings.length) await prisma.booking.deleteMany({ where: { id: { in: ids.bookings } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: "2g1-" } } });
}

async function main() {
  await wipe();

  assert(toolsForRole("sales").includes("get_hot_leads"), "sales can read HOT leads");
  assert(toolsForRole("sales").includes("get_quote_pipeline"), "sales can read quotes");
  assert(!toolsForRole("sales").includes("get_invoice_status"), "sales cannot read invoices");
  assert(!toolsForRole("sales").includes("get_amc_expiring"), "sales cannot read AMC");
  assert(toolsForRole("customer_service").includes("get_review_summary"), "CS can read reviews");
  assert(!toolsForRole("customer_service").includes("get_quote_pipeline"), "CS cannot read quotes");
  assert(toolsForRole("supervisor").includes("get_booking_pipeline"), "supervisor bookings");
  assert(toolsForRole("supervisor").includes("get_work_order_status"), "supervisor work orders");
  assert(!toolsForRole("supervisor").includes("get_lead_summary"), "supervisor cannot read leads");
  assert(toolsForRole("technician").includes("get_work_order_status"), "technician work orders");
  assert(!toolsForRole("technician").includes("get_hot_leads"), "technician cannot read leads");
  assert(toolsForRole("content_manager").includes("get_qna_summary"), "content Q&A");
  assert(!toolsForRole("content_manager").includes("get_booking_pipeline"), "content cannot read bookings");
  assert(toolsForRole("manager").includes("get_amc_expiring"), "manager AMC");
  assert(toolsForRole("manager").includes("get_invoice_status"), "manager invoices");
  assert(!toolAllowed("sales", "create_task"), "write tools never allowed");

  const lead = await prisma.lead.create({
    data: {
      source: "contact",
      name: "2G1 Lead",
      phone: "+971509038501",
      requirement: "Need a plumber for a leaking tap this week.",
      status: "NEW",
      score: { create: { score: 82, systemClass: "HOT", effectiveClass: "HOT", reasonsJson: "[]" } },
    },
  });
  ids.leads.push(lead.id);
  const booking = await prisma.booking.create({
    data: {
      number: "ALN-2G1-VERIFY",
      name: "2G1 Booking",
      phone: "+971509038502",
      requirement: "Must stay requested.",
      status: "requested",
    },
  });
  ids.bookings.push(booking.id);

  const sales = session("sales");
  const tech = session("technician", "no-staff");
  const content = session("content_manager");
  const manager = session("manager");

  const hot = await executeCofounderTool(sales, "get_hot_leads", {});
  assert(hot.ok, "sales HOT leads tool");
  const quality = await executeCofounderTool(sales, "get_lead_quality", { id: lead.id });
  assert(quality.ok, "lead quality uses stored LeadScore");
  const deniedHot = await executeCofounderTool(tech, "get_hot_leads", {});
  assert(deniedHot.denied, "technician denied HOT leads");
  const deniedInvoice = await executeCofounderTool(sales, "get_invoice_status", {});
  assert(deniedInvoice.denied, "sales denied invoices");
  const deniedBooking = await executeCofounderTool(content, "get_booking_pipeline", {});
  assert(deniedBooking.denied, "content denied bookings");
  const brief = await executeCofounderTool(manager, "get_daily_brief", { range: "today" });
  assert(brief.ok, "manager daily brief");
  const loc = await executeCofounderTool(manager, "get_location_performance", {});
  assert(loc.ok, "location performance via loadInsights");
  const journey = await executeCofounderTool(sales, "get_customer_journey", { type: "lead", id: lead.id });
  assert(journey.ok, "journey via buildJourney");
  const techJourney = await executeCofounderTool(tech, "get_customer_journey", { type: "lead", id: lead.id });
  assert(techJourney.denied, "technician denied lead journey");
  const qna = await executeCofounderTool(content, "get_qna_summary", {});
  assert(qna.ok, "content Q&A summary");

  const tasksBefore = await prisma.opsTask.count();
  const quotesBefore = await prisma.quote.count();
  const invoicesBefore = await prisma.invoice.count();
  const woBefore = await prisma.workOrder.count();
  const rulesBefore = await prisma.automationRule.count();
  const knowledgeBefore = await prisma.knowledgeDocument.count();
  for (const name of FORBIDDEN_COFOUNDER_TOOLS) {
    const result = await executeCofounderTool(manager, name, { id: booking.id });
    assert(result.denied, `${name} denied`);
  }
  const stillRequested = await prisma.booking.findUnique({ where: { id: booking.id } });
  assert(stillRequested?.status === "requested", "confirm_booking must not mutate");
  assert((await prisma.opsTask.count()) === tasksBefore, "no task created");
  assert((await prisma.quote.count()) === quotesBefore, "no quote created");
  assert((await prisma.invoice.count()) === invoicesBefore, "no invoice created");
  assert((await prisma.workOrder.count()) === woBefore, "no work order created");
  assert((await prisma.automationRule.count()) === rulesBefore, "no automation change");
  assert((await prisma.knowledgeDocument.count()) === knowledgeBefore, "no private knowledge access");

  const dirty = sanitizeCofounderData({
    status: "NEW",
    ip: "1.2.3.4",
    fingerprint: "abc",
    photoKey: "secret",
    passwordHash: "x",
  }) as Record<string, unknown>;
  assert(dirty.status === "NEW" && !("ip" in dirty) && !("fingerprint" in dirty), "privacy strip");
  assert(!containsBlockedPrivacy(dirty), "sanitized payload has no blocked keys");

  const failsafe = cofounderFailsafeReply();
  assert(failsafe.includes("will not invent"), "failsafe refuses invented metrics");
  assert(!/\b\d{2,}\b/.test(failsafe), "failsafe has no invented counts");

  const user = await prisma.user.create({
    data: {
      email: "2g1-manager@verify.local",
      name: "2G1 Manager",
      passwordHash: hashPassword("verify-password-12"),
      role: "manager",
      active: true,
    },
  });
  ids.users.push(user.id);
  const prevKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const chat = await runCofounder({
    staff: { id: user.id, email: user.email, name: user.name, role: "manager", staffId: null },
    message: "How was business today?",
  });
  if (prevKey) process.env.OPENAI_API_KEY = prevKey;
  assert(chat.provider === "failsafe", "missing key uses failsafe");
  assert(chat.conversationId, "staff conversation created");
  ids.conversations.push(chat.conversationId);
  const stored = await prisma.staffAiConversation.findUnique({ where: { id: chat.conversationId } });
  assert(stored?.userId === user.id && stored.frozenRole === "manager", "role frozen, owned by staff user");
  assert(!("visitorId" in (stored as object)), "no visitor linkage on staff conversation");
  const audit = await prisma.auditLog.findFirst({ where: { action: "cofounder.chat", entityId: chat.conversationId } });
  assert(audit, "chat audited");
  assert(!audit.meta.includes("How was business"), "audit does not store the transcript");

  const publicSrc = readFileSync(join(process.cwd(), "src/lib/ai/orchestrator.ts"), "utf8");
  assert(publicSrc.includes("runAlnajahAi"), "public AI orchestrator intact");
  assert(publicSrc.includes("createLead"), "public AI still creates leads");
  assert(!publicSrc.includes("StaffAiConversation"), "public AI does not use staff conversations");
  const publicRoute = readFileSync(join(process.cwd(), "src/app/api/ai/chat/route.ts"), "utf8");
  assert(publicRoute.includes("runAlnajahAi"), "public chat route unchanged");
  assert(!publicRoute.includes("runCofounder"), "public chat route does not call Co-Founder");
  const openaiSrc = readFileSync(join(process.cwd(), "src/lib/ai/openai.ts"), "utf8");
  assert(openaiSrc.includes("You are ALNAJAH AI for Al Najah Al Daem"), "public system prompt unchanged");

  console.log("Phase 2G.1 verification passed.");
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
