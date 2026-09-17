import { prisma } from "../src/server/db";

async function main() {
  const [
    serviceStatus,
    locationStatus,
    diyStatus,
    articleStatus,
    diyCategoryStatus,
    slCoverage,
    slStatus,
  ] = await Promise.all([
    prisma.service.groupBy({ by: ["status"], _count: true }),
    prisma.location.groupBy({ by: ["status"], _count: true }),
    prisma.diyGuide.groupBy({ by: ["status"], _count: true }),
    prisma.article.groupBy({ by: ["status"], _count: true }),
    prisma.diyCategory.groupBy({ by: ["status"], _count: true }),
    prisma.serviceLocation.groupBy({ by: ["coverageStatus", "covered"], _count: true }),
    prisma.serviceLocation.groupBy({ by: ["coverageStatus"], _count: true }),
  ]);
  console.log(
    JSON.stringify(
      {
        services: serviceStatus,
        locations: locationStatus,
        diy: diyStatus,
        articles: articleStatus,
        diyCategories: diyCategoryStatus,
        serviceLocations: slCoverage,
        slStatus,
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
