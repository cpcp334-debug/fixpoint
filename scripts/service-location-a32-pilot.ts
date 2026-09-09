/**
 * A3.2 — insert exactly 50 draft ServiceLocation coverage rows.
 * Does NOT publish, generate content, create revisions, or touch the existing 49.
 * Not wired into seed. Reversible via db:rollback:service-location-a32.
 */
import { APPROVED_CHILDREN, childSlug } from "../prisma/data/catalog-a1";
import {
  A32_EMPTY_I18N,
  A32_PILOT_LOCATION_SLUGS,
  A32_PILOT_PAIR_COUNT,
  A32_PILOT_SERVICE_SLUGS,
  a32PilotPairs,
} from "../prisma/data/service-location-a32-pilot";
import { prisma } from "../src/server/db";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function main() {
  assert(A32_PILOT_PAIR_COUNT === 50, `pilot pair count must be 50, got ${A32_PILOT_PAIR_COUNT}`);

  const approvedChildSlugs = new Set(APPROVED_CHILDREN.map(childSlug));
  for (const slug of A32_PILOT_SERVICE_SLUGS) {
    assert(approvedChildSlugs.has(slug), `pilot service ${slug} is not an approved A1 child`);
  }

  const beforeRows = await prisma.serviceLocation.findMany({
    select: { id: true, serviceId: true, locationId: true, coverageStatus: true, covered: true },
    orderBy: { id: "asc" },
  });
  assert(beforeRows.length === 49, `ServiceLocation must be exactly 49 before A3.2, got ${beforeRows.length}`);
  const beforeIds = beforeRows.map((r) => r.id);

  const services = await prisma.service.findMany({
    where: { slug: { in: [...A32_PILOT_SERVICE_SLUGS] } },
    select: { id: true, slug: true, status: true },
  });
  assert(services.length === 10, `expected 10 pilot services in DB, got ${services.length}`);
  const serviceBySlug = new Map(services.map((s) => [s.slug, s]));

  const locations = await prisma.location.findMany({
    where: { slug: { in: [...A32_PILOT_LOCATION_SLUGS] } },
    select: { id: true, slug: true, type: true },
  });
  assert(locations.length === 5, `expected 5 pilot locations in DB, got ${locations.length}`);
  const locationBySlug = new Map(locations.map((l) => [l.slug, l]));

  const pairs = a32PilotPairs();
  for (const pair of pairs) {
    const service = serviceBySlug.get(pair.serviceSlug);
    const location = locationBySlug.get(pair.locationSlug);
    assert(service, `missing service ${pair.serviceSlug}`);
    assert(location, `missing location ${pair.locationSlug}`);
    const existing = await prisma.serviceLocation.findUnique({
      where: { serviceId_locationId: { serviceId: service.id, locationId: location.id } },
    });
    assert(!existing, `pair already exists: ${pair.serviceSlug} × ${pair.locationSlug}`);
  }

  let created = 0;
  for (const pair of pairs) {
    const service = serviceBySlug.get(pair.serviceSlug)!;
    const location = locationBySlug.get(pair.locationSlug)!;
    await prisma.serviceLocation.create({
      data: {
        serviceId: service.id,
        locationId: location.id,
        indexable: false,
        qualityScore: 0,
        covered: false,
        coverageStatus: "draft",
        qualityStatus: "incomplete",
        indexableEn: false,
        indexableAr: false,
        bookingEnabledOverride: null,
        amcAvailableOverride: null,
        emergencyAvailableOverride: null,
        diyRestricted: false,
        heroImageOverride: null,
        publishedAt: null,
        approvedAt: null,
        approvedBy: null,
        translations: {
          create: [
            { locale: "en", ...A32_EMPTY_I18N },
            { locale: "ar", ...A32_EMPTY_I18N },
          ],
        },
      },
    });
    created += 1;
  }

  const afterRows = await prisma.serviceLocation.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  assert(afterRows.length === 99, `ServiceLocation must be 99 after A3.2, got ${afterRows.length}`);
  for (const id of beforeIds) {
    assert(
      afterRows.some((r) => r.id === id),
      `existing ServiceLocation id missing after pilot: ${id}`,
    );
  }

  const pilotRevisionCount = await prisma.serviceLocationRevision.count({
    where: {
      serviceLocation: {
        service: { slug: { in: [...A32_PILOT_SERVICE_SLUGS] } },
        location: { slug: { in: [...A32_PILOT_LOCATION_SLUGS] } },
      },
    },
  });
  assert(pilotRevisionCount === 0, `pilot must create zero revisions, got ${pilotRevisionCount}`);

  console.log(
    JSON.stringify(
      {
        before: 49,
        created,
        after: afterRows.length,
        existingIdsPreserved: beforeIds.length,
        pilotRevisions: pilotRevisionCount,
        pairs: pairs.map((p) => `${p.serviceSlug}/${p.locationSlug}`),
      },
      null,
      2,
    ),
  );
  console.log("A3.2 ServiceLocation coverage pilot COMPLETE");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
