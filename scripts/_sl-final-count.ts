import { prisma } from "../src/server/db";

async function main() {
  const [total, published, draft] = await Promise.all([
    prisma.serviceLocation.count(),
    prisma.serviceLocation.count({
      where: { coverageStatus: "published", covered: true, indexable: true },
    }),
    prisma.serviceLocation.count({ where: { coverageStatus: { not: "published" } } }),
  ]);
  const withEn = await prisma.serviceLocation.count({
    where: {
      coverageStatus: { not: "published" },
      translations: { some: { locale: "en", h1: { not: "" } } },
    },
  });
  console.log(JSON.stringify({ total, published, draft, draftWithEnH1: withEn }, null, 2));
}

main().finally(() => prisma.$disconnect());
