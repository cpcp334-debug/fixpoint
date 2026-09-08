import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { hashPassword } from "../src/lib/admin/crypto";
import { invoiceToPdfDoc } from "../src/lib/admin/invoices";
import { createQuote, quoteToPdfDoc } from "../src/lib/admin/quotes";
import {
  approveTaskProposal,
  canProposeAction,
  cancelTaskProposal,
  createTaskProposal,
  editTaskProposal,
  proposalActionKey,
} from "../src/lib/cofounder/proposals";
import { sanitizeProposalDraft } from "../src/lib/cofounder/finance";
import { toolAllowed, toolsForRole } from "../src/lib/cofounder/rbac";
import { executeCofounderTool } from "../src/lib/cofounder/tools";
import { FORBIDDEN_COFOUNDER_TOOLS, type CofounderSession } from "../src/lib/cofounder/types";
import { containsBlockedPrivacy } from "../src/lib/cofounder/privacy";

const ids = {
  users: [] as string[],
  leads: [] as string[],
  bookings: [] as string[],
  workOrders: [] as string[],
  quotes: [] as string[],
  invoices: [] as string[],
  customers: [] as string[],
  staff: [] as string[],
  proposals: [] as string[],
  reviews: [] as string[],
};

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function session(userId: string, role: string, staffId: string | null = null): CofounderSession {
  return { id: userId, email: `${role}@2g4.verify.local`, role, staffId, frozenRole: role };
}

async function wipe() {
  const leftoverQuotes = await prisma.quote.findMany({
    where: {
      OR: [{ id: { in: ids.quotes } }, { customerPhone: { startsWith: "+9715090387" } }, { quoteNumber: { startsWith: "ALN-Q-2G4" } }],
    },
    select: { id: true },
  });
  const leftoverInvoices = await prisma.invoice.findMany({
    where: {
      OR: [
        { id: { in: ids.invoices } },
        { customerPhone: { startsWith: "+9715090387" } },
        { quoteId: { in: leftoverQuotes.map((row) => row.id) } },
      ],
    },
    select: { id: true },
  });
  if (leftoverInvoices.length) {
    await prisma.payment.deleteMany({ where: { invoiceId: { in: leftoverInvoices.map((row) => row.id) } } });
    await prisma.invoice.deleteMany({ where: { id: { in: leftoverInvoices.map((row) => row.id) } } });
  }
  if (leftoverQuotes.length) await prisma.quote.deleteMany({ where: { id: { in: leftoverQuotes.map((row) => row.id) } } });
  await prisma.staffAiProposal.deleteMany({
    where: { OR: [{ actorEmail: { contains: "2g4.verify" } }, { id: { in: ids.proposals } }] },
  });
  await prisma.staffAiConversation.deleteMany({ where: { user: { email: { startsWith: "2g4-" } } } });
  if (ids.leads.length) {
    await prisma.opsTask.deleteMany({ where: { subjectId: { in: ids.leads } } });
    await prisma.leadScoreHistory.deleteMany({ where: { leadId: { in: ids.leads } } });
    await prisma.leadScore.deleteMany({ where: { leadId: { in: ids.leads } } });
    await prisma.lead.deleteMany({ where: { id: { in: ids.leads } } });
  }
  await prisma.lead.deleteMany({ where: { phone: { startsWith: "+9715090387" } } });
  if (ids.reviews.length) await prisma.review.deleteMany({ where: { id: { in: ids.reviews } } });
  if (ids.workOrders.length) await prisma.workOrder.deleteMany({ where: { id: { in: ids.workOrders } } });
  await prisma.workOrder.deleteMany({ where: { number: { startsWith: "ALN-WO-2G4" } } });
  if (ids.bookings.length) await prisma.booking.deleteMany({ where: { id: { in: ids.bookings } } });
  await prisma.booking.deleteMany({ where: { number: { startsWith: "ALN-2G4" } } });
  if (ids.customers.length) await prisma.customer.deleteMany({ where: { id: { in: ids.customers } } });
  await prisma.staff.deleteMany({ where: { staffCode: { in: ["2G4-SALES"] } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: "2g4-" } } });
}

