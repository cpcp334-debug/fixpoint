import "./load-env-mysql";
import { prisma } from "../src/server/db";

async function main() {
  const rows = await prisma.location.groupBy({ by: ["type"], _count: true });
  const sample = await prisma.location.findMany({
    take: 15,
    select: { slug: true, type: true, parentId: true },
    orderBy: { type: "asc" },
  });
  const withParent = await prisma.location.findMany({
    where: { type: "community" },
    take: 3,
    select: {
      slug: true,
      type: true,
      parent: { select: { slug: true, type: true, parent: { select: { slug: true, type: true } } } },
    },
  });
  console.log(JSON.stringify({ rows, sample, withParent }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
