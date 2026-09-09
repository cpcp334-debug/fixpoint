/**
 * Assert ServiceLocation candidate matrix invariants after materialize.
 * Does not publish, invent hubs, or change painting-services.
 */
import { DIY_SAFETY_A411_UNRESOLVED_MISSING_HUBS } from "../prisma/data/diy-safety-alignment-a411";
import {
  A32_PILOT_LOCATION_SLUGS,
  A32_PILOT_SERVICE_SLUGS,
  a32PilotPairs,
} from "../prisma/data/service-location-a32-pilot";
import { prisma } from "../src/server/db";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function main() {
  const services = await prisma.service.findMany({
    where: { status: { not: "archived" } },
    select: { id: true, slug: true },
  });
  const locations = await prisma.location.findMany({ select: { id: true, slug: true } });
  const pairs = await prisma.serviceLocation.findMany({
    select: {
      id: true,
      serviceId: true,
      locationId: true,
      coverageStatus: true,
      covered: true,
      indexable: true,
      indexableEn: true,
      indexableAr: true,
    },
  });

  const keySet = new Set(pairs.map((p) => `${p.serviceId}:${p.locationId}`));
  assert(keySet.size === pairs.length, `duplicate ServiceLocation pairs: ${pairs.length - keySet.size}`);

  const published = pairs.filter(
    (p) => p.coverageStatus === "published" && p.covered === true && p.indexable === true,
  );
  assert(published.length === 49, `published+covered+indexable must stay 49, got ${published.length}`);

  const serviceBySlug = new Map(
    (await prisma.service.findMany({ where: { slug: { in: [...A32_PILOT_SERVICE_SLUGS] } } })).map((s) => [
      s.slug,
      s,
    ]),
  );
  const locationBySlug = new Map(
    (await prisma.location.findMany({ where: { slug: { in: [...A32_PILOT_LOCATION_SLUGS] } } })).map((l) => [
      l.slug,
      l,
    ]),
  );

  let pilotOk = 0;
  for (const pair of a32PilotPairs()) {
    const service = serviceBySlug.get(pair.serviceSlug);
    const location = locationBySlug.get(pair.locationSlug);
    assert(service && location, `pilot catalog missing ${pair.serviceSlug}/${pair.locationSlug}`);
    const row = pairs.find((p) => p.serviceId === service.id && p.locationId === location.id);
    assert(row, `missing pilot pair ${pair.serviceSlug}/${pair.locationSlug}`);
    assert(row.coverageStatus === "draft", `pilot ${pair.serviceSlug}/${pair.locationSlug} must stay draft`);
    assert(row.covered === false, `pilot ${pair.serviceSlug}/${pair.locationSlug} must stay uncovered`);
    assert(row.indexable === false, `pilot must stay non-indexable`);
    assert(row.indexableEn === false && row.indexableAr === false, `pilot locale index flags must stay false`);
    pilotOk += 1;
  }
  assert(pilotOk === 50, `pilots must still be 50 draft uncovered, got ${pilotOk}`);

  for (const hub of DIY_SAFETY_A411_UNRESOLVED_MISSING_HUBS) {
    const hubService = await prisma.service.findUnique({ where: { slug: hub } });
    assert(!hubService, `hub Service row must remain absent: ${hub}`);
  }

  const expectedMatrix = services.length * locations.length;
  console.log(
    JSON.stringify(
      {
        services: services.length,
        locations: locations.length,
        expectedMatrix,
        serviceLocationRows: pairs.length,
        uniquePairs: keySet.size,
        published: published.length,
        pilotsDraftUncovered: pilotOk,
        hubsAbsent: DIY_SAFETY_A411_UNRESOLVED_MISSING_HUBS.length,
        matrixComplete: pairs.length === expectedMatrix,
      },
      null,
      2,
    ),
  );

  assert(
    pairs.length === expectedMatrix,
    `matrix incomplete: have ${pairs.length}, expected ${expectedMatrix} (services×locations)`,
  );

  console.log("verify:matrix PASSED");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
