import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { can, canManageKnowledge } from "../src/lib/admin/rbac";
import { COFOUNDER_TOOLS, FORBIDDEN_COFOUNDER_TOOLS, type CofounderSession } from "../src/lib/cofounder/types";
import { toolAllowed, toolsForRole } from "../src/lib/cofounder/rbac";
import { executeCofounderTool } from "../src/lib/cofounder/tools";
import { containsBlockedPrivacy } from "../src/lib/cofounder/privacy";
import {
  createInternalSop,
  updateInternalSop,
  setInternalSopStatus,
  getSopForSession,
  searchInternalSopsForSession,
  upsertTemplateSops,
} from "../src/lib/knowledge/sops";

const ids = {
  docs: [] as string[],
  staff: [] as string[],
  categories: [] as string[],
  services: [] as string[],
  workOrders: [] as string[],
};

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function session(role: string, staffId: string | null = null): CofounderSession {
  return { id: `u-${role}`, email: `${role}@verify.local`, role, staffId, frozenRole: role };
}

function actor(role: string, staffId: string | null = null) {
  return { email: `${role}@verify.local`, role, staffId, frozenRole: role };
}

async function wipe() {
  const leftover = await prisma.knowledgeDocument.findMany({
    where: { OR: [{ sopCode: { startsWith: "2G2-" } }, { id: { in: ids.docs } }] },
    select: { id: true },
  });
  const leftoverIds = leftover.map((row) => row.id);
  if (leftoverIds.length) {
    await prisma.knowledgeDocumentRevision.deleteMany({ where: { documentId: { in: leftoverIds } } });
    await prisma.knowledgeDocument.deleteMany({ where: { id: { in: leftoverIds } } });
  }
  await prisma.workOrder.deleteMany({
    where: { OR: [{ id: { in: ids.workOrders } }, { number: { startsWith: "ALN-WO-2G2" } }] },
  });
  await prisma.staff.deleteMany({ where: { staffCode: { in: ["2G2-PLUMB", "2G2-ELEC"] } } });
  const services = await prisma.service.findMany({ where: { slug: { startsWith: "2g2-verify-" } }, select: { id: true } });
  if (services.length) {
    await prisma.serviceI18n.deleteMany({ where: { serviceId: { in: services.map((row) => row.id) } } });
    await prisma.service.deleteMany({ where: { id: { in: services.map((row) => row.id) } } });
  }
  const cats = await prisma.serviceCategory.findMany({ where: { slug: { startsWith: "2g2-verify-" } }, select: { id: true } });
  if (cats.length) {
    await prisma.serviceCategoryI18n.deleteMany({ where: { categoryId: { in: cats.map((row) => row.id) } } });
    await prisma.serviceCategory.deleteMany({ where: { id: { in: cats.map((row) => row.id) } } });
  }
}

