/**
 * Pre-migration orphan audit for Quote.serviceId / Quote.locationId.
 * Exit 1 if any orphan exists (FIX 8 gate).
 */
import { prisma } from "../src/server/db";

async function main() {
  const quotes = await prisma.quote.findMany({
    select: { id: true, quoteNumber: true, status: true, serviceId: true, locationId: true },
  });
  const serviceIds = [...new Set(quotes.map((q) => q.serviceId).filter(Boolean))] as string[];
  const locationIds = [...new Set(quotes.map((q) => q.locationId).filter(Boolean))] as string[];
  const services = serviceIds.length
    ? await prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true } })
    : [];
  const locations = locationIds.length
    ? await prisma.location.findMany({ where: { id: { in: locationIds } }, select: { id: true } })
    : [];
  const svcSet = new Set(services.map((s) => s.id));
  const locSet = new Set(locations.map((l) => l.id));
  const orphanServices = quotes.filter((q) => q.serviceId && !svcSet.has(q.serviceId));
  const orphanLocations = quotes.filter((q) => q.locationId && !locSet.has(q.locationId));
  const emptyService = quotes.filter((q) => q.serviceId === "");
  const emptyLocation = quotes.filter((q) => q.locationId === "");

  const report = {
    total: quotes.length,
    orphanServiceCount: orphanServices.length,
    orphanLocationCount: orphanLocations.length,
    emptyServiceId: emptyService.length,
    emptyLocationId: emptyLocation.length,
    orphanServices: orphanServices.map((q) => ({
      id: q.id,
      quoteNumber: q.quoteNumber,
      status: q.status,
      serviceId: q.serviceId,
    })),
    orphanLocations: orphanLocations.map((q) => ({
      id: q.id,
      quoteNumber: q.quoteNumber,
      status: q.status,
      locationId: q.locationId,
    })),
  };
  console.log(JSON.stringify(report, null, 2));

  if (
    orphanServices.length ||
    orphanLocations.length ||
    emptyService.length ||
    emptyLocation.length
  ) {
    console.error("FIX8 orphan audit FAILED — do not apply FK migration until remediating.");
    process.exitCode = 1;
    return;
  }
  console.log("FIX8 orphan audit OK — no conflicts.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
