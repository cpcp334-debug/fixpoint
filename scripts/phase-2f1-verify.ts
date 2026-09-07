import { PrismaClient } from "@prisma/client";
import { sanitizeMeta, viewsForPath } from "../src/lib/analytics/types";
import { isOpaqueId } from "../src/lib/analytics/cookies";

const prisma = new PrismaClient();
const ids: { visitors: string[]; leads: string[]; events: string[] } = {
  visitors: [],
  leads: [],
  events: [],
};

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function cleanup() {
  if (ids.events.length) await prisma.analyticsEvent.deleteMany({ where: { id: { in: ids.events } } });
  if (ids.leads.length) await prisma.lead.deleteMany({ where: { id: { in: ids.leads } } });
  if (ids.visitors.length) {
    await prisma.visitSession.deleteMany({ where: { visitorId: { in: ids.visitors } } });
    await prisma.visitor.deleteMany({ where: { id: { in: ids.visitors } } });
  }
}

async function main() {
  const home = viewsForPath("/en");
  assert(home.length === 1 && home[0].name === "PAGE_VIEW", "home is PAGE_VIEW only");

  const service = viewsForPath("/en/cleaning-services/sharjah");
  assert(
    service.some((v) => v.name === "SERVICE_VIEW" && v.entityId === "cleaning-services"),
    "service view",
  );
  assert(service.some((v) => v.name === "LOCATION_VIEW" && v.entityId === "sharjah"), "location view");

  const diy = viewsForPath("/ar/diy/how-to-fix-dripping-faucet");
  assert(diy.some((v) => v.name === "DIY_VIEW" && v.entityId === "how-to-fix-dripping-faucet"), "diy view");

  const cookie = viewsForPath("/en/cookie-policy");
  assert(cookie.length === 1 && cookie[0].name === "PAGE_VIEW", "cookie-policy is not a service view");

  const meta = sanitizeMeta({
    riskClass: "red",
    count: 2,
    slug: "plumbing-maintenance",
    transcript: "the tap is leaking badly",
    messages: [{ role: "user", content: "help" }],
  });
  assert(meta.riskClass === "red" && meta.count === 2 && meta.slug === "plumbing-maintenance", "allowlisted meta");
  assert(!("transcript" in meta) && !("messages" in meta), "transcript must not be stored");

  const visitor = await prisma.visitor.create({ data: { locale: "en" } });
  ids.visitors.push(visitor.id);
  assert(isOpaqueId(visitor.id), `visitor id must fit cookie regex: ${visitor.id}`);

  const session = await prisma.visitSession.create({ data: { visitorId: visitor.id } });
  const event = await prisma.analyticsEvent.create({
    data: {
      visitorId: visitor.id,
      sessionId: session.id,
      name: "PAGE_VIEW",
      path: "/en",
      locale: "en",
      meta: "{}",
      source: "client",
    },
  });
  ids.events.push(event.id);

  const lead = await prisma.lead.create({
    data: {
      source: "quote",
      name: "Phase 2F.1 Verify",
      phone: "+971500000001",
      requirement: "Verify analytics cannot block a quote write.",
      status: "QUOTATION",
      locale: "en",
    },
  });
  ids.leads.push(lead.id);
  assert(!lead.visitorId, "lead writes without a visitor id");

  await prisma.lead.update({ where: { id: lead.id }, data: { visitorId: visitor.id } });
  const stamped = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
  assert(stamped.visitorId === visitor.id, "stamp after write");

  const scores = await prisma.leadScore.count();
  assert(scores === 0, "LeadScore must stay unused in 2F.1");

  await cleanup();
  console.log("phase-2f1-verify: ok");
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
