import { PrismaClient } from "@prisma/client";
import { createLead } from "../src/lib/leads";
import { createPublicBooking } from "../src/lib/bookings";
import { overrideLeadQuality } from "../src/lib/quality/override";
import { scoreLead } from "../src/lib/quality/run";
import { buildReasons, classify, scoreFromReasons } from "../src/lib/quality/score";
import { canManageLeadSpam, canOverrideLeadQuality } from "../src/lib/admin/rbac";

const prisma = new PrismaClient();
const ids: { leads: string[]; bookings: string[]; visitors: string[] } = {
  leads: [],
  bookings: [],
  visitors: [],
};

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function cleanup() {
  if (ids.bookings.length) await prisma.booking.deleteMany({ where: { id: { in: ids.bookings } } });
  if (ids.leads.length) {
    await prisma.leadScoreHistory.deleteMany({ where: { leadId: { in: ids.leads } } });
    await prisma.leadScore.deleteMany({ where: { leadId: { in: ids.leads } } });
    await prisma.lead.deleteMany({ where: { id: { in: ids.leads } } });
  }
  if (ids.visitors.length) {
    await prisma.analyticsEvent.deleteMany({ where: { visitorId: { in: ids.visitors } } });
    await prisma.visitSession.deleteMany({ where: { visitorId: { in: ids.visitors } } });
    await prisma.visitor.deleteMany({ where: { id: { in: ids.visitors } } });
  }
}

