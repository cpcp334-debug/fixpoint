import { prisma } from "../src/server/db";

async function main() {
  const [services, locations, sl, diy] = await Promise.all([
    prisma.service.count(),
    prisma.location.count(),
    prisma.serviceLocation.count(),
    prisma.diyGuide.count({ where: { status: "published" } }),
  ]);
  const activeServices = await prisma.service.count({ where: { status: { not: "archived" as never } } }).catch(() =>
    prisma.service.count(),
  );
  console.log(JSON.stringify({ services, activeServices, locations, serviceLocations: sl, diyPublished: diy }, null, 2));
}

main().finally(() => prisma.$disconnect());
