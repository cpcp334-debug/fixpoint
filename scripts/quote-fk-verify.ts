/**
 * FIX 8 — Quote service/location FK verification.
 * Does not wipe unrelated business data.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { createQuote, resolveQuoteCatalogRefs, updateQuote } from "../src/lib/admin/quotes";
import { createLead } from "../src/lib/leads";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

const PREFIX = "fix8-quote-fk";
const ids = {
  quotes: [] as string[],
  services: [] as string[],
  locations: [] as string[],
  categories: [] as string[],
  leads: [] as string[],
};

async function cleanup() {
  if (ids.quotes.length) {
    await prisma.quoteItem.deleteMany({ where: { quoteId: { in: ids.quotes } } });
    await prisma.quote.deleteMany({ where: { id: { in: ids.quotes } } });
  }
  await prisma.quote.deleteMany({ where: { quoteNumber: { startsWith: "ALN-Q-" } , customerPhone: { startsWith: "+9715090188" } } }).catch(() => undefined);
  const leftover = await prisma.quote.findMany({
    where: { OR: [{ customerName: { startsWith: "FIX8" } }, { sourceKey: { startsWith: `${PREFIX}-` } }] },
    select: { id: true },
  });
  if (leftover.length) {
    await prisma.quoteItem.deleteMany({ where: { quoteId: { in: leftover.map((r) => r.id) } } });
    await prisma.quote.deleteMany({ where: { id: { in: leftover.map((r) => r.id) } } });
  }
  if (ids.leads.length) {
    await prisma.leadScoreHistory.deleteMany({ where: { leadId: { in: ids.leads } } });
    await prisma.leadScore.deleteMany({ where: { leadId: { in: ids.leads } } });
    await prisma.lead.deleteMany({ where: { id: { in: ids.leads } } });
  }
  if (ids.services.length) {
    await prisma.serviceI18n.deleteMany({ where: { serviceId: { in: ids.services } } });
    await prisma.service.deleteMany({ where: { id: { in: ids.services } } });
  }
  if (ids.locations.length) {
    await prisma.locationI18n.deleteMany({ where: { locationId: { in: ids.locations } } });
    await prisma.location.deleteMany({ where: { id: { in: ids.locations } } });
  }
  if (ids.categories.length) {
    await prisma.serviceCategoryI18n.deleteMany({ where: { categoryId: { in: ids.categories } } });
    await prisma.serviceCategory.deleteMany({ where: { id: { in: ids.categories } } });
  }
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    customerName: "FIX8 Quote",
    customerPhone: "+971509018801",
    locationLabel: "Stored label loc",
    serviceLabel: "Stored label svc",
    scope: "FIX8 scope",
    materials: "",
    labor: "",
    exclusions: "",
    taxesNote: "",
    validity: "",
    paymentTerms: "",
    estimatedDuration: "",
    warrantyTerms: "",
    notes: "",
    subtotalLabel: "AED 100",
    discountLabel: "",
    taxLabel: "",
    totalLabel: "AED 100",
    humanApproved: true,
    status: "DRAFT" as const,
    items: [{ description: "Line", quantity: "1", unit: "", unitPrice: "100", lineTotal: "100" }],
    ...overrides,
  };
}

async function main() {
  const root = process.cwd();
  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  const migration = readFileSync(
    join(root, "prisma/migrations/20260908094000_fix8_quote_service_location_fk/migration.sql"),
    "utf8",
  );
  const quotesSrc = readFileSync(join(root, "src/lib/admin/quotes.ts"), "utf8");
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { scripts: Record<string, string> };

  assert(schema.includes("onDelete: Restrict") && schema.includes("onUpdate: Cascade"), "schema Restrict+Cascade");
  assert(schema.includes("service             Service?") && schema.includes("location            Location?"), "Quote relations");
  assert(migration.includes("RAISE EXCEPTION"), "migration aborts on orphans");
  assert(migration.includes("ON DELETE RESTRICT") && migration.includes("ON UPDATE CASCADE"), "migration FK policy");
  assert(!migration.includes("ON DELETE CASCADE"), "no cascade delete quotes via service/location");
  assert(quotesSrc.includes("invalid_service") && quotesSrc.includes("invalid_location"), "typed errors");
  assert(pkg.scripts["verify:quote-fk"]?.includes("quote-fk-verify"), "verify script registered");
  assert(pkg.scripts["verify:quote-fk-orphan"]?.includes("quote-fk-orphan-audit"), "orphan audit registered");

  await cleanup();

  const empty = await resolveQuoteCatalogRefs({ serviceId: "", locationId: "  " });
  assert(empty.ok && empty.serviceId === null && empty.locationId === null, "empty string → null");

  const category = await prisma.serviceCategory.create({
    data: {
      slug: `${PREFIX}-cat`,
      sortOrder: 9999,
      translations: { create: [{ locale: "en", name: "FIX8 Cat", description: "" }] },
    },
  });
  ids.categories.push(category.id);

  const service = await prisma.service.create({
    data: {
      categoryId: category.id,
      slug: `${PREFIX}-svc`,
      serviceType: "maintenance",
      status: "active",
      translations: {
        create: [
          {
            locale: "en",
            name: "FIX8 Service",
            shortDescription: "s",
            longDescription: "l",
            professionalFallback: "p",
            seoTitle: "t",
            metaDescription: "m",
          },
        ],
      },
    },
  });
  ids.services.push(service.id);

  const location = await prisma.location.create({
    data: {
      slug: `${PREFIX}-loc`,
      type: "emirate",
      status: "active",
      serves: true,
      translations: { create: [{ locale: "en", name: "FIX8 Location", intro: "", seoTitle: "t", metaDescription: "m" }] },
    },
  });
  ids.locations.push(location.id);

  const actor = { id: "fix8-actor", email: "fix8@verify.local" };

  // 1–2 valid refs
  const valid = await createQuote(
    baseInput({ serviceId: service.id, locationId: location.id, status: "SENT" }),
    actor,
  );
  assert(valid.ok, "1/2 valid service+location accepted");
  ids.quotes.push(valid.quote.id);
  assert(valid.quote.serviceId === service.id && valid.quote.locationId === location.id, "refs stored");
  assert(valid.quote.serviceLabel === "Stored label svc", "5 serviceLabel preserved");
  assert(valid.quote.locationLabel === "Stored label loc", "5 locationLabel preserved");

  // 3 invalid service
  const badSvc = await createQuote(baseInput({ serviceId: "missing-service-id", locationId: location.id }), actor);
  assert(!badSvc.ok && badSvc.error === "invalid_service", "3 invalid service rejected");

  // 4 invalid location
  const badLoc = await createQuote(baseInput({ serviceId: service.id, locationId: "missing-location-id" }), actor);
  assert(!badLoc.ok && badLoc.error === "invalid_location", "4 invalid location rejected");

  // 5 readable
  const readable = await prisma.quote.findUnique({ where: { id: valid.quote.id } });
  assert(readable?.totalLabel === "AED 100", "5 existing quote readable");

  // 9 update valid / invalid
  const updated = await updateQuote(
    valid.quote.id,
    baseInput({
      serviceId: service.id,
      locationId: location.id,
      status: "ACCEPTED",
      totalLabel: "AED 120",
      serviceLabel: "Stored label svc",
      locationLabel: "Stored label loc",
    }),
    actor.email,
  );
  assert(updated.ok && updated.quote.status === "ACCEPTED" && updated.quote.totalLabel === "AED 120", "9 update ok");
  const badUpdate = await updateQuote(
    valid.quote.id,
    baseInput({ serviceId: "nope", locationId: location.id, status: "ACCEPTED" }),
    actor.email,
  );
  assert(!badUpdate.ok && badUpdate.error === "invalid_service", "9 update rejects invalid service");
  const afterBad = await prisma.quote.findUnique({ where: { id: valid.quote.id } });
  assert(afterBad?.status === "ACCEPTED" && afterBad.totalLabel === "AED 120", "9 failed update does not corrupt");

  // 8 Co-Founder draft + sourceKey idempotency
  const sourceKey = `cofounder:${PREFIX}:prop:0`;
  const draft = await createQuote(
    baseInput({
      sourceKey,
      status: "SENT",
      humanApproved: true,
      serviceId: service.id,
      locationId: location.id,
      customerPhone: "+971509018802",
    }),
    actor,
  );
  assert(draft.ok && draft.quote.status === "DRAFT" && draft.quote.humanApproved === false, "8 cofounder forced DRAFT");
  ids.quotes.push(draft.quote.id);
  const replay = await createQuote(
    baseInput({
      sourceKey,
      status: "SENT",
      customerName: "Should not replace",
      customerPhone: "+971509018899",
      serviceId: "invalid-should-not-matter",
    }),
    actor,
  );
  assert(replay.ok && replay.quote.id === draft.quote.id && replay.quote.status === "DRAFT", "8 sourceKey idempotent");

  // Draft without catalog refs
  const bare = await createQuote(baseInput({ customerPhone: "+971509018803" }), actor);
  assert(bare.ok && bare.quote.serviceId == null && bare.quote.locationId == null, "draft without refs ok");
  ids.quotes.push(bare.quote.id);

  // 6–7 delete restriction: assert FK ON DELETE RESTRICT is present (avoid PGlite crash on live DELETE)
  const fkRows = await prisma.$queryRaw<Array<{ conname: string; confdeltype: string; confupdtype: string }>>`
    SELECT c.conname, c.confdeltype, c.confupdtype
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    WHERE rel.relname = 'Quote'
      AND c.contype = 'f'
      AND c.conname IN ('Quote_serviceId_fkey', 'Quote_locationId_fkey')
  `;
  const byName = Object.fromEntries(fkRows.map((row) => [row.conname, row]));
  assert(byName.Quote_serviceId_fkey?.confdeltype === "r", "6 service FK onDelete Restrict");
  assert(byName.Quote_serviceId_fkey?.confupdtype === "c", "6 service FK onUpdate Cascade");
  assert(byName.Quote_locationId_fkey?.confdeltype === "r", "7 location FK onDelete Restrict");
  assert(byName.Quote_locationId_fkey?.confupdtype === "c", "7 location FK onUpdate Cascade");
  assert(await prisma.service.findUnique({ where: { id: service.id } }), "6 service still exists");
  assert(await prisma.location.findUnique({ where: { id: location.id } }), "7 location still exists");

  // 11 financial row not deleted
  assert((await prisma.quote.count({ where: { id: valid.quote.id } })) === 1, "11 quote not deleted");

  // 12 public lead write still works (quote form creates leads, not quotes)
  const leadWrite = await createLead(
    {
      name: "FIX8 Public",
      phone: "+971509018804",
      requirement: "Public quote flow must still create leads.",
      source: "quote",
      locale: "en",
    },
    "203.0.113.88",
  );
  assert(leadWrite.ok && "id" in leadWrite && leadWrite.id, "12 public createLead ok");
  if (leadWrite.ok && "id" in leadWrite && leadWrite.id) ids.leads.push(leadWrite.id);

  // Clear quote refs so cleanup can delete service/location
  await prisma.quote.updateMany({
    where: { id: { in: ids.quotes } },
    data: { serviceId: null, locationId: null },
  });

  await cleanup();
  console.log("verify:quote-fk OK");
}

main()
  .catch(async (error) => {
    console.error(error);
    try {
      await cleanup();
    } catch {
      /* ignore */
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