async function main() {
  const incompleteReasons = buildReasons({
    phone: "+971501234567",
    email: null,
    requirement: "Need help",
    source: "contact",
    photos: "[]",
    hasBooking: false,
    eventNames: [],
    duplicateRequirementCount: 0,
    burstCount: 1,
  });
  assert(classify(scoreFromReasons(incompleteReasons), incompleteReasons) === "NORMAL", "incomplete is NORMAL");
  assert(!incompleteReasons.some((r) => r.code === "valid_email"), "missing email is not a reason");
  assert(!incompleteReasons.some((r) => r.spam), "incomplete is not spam");

  const unusual = buildReasons({
    phone: "+971501234567",
    requirement: "Kitchen tap drips in the morning.",
    source: "quote",
    photos: "[]",
    hasBooking: false,
    eventNames: [],
    duplicateRequirementCount: 0,
    burstCount: 1,
  });
  assert(classify(scoreFromReasons(unusual), unusual) !== "SPAM", "unusual first-touch is not SPAM");

  const reviewReasons = buildReasons({
    phone: "11111111",
    requirement: "Kitchen tap drips in the morning.",
    source: "contact",
    photos: "[]",
    hasBooking: false,
    eventNames: [],
    duplicateRequirementCount: 0,
    burstCount: 1,
  });
  assert(classify(scoreFromReasons(reviewReasons), reviewReasons) === "REVIEW", "one spam signal is REVIEW");

  const spamReasons = buildReasons({
    phone: "11111111",
    requirement: "Buy bitcoin now http://spam.example http://spam2.example",
    source: "contact",
    photos: "[]",
    hasBooking: false,
    eventNames: [],
    duplicateRequirementCount: 2,
    burstCount: 1,
  });
  assert(spamReasons.filter((r) => r.spam).length >= 3, "three independent spam signals");
  assert(classify(scoreFromReasons(spamReasons), spamReasons) === "SPAM", "three signals is SPAM");

  assert(canOverrideLeadQuality("sales"), "sales may override");
  assert(canOverrideLeadQuality("customer_service"), "cs may override");
  assert(!canManageLeadSpam("sales"), "sales cannot set SPAM");
  assert(canManageLeadSpam("manager"), "manager can set SPAM");
  assert(canManageLeadSpam("admin"), "admin can set SPAM");
  assert(canManageLeadSpam("super_admin"), "super_admin can set SPAM");

  const incomplete = await prisma.lead.create({
    data: {
      source: "contact",
      name: "2F2 Incomplete",
      phone: "+971501234567",
      requirement: "Need help",
      status: "NEW",
      locale: "en",
    },
  });
  ids.leads.push(incomplete.id);
  const incompleteScore = await scoreLead(incomplete.id);
  assert(incompleteScore?.effectiveClass === "NORMAL", "stored incomplete is NORMAL");
  assert(incompleteScore && incompleteScore.score >= 40 && incompleteScore.score < 60, "incomplete in NORMAL band");

  const opted = await prisma.visitor.create({ data: { optedOut: true, locale: "en" } });
  ids.visitors.push(opted.id);
  const session = await prisma.visitSession.create({ data: { visitorId: opted.id } });
  await prisma.analyticsEvent.create({
    data: {
      visitorId: opted.id,
      sessionId: session.id,
      name: "SERVICE_VIEW",
      path: "/en/cleaning-services",
      meta: "{}",
      source: "client",
    },
  });
  const optLead = await prisma.lead.create({
    data: {
      source: "quote",
      name: "2F2 OptOut",
      phone: "+971501111111",
      requirement: "Please quote for villa kitchen cleaning this week.",
      status: "QUOTATION",
      locale: "en",
      visitorId: opted.id,
    },
  });
  ids.leads.push(optLead.id);
  const optScore = await scoreLead(optLead.id);
  assert(optScore?.reasons.every((r) => r.code !== "repeat_engagement"), "opt-out events are not scoring signals");
  assert(optScore?.effectiveClass !== "SPAM", "opt-out is not SPAM");

  const dupText = "Buy bitcoin now http://spam.example http://spam2.example extra words here";
  for (let i = 0; i < 2; i += 1) {
    const extra = await prisma.lead.create({
      data: {
        source: "contact",
        name: `2F2 Dup ${i}`,
        phone: `+97150999000${i}`,
        requirement: dupText,
        status: "NEW",
        locale: "en",
      },
    });
    ids.leads.push(extra.id);
  }
  const spamLead = await prisma.lead.create({
    data: {
      source: "contact",
      name: "2F2 Spam",
      phone: "11111111",
      requirement: dupText,
      status: "NEW",
      locale: "en",
    },
  });
  ids.leads.push(spamLead.id);
  const spamScore = await scoreLead(spamLead.id);
  assert(spamScore?.systemClass === "SPAM", "system class SPAM");
  assert(spamScore?.effectiveClass === "SPAM", "effective SPAM");
  assert(spamScore?.quarantined, "quarantined");
  const stillThere = await prisma.lead.findUnique({ where: { id: spamLead.id } });
  assert(stillThere, "SPAM lead is not deleted");

  const reviewLead = await prisma.lead.create({
    data: {
      source: "contact",
      name: "2F2 Review",
      phone: "22222222",
      requirement: "Please send someone for a dripping kitchen tap tomorrow morning.",
      status: "NEW",
      locale: "en",
    },
  });
  ids.leads.push(reviewLead.id);
  const reviewScore = await scoreLead(reviewLead.id);
  assert(reviewScore?.effectiveClass === "REVIEW", "invalid phone alone is REVIEW");

  const quote = await createLead(
    {
      name: "2F2 Quote",
      phone: "+971502222222",
      email: "quote@example.com",
      serviceSlug: "cleaning-services",
      locationSlug: "sharjah",
      city: "Sharjah",
      area: "Al Majaz",
      propertyType: "villa",
      requirement: "Need a full villa kitchen and bathroom clean this week please.",
      locale: "en",
      source: "quote",
    },
    "127.0.0.1-2f2",
  );
  assert(quote.ok && "id" in quote, "public quote still works");
  if (quote.ok && "id" in quote && quote.id) ids.leads.push(quote.id);
  const quoted = quote.ok && "id" in quote && quote.id ? await prisma.leadScore.findUnique({ where: { leadId: quote.id } }) : null;
  assert(quoted, "quote lead was scored");
  const beforeBooking = quoted?.score || 0;

  const booking = await createPublicBooking(
    {
      type: "standard",
      name: "2F2 Quote",
      phone: "+971502222222",
      email: "quote@example.com",
      serviceSlug: "cleaning-services",
      locationSlug: "sharjah",
      city: "Sharjah",
      area: "Al Majaz",
      propertyType: "villa",
      requirement: "Need a full villa kitchen and bathroom clean this week please.",
      locale: "en",
      source: "booking",
      leadId: quote.ok && "id" in quote ? quote.id : undefined,
    },
    "127.0.0.1-2f2-b",
  );
  assert(booking.ok && "id" in booking, "public booking still works");
  if (booking.ok && "id" in booking && booking.id) ids.bookings.push(booking.id);
  const after = quote.ok && "id" in quote && quote.id ? await prisma.leadScore.findUnique({ where: { leadId: quote.id } }) : null;
  assert(after && after.score >= beforeBooking, "booking recompute does not drop score");
  const hist = quote.ok && "id" in quote && quote.id
    ? await prisma.leadScoreHistory.findMany({ where: { leadId: quote.id }, orderBy: { createdAt: "asc" } })
    : [];
  assert(hist.some((h) => h.cause === "RECOMPUTE" || h.cause === "SYSTEM"), "history recorded");

  const salesSetSpam = await overrideLeadQuality({
    leadId: reviewLead.id,
    class: "SPAM",
    note: "Looks like junk to me",
    actorEmail: "sales@example.com",
    actorRole: "sales",
  });
  assert(!salesSetSpam.ok && salesSetSpam.error === "spam", "sales cannot set SPAM");

  const salesDenied = await overrideLeadQuality({
    leadId: spamLead.id,
    class: "NORMAL",
    note: "Looks like a real villa job",
    actorEmail: "sales@example.com",
    actorRole: "sales",
  });
  assert(!salesDenied.ok && salesDenied.error === "spam", "sales cannot restore SPAM");

  const managerOk = await overrideLeadQuality({
    leadId: spamLead.id,
    class: "NORMAL",
    note: "Confirmed WhatsApp from customer",
    actorEmail: "manager@example.com",
    actorRole: "manager",
  });
  assert(managerOk.ok, "manager can restore SPAM");
  const restored = await prisma.leadScore.findUnique({ where: { leadId: spamLead.id } });
  assert(restored?.humanClass === "NORMAL", "humanClass preserved");
  assert(restored?.effectiveClass === "NORMAL", "effective follows human");
  assert(restored?.systemClass === "SPAM", "systemClass preserved");
  assert(!restored?.quarantined, "quarantine cleared");

  const salesOverride = await overrideLeadQuality({
    leadId: reviewLead.id,
    class: "WARM",
    note: "Known customer from Ajman",
    actorEmail: "sales@example.com",
    actorRole: "sales",
  });
  assert(salesOverride.ok, "sales may override REVIEW to WARM");
  await scoreLead(reviewLead.id, { actor: "system", cause: "RECOMPUTE" });
  const locked = await prisma.leadScore.findUnique({ where: { leadId: reviewLead.id } });
  assert(locked?.effectiveClass === "WARM", "human override wins after recompute");
  assert(locked?.humanClass === "WARM", "human class kept");

  const missingNote = await overrideLeadQuality({
    leadId: reviewLead.id,
    class: "HOT",
    note: "x",
    actorEmail: "sales@example.com",
    actorRole: "sales",
  });
  assert(!missingNote.ok && missingNote.error === "note", "override requires a note");

  await cleanup();
  console.log("phase-2f2-verify: ok");
}

main()
  .catch(async (err) => {
    console.error(err);
    await cleanup().catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
