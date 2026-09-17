import { prisma } from "../src/server/db";

async function main() {
  const loc = await prisma.location.groupBy({ by: ["status", "serves"], _count: true });
  const eligiblePairs = await prisma.serviceLocation.count({
    where: {
      coverageStatus: { not: "published" },
      service: { status: "active" },
      location: { status: "active", serves: true },
    },
  });
  console.log(JSON.stringify({ loc, eligiblePairs }, null, 2));
}

main().finally(() => prisma.$disconnect());
