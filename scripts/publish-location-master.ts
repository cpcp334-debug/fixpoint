/**
 * Publish the approved location master.
 * Does not publish leftover draft rows outside the master.
 * Does not create or publish ServiceLocation coverage.
 */
import { prisma } from "../src/server/db";
import { loadLocationMaster } from "../prisma/data/location-master";

async function main() {
  const master = loadLocationMaster();
  const slugs = master.locations.filter((row) => row.type !== "country").map((row) => row.slug);
  const beforePublishedSl = await prisma.serviceLocation.count({
    where: { coverageStatus: "published", covered: true, indexable: true },
  });

  const updated = await prisma.location.updateMany({
    where: { slug: { in: slugs } },
    data: { status: "active", indexable: true, serves: true },
  });

  const rows = await prisma.location.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, translations: { where: { locale: "ar" }, select: { id: true, name: true } } },
  });
  let arabicTokens = 0;
  for (const row of rows) {
    for (const tr of row.translations) {
      if (tr.name !== "REVIEW_REQUIRED") continue;
      const en = await prisma.locationI18n.findUnique({
        where: { locationId_locale: { locationId: row.id, locale: "en" } },
        select: { name: true },
      });
      if (!en?.name) continue;
      await prisma.locationI18n.update({ where: { id: tr.id }, data: { name: en.name } });
      arabicTokens += 1;
    }
  }

  const published = await prisma.location.count({
    where: { slug: { in: slugs }, status: "active", indexable: true },
  });
  const afterPublishedSl = await prisma.serviceLocation.count({
    where: { coverageStatus: "published", covered: true, indexable: true },
  });
  if (afterPublishedSl !== beforePublishedSl) {
    throw new Error(`ServiceLocation published count changed: ${beforePublishedSl} -> ${afterPublishedSl}`);
  }
  console.log(JSON.stringify({ updated: updated.count, published, arabicDisplayFallback: arabicTokens, publishedServiceLocations: afterPublishedSl }));
  if (published !== slugs.length) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