function emptyMoney(row: {
  materials?: string;
  labor?: string;
  taxesNote?: string;
  subtotalLabel: string;
  discountLabel: string;
  taxLabel: string;
  totalLabel: string;
  items: Array<{ unitPrice: string; lineTotal: string }>;
}) {
  assert(!row.subtotalLabel && !row.discountLabel && !row.taxLabel && !row.totalLabel, "money labels empty");
  if ("materials" in row) assert(!row.materials && !row.labor && !row.taxesNote, "quote cost fields empty");
  assert(row.items.every((item) => !item.unitPrice && !item.lineTotal), "line amounts empty");
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

async function main() {
  await wipe();

  const financeSrc = readFileSync(join(process.cwd(), "src/lib/cofounder/finance.ts"), "utf8");
  assert(!/\bNumber\(/.test(financeSrc) && !financeSrc.includes("parseFloat") && !financeSrc.includes("parseInt"), "no numeric price parsing");
  assert(financeSrc.includes('status: "DRAFT"'), "finance helpers force DRAFT");
  assert(!financeSrc.includes("SENT") && !financeSrc.includes("ISSUED") && !financeSrc.includes("PAID"), "finance helpers never send/issue/pay");
  assert(FORBIDDEN_COFOUNDER_TOOLS.includes("draft_quote") && FORBIDDEN_COFOUNDER_TOOLS.includes("draft_invoice"), "direct draft tools stay forbidden");
  assert(toolsForRole("sales").includes("propose_draft_quote"), "sales quote capability");
  assert(!toolsForRole("sales").includes("propose_draft_invoice"), "sales cannot propose invoices");
  assert(toolsForRole("manager").includes("propose_draft_quote") && toolsForRole("manager").includes("propose_draft_invoice"), "manager quote+invoice");
  assert(toolsForRole("super_admin").includes("propose_draft_invoice"), "super admin invoice");
  assert(!toolsForRole("technician").includes("propose_draft_quote") && !toolsForRole("technician").includes("propose_draft_invoice"), "technician none");
  assert(!toolsForRole("content_manager").includes("propose_draft_quote"), "content none");
  assert(!toolsForRole("customer_service").includes("propose_draft_quote") && !toolsForRole("customer_service").includes("propose_draft_invoice"), "CS follows finance perms");
  assert(!toolAllowed("sales", "draft_quote") && !toolAllowed("manager", "draft_invoice"), "direct create remains forbidden");
  assert(canProposeAction("sales", { actionType: "CREATE_DRAFT_QUOTE", subjectType: "Lead" }), "sales may propose quotes");
  assert(!canProposeAction("sales", { actionType: "CREATE_DRAFT_INVOICE", subjectType: "Quote" }), "sales invoice RBAC deny");
  assert(!canProposeAction("technician", { actionType: "CREATE_DRAFT_QUOTE", subjectType: "Lead" }), "tech quote deny");
  assert(!canProposeAction("content_manager", { actionType: "CREATE_DRAFT_QUOTE", subjectType: "Lead" }), "content quote deny");
  assert(!canProposeAction("customer_service", { actionType: "CREATE_DRAFT_QUOTE", subjectType: "Lead" }), "CS quote deny");
  const invented = sanitizeProposalDraft({
    scope: "Clean AC",
    subtotalLabel: "9999",
    totalLabel: "AED 500",
    lines: [{ description: "Visit", quantity: "2", unit: "job", unitPrice: "400", lineTotal: "800", tax: "50" }],
  });
  assert(!("subtotalLabel" in invented) && !("totalLabel" in invented), "draft money fields stripped");
  assert(invented.lines?.[0]?.description === "Visit" && !("unitPrice" in (invented.lines?.[0] || {})), "line prices stripped");

  const passwordHash = hashPassword("verify-password-12");
  const managerUser = await prisma.user.create({
    data: { email: "2g4-manager@verify.local", name: "2G4 Manager", passwordHash, role: "manager", active: true },
  });
  const salesUser = await prisma.user.create({
    data: { email: "2g4-sales@verify.local", name: "2G4 Sales", passwordHash, role: "sales", active: true },
  });
  const contentUser = await prisma.user.create({
    data: { email: "2g4-content@verify.local", name: "2G4 Content", passwordHash, role: "content_manager", active: true },
  });
  const techUser = await prisma.user.create({
    data: { email: "2g4-tech@verify.local", name: "2G4 Tech", passwordHash, role: "technician", active: true },
  });
  const csUser = await prisma.user.create({
    data: { email: "2g4-cs@verify.local", name: "2G4 CS", passwordHash, role: "customer_service", active: true },
  });
  ids.users.push(managerUser.id, salesUser.id, contentUser.id, techUser.id, csUser.id);
  const salesStaff = await prisma.staff.create({ data: { staffCode: "2G4-SALES", role: "sales", status: "active" } });
  ids.staff.push(salesStaff.id);

  const manager = session(managerUser.id, "manager");
  const sales = session(salesUser.id, "sales", salesStaff.id);
  const content = session(contentUser.id, "content_manager");
  const tech = session(techUser.id, "technician");
  const cs = session(csUser.id, "customer_service");

  const lead = await prisma.lead.create({
    data: {
      source: "contact",
      name: "2G4 Quote Lead",
      phone: "+971509038701",
      requirement: "Annual AC maintenance, two indoor units.",
      city: "Dubai",
      area: "Jumeirah",
      status: "NEW",
    },
  });
  const cancelLead = await prisma.lead.create({
    data: { source: "contact", name: "2G4 Cancel Lead", phone: "+971509038705", requirement: "Cancel path.", status: "NEW" },
  });
  const editLead = await prisma.lead.create({
    data: { source: "contact", name: "2G4 Edit Lead", phone: "+971509038706", requirement: "Edit path.", status: "NEW" },
  });
  ids.leads.push(lead.id, cancelLead.id, editLead.id);

  const customer = await prisma.customer.create({
    data: { name: "2G4 Customer", phone: "+971509038703", email: "2g4-customer@verify.local" },
  });
  ids.customers.push(customer.id);

  const accepted = await prisma.quote.create({
    data: {
      quoteNumber: "ALN-Q-2G4-SRC",
      status: "ACCEPTED",
      customerId: customer.id,
      customerName: "2G4 Customer",
      customerPhone: "+971509038703",
      locationLabel: "Dubai Marina",
      serviceLabel: "Plumbing",
      scope: "Accepted scope copied as labels only.",
      subtotalLabel: "AED 1,250.00",
      discountLabel: "AED 0",
      taxLabel: "VAT as applicable",
      totalLabel: "AED 1,250.00",
      humanApproved: true,
      items: {
        create: [
          {
            description: "Labour visit",
            quantity: "1",
            unit: "visit",
            unitPrice: "AED 400",
            lineTotal: "AED 400",
            sortOrder: 0,
          },
        ],
      },
    },
    include: { items: true },
  });
  ids.quotes.push(accepted.id);

  const draftQuote = await prisma.quote.create({
    data: {
      quoteNumber: "ALN-Q-2G4-DRAFT",
      status: "DRAFT",
      customerName: "2G4 Draft Quote",
      customerPhone: "+971509038708",
      locationLabel: "Sharjah",
      serviceLabel: "Electrical",
      scope: "Must not invoice.",
      subtotalLabel: "AED 90",
      totalLabel: "AED 90",
    },
  });
  ids.quotes.push(draftQuote.id);

  const booking = await prisma.booking.create({
    data: {
      number: "ALN-2G4-BOOK",
      name: "2G4 Booking",
      phone: "+971509038702",
      customerId: customer.id,
      requirement: "Must stay requested.",
      status: "requested",
    },
  });
  ids.bookings.push(booking.id);

  const completedWo = await prisma.workOrder.create({
    data: {
      number: "ALN-WO-2G4-DONE",
      customerId: customer.id,
      bookingId: booking.id,
      locationLabel: "Dubai Marina",
      serviceLabel: "Plumbing",
      status: "completed",
    },
  });
  const openWo = await prisma.workOrder.create({
    data: { number: "ALN-WO-2G4-OPEN", customerId: customer.id, status: "created" },
  });
  ids.workOrders.push(completedWo.id, openWo.id);

  const review = await prisma.review.create({
    data: { type: "service", status: "PENDING", stars: 5, authorName: "2G4 Reviewer", body: "Keep pending." },
  });
  ids.reviews.push(review.id);

  const paymentsBefore = await prisma.payment.count();
  const bookingsRequested = await prisma.booking.count({ where: { id: booking.id, status: "requested" } });
  const rulesBefore = await prisma.automationRule.count();
  const pricingBefore = await prisma.pricingRule.count();
  const reviewsPending = await prisma.review.count({ where: { id: review.id, status: "PENDING" } });

  const salesInvoiceTool = await executeCofounderTool(sales, "propose_draft_invoice", { subjectType: "Quote", subjectId: accepted.id });
  assert(salesInvoiceTool.denied, "sales invoice tool denied");
  const techQuoteTool = await executeCofounderTool(tech, "propose_draft_quote", { subjectType: "Lead", subjectId: lead.id });
  assert(techQuoteTool.denied, "technician quote tool denied");
  const contentQuote = await createTaskProposal(content, {
    items: [{ actionType: "CREATE_DRAFT_QUOTE", subjectType: "Lead", subjectId: lead.id }],
  });
  assert(!contentQuote.ok && "denied" in contentQuote && contentQuote.denied, "content cannot create quote proposals");
  const csQuote = await createTaskProposal(cs, {
    items: [{ actionType: "CREATE_DRAFT_QUOTE", subjectType: "Lead", subjectId: lead.id }],
  });
  assert(!csQuote.ok && "denied" in csQuote && csQuote.denied, "CS cannot create quote proposals");
  const openWoInvoice = await createTaskProposal(manager, {
    items: [{ actionType: "CREATE_DRAFT_INVOICE", subjectType: "WorkOrder", subjectId: openWo.id }],
  });
  assert(!openWoInvoice.ok && "denied" in openWoInvoice && openWoInvoice.denied, "incomplete work order cannot invoice");
  const draftInvoice = await createTaskProposal(manager, {
    items: [{ actionType: "CREATE_DRAFT_INVOICE", subjectType: "Quote", subjectId: draftQuote.id }],
  });
  assert(!draftInvoice.ok && "denied" in draftInvoice && draftInvoice.denied, "non-accepted quote cannot invoice");

  const quotePropose = await executeCofounderTool(sales, "propose_draft_quote", {
    subjectType: "Lead",
    subjectId: lead.id,
    title: "Draft AC quotation",
    reason: "Customer asked for a quotation.",
    scope: "Service two indoor AC units.",
    exclusions: "Spare parts not included.",
    notes: "Site access in the morning.",
    propertyLabel: "Villa 12",
    lines: JSON.stringify([
      { description: "AC service visit", quantity: "2", unit: "unit", unitPrice: "350", lineTotal: "700" },
    ]),
  });
  assert(quotePropose.ok && quotePropose.data && typeof quotePropose.data === "object", "quote proposal tool");
  const quoteProposal = (quotePropose.data as { proposal: { id: string; status: string; items: Array<{ draft?: { lines?: Array<Record<string, string>>; scope?: string } }> } }).proposal;
  ids.proposals.push(quoteProposal.id);
  assert(quoteProposal.status === "PENDING", "quote proposal pending");
  assert(quoteProposal.items[0]?.draft?.scope === "Service two indoor AC units.", "scope stored");
  assert(quoteProposal.items[0]?.draft?.lines?.[0]?.description === "AC service visit", "line description stored");
  assert(!quoteProposal.items[0]?.draft?.lines?.[0]?.unitPrice, "invented unitPrice dropped");
  const createAudit = await prisma.auditLog.findFirst({ where: { action: "cofounder.proposal.create", entityId: quoteProposal.id } });
  assert(createAudit, "proposal.create audited");
  assert(!containsBlockedPrivacy(createAudit.meta) && !createAudit.meta.includes("+971") && !createAudit.meta.includes("transcript"), "audit has no sensitive payload");

  const quotesBeforeApprove = await prisma.quote.count();
  const cancelled = await createTaskProposal(sales, {
    items: [{ actionType: "CREATE_DRAFT_QUOTE", subjectType: "Lead", subjectId: cancelLead.id, title: "Cancel me" }],
  });
  assert(cancelled.ok && "proposal" in cancelled && cancelled.proposal, "cancel proposal created");
  ids.proposals.push(cancelled.proposal.id);
  const cancelResult = await cancelTaskProposal(sales, cancelled.proposal.id);
  assert(cancelResult.ok && cancelResult.proposal.status === "CANCELLED", "cancel proposal");
  assert((await prisma.quote.count()) === quotesBeforeApprove, "cancel does not create a quote");
  const cancelAudit = await prisma.auditLog.findFirst({ where: { action: "cofounder.proposal.cancel", entityId: cancelled.proposal.id } });
  assert(cancelAudit, "proposal.cancel audited");

  const edited = await createTaskProposal(sales, {
    items: [
      {
        actionType: "CREATE_DRAFT_QUOTE",
        subjectType: "Lead",
        subjectId: editLead.id,
        title: "Before edit",
        draft: { scope: "Old scope", notes: "Old notes", exclusions: "Old exclusions" },
      },
    ],
  });
  assert(edited.ok && "proposal" in edited && edited.proposal, "edit proposal created");
  ids.proposals.push(edited.proposal.id);
  const editResult = await editTaskProposal(sales, edited.proposal.id, {
    title: "After edit",
    scope: "Edited scope for villa AC.",
    notes: "Edited notes.",
    exclusions: "Edited exclusions.",
  });
  assert(editResult.ok && editResult.proposal.title === "After edit", "edit title");
  assert(editResult.proposal.items[0]?.draft?.scope === "Edited scope for villa AC.", "edit scope");
  const editAudit = await prisma.auditLog.findFirst({ where: { action: "cofounder.proposal.edit", entityId: edited.proposal.id } });
  assert(editAudit, "proposal.edit audited");
  const editApproved = await approveTaskProposal(sales, edited.proposal.id);
  assert(editApproved.ok, "approve edited quote proposal");
  const editedQuoteId = (editApproved.proposal.result as { results?: Array<{ resultRef?: string }> })?.results?.[0]?.resultRef;
  assert(editedQuoteId, "edited quote id");
  ids.quotes.push(editedQuoteId);
  const editedQuote = await prisma.quote.findUnique({ where: { id: editedQuoteId }, include: { items: true } });
  assert(editedQuote?.scope === "Edited scope for villa AC.", "approved quote uses edited scope");
  assert(editedQuote?.status === "DRAFT" && editedQuote.humanApproved === false, "edited quote is DRAFT");
  emptyMoney(editedQuote!);

  const approvedQuote = await approveTaskProposal(sales, quoteProposal.id);
  assert(approvedQuote.ok && approvedQuote.proposal.status === "APPROVED", "approve quote proposal");
  const quoteId = (approvedQuote.proposal.result as { results?: Array<{ resultRef?: string }> })?.results?.[0]?.resultRef;
  assert(quoteId, "created quote id");
  ids.quotes.push(quoteId);
  const createdQuote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { items: true } });
  assert(createdQuote, "quote row exists");
  assert(createdQuote.status === "DRAFT", "AI quote starts DRAFT");
  assert(createdQuote.humanApproved === false, "not human approved");
  assert(createdQuote.sourceKey === proposalActionKey(quoteProposal.id, 0), "idempotency sourceKey");
  assert(createdQuote.scope === "Service two indoor AC units.", "scope copied");
  assert(createdQuote.exclusions === "Spare parts not included.", "exclusions copied");
  assert(createdQuote.items[0]?.description === "AC service visit" && createdQuote.items[0]?.quantity === "2", "qty/unit kept");
  emptyMoney(createdQuote);
  const quoteCreateAudit = await prisma.auditLog.findFirst({ where: { action: "quote.create", entityId: createdQuote.id } });
  assert(quoteCreateAudit, "quote.create audited");
  const approveAudit = await prisma.auditLog.findFirst({ where: { action: "cofounder.proposal.approve", entityId: quoteProposal.id } });
  assert(approveAudit, "proposal.approve audited");
  const pdf = quoteToPdfDoc(createdQuote);
  assert(pdf.kind === "quotation" && pdf.number === createdQuote.quoteNumber, "existing quote PDF helper reused");

  const secondApprove = await approveTaskProposal(sales, quoteProposal.id);
  assert(secondApprove.ok && "duplicate" in secondApprove && secondApprove.duplicate, "duplicate approve is idempotent");
  assert((await prisma.quote.count({ where: { sourceKey: createdQuote.sourceKey } })) === 1, "one quote per sourceKey");
  const replay = await createQuote(
    {
      customerName: "Should not replace",
      customerPhone: "+971509038799",
      locationLabel: "",
      serviceLabel: "",
      scope: "",
      materials: "999",
      labor: "999",
      exclusions: "",
      taxesNote: "",
      validity: "",
      paymentTerms: "",
      estimatedDuration: "",
      warrantyTerms: "",
      notes: "",
      subtotalLabel: "999",
      discountLabel: "999",
      taxLabel: "999",
      totalLabel: "999",
      humanApproved: true,
      status: "SENT",
      items: [{ description: "x", quantity: "1", unit: "", unitPrice: "9", lineTotal: "9" }],
      sourceKey: createdQuote.sourceKey,
    },
    { id: salesUser.id, email: sales.email },
  );
  assert(replay.ok && replay.quote.id === createdQuote.id && replay.quote.status === "DRAFT", "createQuote sourceKey is idempotent and stays DRAFT");

  const invoicePropose = await executeCofounderTool(manager, "propose_draft_invoice", {
    subjectType: "Quote",
    subjectId: accepted.id,
    title: "Draft invoice from accepted quote",
    reason: "Work accepted, invoice draft needed.",
  });
  assert(invoicePropose.ok, "invoice proposal from accepted quote");
  const invoiceProposal = (invoicePropose.data as { proposal: { id: string } }).proposal;
  ids.proposals.push(invoiceProposal.id);
  const approvedInvoice = await approveTaskProposal(manager, invoiceProposal.id);
  assert(approvedInvoice.ok, "approve invoice proposal");
  const invoiceId = (approvedInvoice.proposal.result as { results?: Array<{ resultRef?: string }> })?.results?.[0]?.resultRef;
  assert(invoiceId, "created invoice id");
  ids.invoices.push(invoiceId);
  const createdInvoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { items: true } });
  assert(createdInvoice?.status === "DRAFT", "invoice starts DRAFT");
  assert(createdInvoice.subtotalLabel === "AED 1,250.00" && createdInvoice.totalLabel === "AED 1,250.00", "verified labels copied as strings");
  assert(createdInvoice.discountLabel === "AED 0" && createdInvoice.taxLabel === "VAT as applicable", "tax/discount labels copied");
  assert(createdInvoice.items[0]?.unitPrice === "AED 400" && createdInvoice.items[0]?.lineTotal === "AED 400", "item labels copied");
  assert(createdInvoice.quoteId === accepted.id, "linked to accepted quote");
  const invoiceAudit = await prisma.auditLog.findFirst({ where: { action: "invoice.create", entityId: createdInvoice.id } });
  assert(invoiceAudit, "invoice.create audited");
  const invoicePdf = invoiceToPdfDoc(createdInvoice);
  assert(invoicePdf.kind === "invoice" && invoicePdf.number === createdInvoice.number, "existing invoice PDF helper reused");
  const replayInvoice = await approveTaskProposal(manager, invoiceProposal.id);
  assert(replayInvoice.ok && "duplicate" in replayInvoice && replayInvoice.duplicate, "invoice approve idempotent");
  assert((await prisma.invoice.count({ where: { sourceKey: createdInvoice.sourceKey } })) === 1, "one invoice per sourceKey");

  const woInvoicePropose = await createTaskProposal(manager, {
    items: [{ actionType: "CREATE_DRAFT_INVOICE", subjectType: "WorkOrder", subjectId: completedWo.id, title: "WO invoice" }],
  });
  assert(woInvoicePropose.ok && "proposal" in woInvoicePropose && woInvoicePropose.proposal, "completed WO invoice proposal");
  ids.proposals.push(woInvoicePropose.proposal.id);
  const woApproved = await approveTaskProposal(manager, woInvoicePropose.proposal.id);
  assert(woApproved.ok, "approve WO invoice");
  const woInvoiceId = (woApproved.proposal.result as { results?: Array<{ resultRef?: string }> })?.results?.[0]?.resultRef;
  assert(woInvoiceId, "WO invoice id");
  ids.invoices.push(woInvoiceId);
  const woInvoice = await prisma.invoice.findUnique({ where: { id: woInvoiceId }, include: { items: true } });
  assert(woInvoice?.status === "DRAFT", "WO invoice DRAFT");
  emptyMoney(woInvoice!);

  const sentCount = await prisma.quote.count({ where: { id: { in: ids.quotes }, status: "SENT" } });
  const issuedCount = await prisma.invoice.count({ where: { id: { in: ids.invoices }, status: { in: ["ISSUED", "PAID"] } } });
  assert(sentCount === 0, "no quote sent automatically");
  assert(issuedCount === 0, "no invoice issued or paid automatically");
  assert((await prisma.booking.findUnique({ where: { id: booking.id } }))?.status === "requested", "booking not confirmed");
  assert((await prisma.booking.count({ where: { id: booking.id, status: "requested" } })) === bookingsRequested, "booking untouched");
  assert((await prisma.payment.count()) === paymentsBefore, "no payment mutation");
  assert((await prisma.review.findUnique({ where: { id: review.id } }))?.status === "PENDING", "reviews untouched");
  assert((await prisma.review.count({ where: { id: review.id, status: "PENDING" } })) === reviewsPending, "review status unchanged");
  assert((await prisma.automationRule.count()) === rulesBefore, "automation rules unchanged");
  assert((await prisma.pricingRule.count()) === pricingBefore, "pricing rules unchanged");

  for (const name of FORBIDDEN_COFOUNDER_TOOLS) {
    const result = await executeCofounderTool(manager, name, { id: booking.id });
    assert(result.denied, `${name} denied`);
  }
  assert((await prisma.booking.findUnique({ where: { id: booking.id } }))?.status === "requested", "forbidden tools did not confirm booking");

  await wipe();
  console.log("2G4 core verification passed");
  runRegression("phase-2g1-verify.ts");
  runRegression("phase-2g2-verify.ts");
  runRegression("phase-2g3-verify.ts");
  console.log("2G4 + 2G.1/2G.2/2G.3 verification passed");
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
