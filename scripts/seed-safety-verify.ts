import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import {
  DESTRUCTIVE_PRODUCTION_OVERRIDE_ENV,
  DESTRUCTIVE_PRODUCTION_OVERRIDE_VALUE,
  assertDestructiveSeedAllowed,
  destructiveSeedRefusalMessage,
  resolveSeedMode,
} from "../prisma/seed-safety";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function main() {
  const seedSrc = readFileSync(join(process.cwd(), "prisma/seed.ts"), "utf8");
  assert(seedSrc.includes("resolveSeedMode"), "seed.ts uses resolveSeedMode");
  assert(seedSrc.includes("wipeOperationalAndCatalogData"), "wipe isolated behind mode gate");
  assert(seedSrc.includes("runSafeBootstrap"), "safe bootstrap path exists");
  assert(!/if\s*\(\s*process\.env\.SEED_STAFF_ONLY\s*===\s*"1"\s*\)\s*\{[\s\S]*deleteMany/.test(seedSrc), "staff-only is not the only production gate");

  const prodDefault = resolveSeedMode({ NODE_ENV: "production" });
  assert(prodDefault.mode === "safe-bootstrap" && prodDefault.refusedDestructive, "production refuses destructive by default");
  assert(assertDestructiveSeedAllowed({ NODE_ENV: "production" }).ok === false, "assertDestructiveSeedAllowed fails in production");

  const prodStaff = resolveSeedMode({ NODE_ENV: "production", SEED_STAFF_ONLY: "1" });
  assert(prodStaff.mode === "safe-bootstrap", "SEED_STAFF_ONLY stays safe in production");

  const prodOverride = resolveSeedMode({
    NODE_ENV: "production",
    [DESTRUCTIVE_PRODUCTION_OVERRIDE_ENV]: DESTRUCTIVE_PRODUCTION_OVERRIDE_VALUE,
  });
  assert(prodOverride.mode === "destructive" && !prodOverride.refusedDestructive, "emergency override allows destructive");

  const staffOnlyBlocksOverride = resolveSeedMode({
    NODE_ENV: "production",
    SEED_STAFF_ONLY: "1",
    [DESTRUCTIVE_PRODUCTION_OVERRIDE_ENV]: DESTRUCTIVE_PRODUCTION_OVERRIDE_VALUE,
  });
  assert(staffOnlyBlocksOverride.mode === "safe-bootstrap", "SEED_STAFF_ONLY wins over emergency override");

  const dev = resolveSeedMode({ NODE_ENV: "development" });
  assert(dev.mode === "destructive" && !dev.refusedDestructive, "development allows destructive seed");
  assert(assertDestructiveSeedAllowed({ NODE_ENV: "development" }).ok === true, "dev assert ok");

  const msg = destructiveSeedRefusalMessage();
  assert(msg.includes("REFUSED"), "refusal message is clear");
  assert(msg.includes(DESTRUCTIVE_PRODUCTION_OVERRIDE_ENV), "refusal documents emergency override");
  assert(msg.includes("SEED_STAFF_ONLY"), "refusal documents SEED_STAFF_ONLY limits");

  const markerPhone = "+971509039901";
  await prisma.lead.deleteMany({ where: { phone: markerPhone } });
  const lead = await prisma.lead.create({
    data: {
      source: "contact",
      name: "Seed Safety Marker",
      phone: markerPhone,
      requirement: "Must survive production seed.",
      status: "NEW",
    },
  });
  const beforeLeads = await prisma.lead.count();
  const beforeCustomers = await prisma.customer.count();
  const beforeBookings = await prisma.booking.count();
  const beforeQuotes = await prisma.quote.count();
  const beforeInvoices = await prisma.invoice.count();
  const beforeWo = await prisma.workOrder.count();
  const beforePayments = await prisma.payment.count();
  const beforeReviews = await prisma.review.count();
  const beforeQuestions = await prisma.question.count();
  const beforeJobs = await prisma.automationJob.count();
  const beforeRules = await prisma.automationRule.count();
  const beforeAmc = await prisma.amcContract.count();
  const beforeMedia = await prisma.mediaAsset.count();
  const beforeAudit = await prisma.auditLog.count();

  const prodEnv: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "production" };
  delete prodEnv.SEED_STAFF_ONLY;
  delete prodEnv[DESTRUCTIVE_PRODUCTION_OVERRIDE_ENV];

  const result = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: true,
    env: prodEnv,
  });
  assert(result.status === 0, `production seed should exit 0 (safe bootstrap). stderr/stdout:\n${result.stdout}\n${result.stderr}`);
  const combined = `${result.stdout}\n${result.stderr}`;
  assert(combined.includes("REFUSED") || combined.includes("safe-bootstrap") || combined.includes("Production default"), "production seed logs refusal/safe mode");
  assert(!combined.includes("Seed complete: 7 active services"), "production seed must not complete destructive catalog path");

  assert((await prisma.lead.findUnique({ where: { id: lead.id } }))?.phone === markerPhone, "marker lead not deleted");
  assert((await prisma.lead.count()) === beforeLeads, "leads unchanged in production seed");
  assert((await prisma.customer.count()) === beforeCustomers, "customers unchanged");
  assert((await prisma.booking.count()) === beforeBookings, "bookings unchanged");
  assert((await prisma.quote.count()) === beforeQuotes, "quotes unchanged");
  assert((await prisma.invoice.count()) === beforeInvoices, "invoices unchanged");
  assert((await prisma.workOrder.count()) === beforeWo, "work orders unchanged");
  assert((await prisma.payment.count()) === beforePayments, "payments unchanged");
  assert((await prisma.review.count()) === beforeReviews, "reviews unchanged");
  assert((await prisma.question.count()) === beforeQuestions, "questions unchanged");
  assert((await prisma.automationJob.count()) === beforeJobs, "automation jobs unchanged");
  assert((await prisma.automationRule.count()) === beforeRules, "automation rules unchanged");
  assert((await prisma.amcContract.count()) === beforeAmc, "AMC unchanged");
  assert((await prisma.mediaAsset.count()) === beforeMedia, "media unchanged");
  assert((await prisma.auditLog.count()) >= beforeAudit, "audit logs not wiped");

  const staffOnly = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: true,
    env: { ...process.env, NODE_ENV: "development", SEED_STAFF_ONLY: "1" },
  });
  assert(staffOnly.status === 0, "SEED_STAFF_ONLY development seed works");
  assert((await prisma.lead.findUnique({ where: { id: lead.id } }))?.id === lead.id, "staff-only seed does not delete marker lead");

  const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");
  assert(readme.includes("ALLOW_DESTRUCTIVE_PRODUCTION_SEED"), "README documents emergency override");
  assert(
    readme.includes("docs/production-database.md") || readme.includes("Production database"),
    "README has production DB setup",
  );
  assert(readme.includes("SEED_STAFF_ONLY"), "README documents SEED_STAFF_ONLY");

  await prisma.lead.deleteMany({ where: { phone: markerPhone } });
  console.log("Seed safety verification passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
