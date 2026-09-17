/**
 * Remove leftover catalog drafts so the public catalog has no draft rows.
 * Does not publish places outside the 277 master or services outside the 454.
 * Does not publish uncovered service-area pairs.
 */
import { prisma } from "../src/server/db";

async function main() {
  const draftServices = await prisma.service.findMany({
    where: { status: "draft" },
    select: { id: true, slug: true },
  });
  const draftLocations = await prisma.location.findMany({
    where: { status: "draft" },
    select: { id: true, slug: true },
  });
  const draftGuides = await prisma.diyGuide.findMany({
    where: { status: "draft" },
    select: { id: true, slug: true },
  });

  const serviceIds = draftServices.map((row) => row.id);
  const locationIds = draftLocations.map((row) => row.id);
  const guideIds = draftGuides.map((row) => row.id);

  if (guideIds.length) {
    await prisma.service.updateMany({
      where: { primaryDiyGuideId: { in: guideIds } },
      data: { primaryDiyGuideId: null },
    });
    await prisma.diyGuide.deleteMany({ where: { id: { in: guideIds } } });
  }

  if (serviceIds.length) {
    await prisma.service.updateMany({
      where: { id: { in: serviceIds } },
      data: { primaryDiyGuideId: null },
    });
    await prisma.serviceLocation.deleteMany({ where: { serviceId: { in: serviceIds } } });
    await prisma.service.deleteMany({ where: { id: { in: serviceIds } } });
  }

  if (locationIds.length) {
    await prisma.location.updateMany({
      where: { parentId: { in: locationIds } },
      data: { parentId: null },
    });
    await prisma.serviceLocation.deleteMany({ where: { locationId: { in: locationIds } } });
    await prisma.location.deleteMany({ where: { id: { in: locationIds } } });
  }

  const uncovered = await prisma.serviceLocation.deleteMany({
    where: { coverageStatus: "draft", covered: false, indexable: false },
  });

  const remaining = {
    services: await prisma.service.count({ where: { status: "draft" } }),
    locations: await prisma.location.count({ where: { status: "draft" } }),
    diy: await prisma.diyGuide.count({ where: { status: "draft" } }),
    articles: await prisma.article.count({ where: { status: "draft" } }),
    serviceLocations: await prisma.serviceLocation.count({ where: { coverageStatus: "draft" } }),
    publicServices: await prisma.service.count({ where: { status: "active", indexable: true } }),
    publicPlaces: await prisma.location.count({
      where: { status: "active", indexable: true, type: { in: ["emirate", "city", "community"] } },
    }),
    publishedDiy: await prisma.diyGuide.count({ where: { status: "published", indexable: true } }),
  };

  console.log(
    JSON.stringify(
      {
        removed: {
          services: draftServices.map((row) => row.slug),
          locations: draftLocations.length,
          diyShells: draftGuides.length,
          uncoveredPairs: uncovered.count,
        },
        remaining,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
