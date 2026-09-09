/**
 * A3.2 rollback — deletes only the locked 50 pilot ServiceLocation rows.
 * Does not touch the original 49. Does not wipe other data.
 */
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
  const before = await prisma.serviceLocation.count();
  const services = await prisma.service.findMany({
    where: { slug: { in: [...A32_PILOT_SERVICE_SLUGS] } },
    select: { id: true, slug: true },
  });
  const locations = await prisma.location.findMany({
    where: { slug: { in: [...A32_PILOT_LOCATION_SLUGS] } },
    select: { id: true, slug: true },
  });
  const serviceBySlug = new Map(services.map((s) => [s.slug, s.id]));
  const locationBySlug = new Map(locations.map((l) => [l.slug, l.id]));

  const ids: string[] = [];
  for (const pair of a32PilotPairs()) {
    const serviceId = serviceBySlug.get(pair.serviceSlug);
    const locationId = locationBySlug.get(pair.locationSlug);
    if (!serviceId || !locationId) continue;
    const row = await prisma.serviceLocation.findUnique({
      where: { serviceId_locationId: { serviceId, locationId } },
      select: { id: true, coverageStatus: true, covered: true },
    });
    if (!row) continue;
    assert(row.coverageStatus === "draft", `refusing to delete non-draft pilot row ${pair.serviceSlug}/${pair.locationSlug}`);
    assert(!row.covered, `refusing to delete covered pilot row ${pair.serviceSlug}/${pair.locationSlug}`);
    ids.push(row.id);
  }

  if (ids.length) {
    await prisma.serviceLocationI18n.deleteMany({ where: { serviceLocationId: { in: ids } } });
    await prisma.serviceLocationRevision.deleteMany({ where: { serviceLocationId: { in: ids } } });
    await prisma.serviceLocation.deleteMany({ where: { id: { in: ids } } });
  }

  const after = await prisma.serviceLocation.count();
  console.log(JSON.stringify({ before, deleted: ids.length, after }, null, 2));
  console.log("A3.2 pilot rollback COMPLETE");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