async function main() {
  await wipe();
  await upsertTemplateSops(prisma);

  assert(canManageKnowledge("manager") && can("super_admin", "knowledge"), "manager and super_admin manage knowledge");
  assert(!can("technician", "knowledge") && !can("content_manager", "knowledge"), "tech and content cannot manage SOP admin");
  assert(!can("sales", "knowledge") && !can("customer_service", "knowledge"), "sales and CS cannot open /admin/knowledge");
  assert(toolsForRole("manager").includes("get_sop") && toolsForRole("technician").includes("search_internal_sop"), "ops roles get SOP tools");
  assert(!toolsForRole("content_manager").includes("get_sop"), "content_manager has no SOP tools");
  assert(!toolAllowed("content_manager", "get_sop"), "content SOP tool denied at RBAC");
  assert(COFOUNDER_TOOLS.includes("get_daily_brief"), "2G.1 tools remain");
  assert(!(FORBIDDEN_COFOUNDER_TOOLS as readonly string[]).includes("get_sop"), "get_sop is allowed in 2G.2");
  assert(FORBIDDEN_COFOUNDER_TOOLS.includes("search_private_knowledge"), "private search stays forbidden");
  assert(FORBIDDEN_COFOUNDER_TOOLS.includes("create_task"), "write tools stay forbidden");

  const created = await createInternalSop(
    {
      title: "2G2 Verify Draft",
      sopCode: "2G2-DRAFT",
      description: "Draft SOP for status filtering.",
      body: "Draft body must not reach the Co-Founder.",
      audiences: ["ops"],
    },
    "manager@verify.local",
  );
  assert(created.ok, "create SOP");
  ids.docs.push(created.row.id);
  assert(created.row.status === "DRAFT" && created.row.scope === "INTERNAL" && created.row.version === 1, "new SOP is DRAFT INTERNAL v1");
  const createAudit = await prisma.auditLog.findFirst({ where: { action: "knowledge.create", entityId: created.row.id } });
  assert(createAudit, "create audited");

  const updated = await updateInternalSop(
    created.row.id,
    {
      title: "2G2 Verify Draft Edited",
      sopCode: "2G2-DRAFT",
      description: "Edited description.",
      body: "Edited body for version history.",
      audiences: ["ops", "cs"],
    },
    "manager@verify.local",
  );
  assert(updated.ok && updated.row.version === 2, "edit increments version");
  const revision = await prisma.knowledgeDocumentRevision.findFirst({ where: { documentId: created.row.id, version: 1 } });
  assert(revision?.body.includes("Draft body"), "previous version retained");
  const updateAudit = await prisma.auditLog.findFirst({ where: { action: "knowledge.update", entityId: created.row.id } });
  assert(updateAudit?.meta.includes("previousVersion"), "edit audited with version trail");

  const manager = session("manager");
  const content = session("content_manager");
  const tech = session("technician", "no-staff");
  const sales = session("sales");
  const cs = session("customer_service");

  const draftGet = await executeCofounderTool(manager, "get_sop", { sopCode: "2G2-DRAFT" });
  assert(!draftGet.ok && draftGet.error === "SOP not available.", "draft SOP denied to Co-Founder");

  const activated = await setInternalSopStatus(created.row.id, "ACTIVE", "manager@verify.local");
  assert(activated.ok && activated.row.status === "ACTIVE", "activate");
  const activateAudit = await prisma.auditLog.findFirst({ where: { action: "knowledge.activate", entityId: created.row.id } });
  assert(activateAudit, "activate audited");

  const activeGet = await executeCofounderTool(manager, "get_sop", { sopCode: "2G2-DRAFT" });
  assert(activeGet.ok, "ACTIVE SOP returned");
  const activeData = activeGet.data as { title: string; sopCode: string; source: { type: string } };
  assert(activeData.sopCode === "2G2-DRAFT" && activeData.source.type === "sop", "source metadata present");

  const archived = await setInternalSopStatus(created.row.id, "ARCHIVED", "manager@verify.local");
  assert(archived.ok, "archive");
  const archiveAudit = await prisma.auditLog.findFirst({ where: { action: "knowledge.archive", entityId: created.row.id } });
  assert(archiveAudit, "archive audited");
  const archivedGet = await executeCofounderTool(manager, "get_sop", { sopCode: "2G2-DRAFT" });
  assert(!archivedGet.ok && archivedGet.error === "SOP not available.", "archived SOP denied");

  await setInternalSopStatus(created.row.id, "DRAFT", "manager@verify.local");
  const deactivateAudit = await prisma.auditLog.findFirst({ where: { action: "knowledge.deactivate", entityId: created.row.id } });
  assert(deactivateAudit, "deactivate audited");

  const complaint = await executeCofounderTool(cs, "get_sop", { sopCode: "SOP-CS-001" });
  assert(complaint.ok, "CS can read complaint SOP");
  const hot = await executeCofounderTool(sales, "get_sop", { sopCode: "SOP-SALES-001" });
  assert(hot.ok, "sales can read HOT lead SOP");
  const post = await executeCofounderTool(session("supervisor"), "get_sop", { sopCode: "SOP-OPS-001" });
  assert(post.ok, "supervisor can read ops SOP");
  const bookingSop = await executeCofounderTool(cs, "search_internal_sop", { q: "confirmed appointment" });
  assert(bookingSop.ok, "search works");
  const searchData = bookingSop.data as { results: Array<{ sopCode: string; excerpt: string }> };
  assert(searchData.results.some((row) => row.sopCode === "SOP-OPS-002"), "search finds booking SOP");
  assert(searchData.results.every((row) => row.excerpt.length <= 500), "search returns excerpts not full libraries");

  const mgmt = await createInternalSop(
    {
      title: "2G2 Management Only",
      sopCode: "2G2-MGMT",
      description: "Management SOP",
      body: "Pricing strategy and confidential management guidance.",
      audiences: ["management"],
    },
    "manager@verify.local",
  );
  assert(mgmt.ok, "management SOP created");
  ids.docs.push(mgmt.row.id);
  await setInternalSopStatus(mgmt.row.id, "ACTIVE", "manager@verify.local");
  const techMgmt = await executeCofounderTool(tech, "get_sop", { sopCode: "2G2-MGMT" });
  assert(!techMgmt.ok, "technician denied management SOP");
  const salesMgmt = await executeCofounderTool(sales, "get_sop", { sopCode: "2G2-MGMT" });
  assert(!salesMgmt.ok, "sales denied management-only SOP");
  const managerMgmt = await executeCofounderTool(manager, "get_sop", { sopCode: "2G2-MGMT" });
  assert(managerMgmt.ok, "manager can read management SOP");

  const category = await prisma.serviceCategory.create({
    data: { slug: "2g2-verify-plumb", sortOrder: 96, translations: { create: [{ locale: "en", name: "2G2 Plumb" }] } },
  });
  ids.categories.push(category.id);
  const service = await prisma.service.create({
    data: {
      categoryId: category.id,
      slug: "2g2-verify-plumb-svc",
      serviceType: "maintenance",
      status: "active",
      sopCode: "2G2-PLUMB-SOP",
      translations: {
        create: [
          {
            locale: "en",
            name: "2G2 Plumb",
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
  const plumbSop = await createInternalSop(
    {
      title: "2G2 Plumbing Ops",
      sopCode: "2G2-PLUMB-SOP",
      description: "Plumbing operational SOP",
      body: "Plumbing operational steps for assigned technicians.",
      audiences: ["ops"],
      categorySlug: "2g2-verify-plumb",
      serviceSlug: "2g2-verify-plumb-svc",
    },
    "manager@verify.local",
  );
  assert(plumbSop.ok, "category SOP created");
  ids.docs.push(plumbSop.row.id);
  await setInternalSopStatus(plumbSop.row.id, "ACTIVE", "manager@verify.local");
  const plumber = await prisma.staff.create({
    data: {
      staffCode: "2G2-PLUMB",
      role: "technician",
      status: "active",
      skills: { create: { categorySlug: "2g2-verify-plumb" } },
    },
  });
  const electrician = await prisma.staff.create({
    data: { staffCode: "2G2-ELEC", role: "technician", status: "active", skills: { create: { categorySlug: "electrical" } } },
  });
  ids.staff.push(plumber.id, electrician.id);
  const plumberSess = session("technician", plumber.id);
  const elecSess = session("technician", electrician.id);
  const plumberGet = await executeCofounderTool(plumberSess, "get_sop", { sopCode: "2G2-PLUMB-SOP" });
  assert(plumberGet.ok, "technician with matching StaffSkill can read ops SOP");
  const elecGet = await executeCofounderTool(elecSess, "get_sop", { sopCode: "2G2-PLUMB-SOP" });
  assert(!elecGet.ok, "technician without matching skill/category denied");
  const wo = await prisma.workOrder.create({
    data: {
      number: "ALN-WO-2G2-001",
      serviceId: service.id,
      technicianId: electrician.id,
      status: "assigned",
      serviceLabel: "2G2 Plumb",
      locationLabel: "Verify",
    },
  });
  ids.workOrders.push(wo.id);
  const elecAssigned = await executeCofounderTool(elecSess, "get_sop", { sopCode: "2G2-PLUMB-SOP" });
  assert(elecAssigned.ok, "technician with assigned matching work order can read ops SOP");

  const contentDenied = await executeCofounderTool(content, "get_sop", { sopCode: "SOP-CS-001" });
  assert(contentDenied.denied, "content_manager denied get_sop");
  const contentSearch = await executeCofounderTool(content, "search_internal_sop", { q: "complaint" });
  assert(contentSearch.denied, "content_manager denied search_internal_sop");

  const privateDoc = await prisma.knowledgeDocument.create({
    data: {
      scope: "PRIVATE",
      status: "ACTIVE",
      title: "Passport copies and private uploads",
      body: "passport Emirates ID password",
      sopCode: "2G2-PRIVATE",
      audienceJson: JSON.stringify(["management"]),
    },
  });
  ids.docs.push(privateDoc.id);
  const privateGet = await executeCofounderTool(manager, "get_sop", { sopCode: "2G2-PRIVATE" });
  assert(!privateGet.ok && privateGet.error === "SOP not available.", "PRIVATE document never returned");
  const privateSearch = await executeCofounderTool(manager, "search_internal_sop", { q: "passport" });
  const privateHits = (privateSearch.data as { results: Array<{ sopCode: string }> }).results;
  assert(!privateHits.some((row) => row.sopCode === "2G2-PRIVATE"), "search does not return PRIVATE docs");
  const forbiddenPrivate = await executeCofounderTool(manager, "search_private_knowledge", { q: "passport" });
  assert(forbiddenPrivate.denied, "search_private_knowledge remains forbidden");

  const accessAudit = await prisma.auditLog.findFirst({
    where: { action: "knowledge.access", entityId: plumbSop.row.id },
  });
  assert(accessAudit, "Co-Founder SOP access audited");
  assert(!accessAudit.meta.includes("Plumbing operational steps"), "audit does not store SOP body");
  const searchAudit = await prisma.auditLog.findFirst({ where: { action: "knowledge.search", actor: "customer_service@verify.local" } });
  assert(searchAudit, "SOP search audited");

  const serviceLookup = await getSopForSession(actor("manager"), { serviceSlug: "2g2-verify-plumb-svc" });
  assert(serviceLookup.ok && serviceLookup.data.sopCode === "2G2-PLUMB-SOP", "Service.sopCode lookup");

  const missing = await searchInternalSopsForSession(actor("manager"), { q: "nonexistent-sop-xyz" });
  assert(missing.data.note === "SOP not available.", "empty search says SOP not available");

  if (complaint.ok) assert(!containsBlockedPrivacy(complaint.data), "SOP payload has no blocked privacy keys");

  const sitemapSrc = readFileSync(join(process.cwd(), "src/app/sitemap.ts"), "utf8");
  assert(!sitemapSrc.includes("knowledge"), "sitemap has no internal SOP routes");
  const robotsSrc = readFileSync(join(process.cwd(), "src/app/robots.ts"), "utf8");
  assert(robotsSrc.includes("/admin"), "robots still disallows admin");
  const publicCtx = readFileSync(join(process.cwd(), "src/lib/ai/context.ts"), "utf8");
  assert(publicCtx.includes("diyGuide") && publicCtx.includes("getPublicQaForAi"), "public AI context unchanged");
  assert(!publicCtx.includes("knowledgeDocument"), "public AI does not load KnowledgeDocument");
  const publicSrc = readFileSync(join(process.cwd(), "src/lib/ai/orchestrator.ts"), "utf8");
  assert(publicSrc.includes("runAlnajahAi"), "public AI orchestrator intact");
  assert(!publicSrc.includes("get_sop"), "public AI has no internal SOP tools");
  const openaiSrc = readFileSync(join(process.cwd(), "src/lib/ai/openai.ts"), "utf8");
  assert(openaiSrc.includes("You are ALNAJAH AI for Al Najah Al Daem"), "public system prompt unchanged");
  const publicRoute = readFileSync(join(process.cwd(), "src/app/api/ai/chat/route.ts"), "utf8");
  assert(publicRoute.includes("runAlnajahAi") && !publicRoute.includes("runCofounder"), "public chat route unchanged");

  const writeBefore = {
    tasks: await prisma.opsTask.count(),
    quotes: await prisma.quote.count(),
    invoices: await prisma.invoice.count(),
    bookings: await prisma.booking.count(),
  };
  for (const name of FORBIDDEN_COFOUNDER_TOOLS) {
    const result = await executeCofounderTool(manager, name, { q: "x" });
    assert(result.denied, `${name} denied`);
  }
  assert((await prisma.opsTask.count()) === writeBefore.tasks, "no task writes");
  assert((await prisma.quote.count()) === writeBefore.quotes, "no quote writes");
  assert((await prisma.invoice.count()) === writeBefore.invoices, "no invoice writes");
  assert((await prisma.booking.count()) === writeBefore.bookings, "no booking writes");

  console.log("Phase 2G.2 verification passed.");
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
