/**
 * Make the approved catalog public and indexable.
 * Does not publish leftover draft services or locations outside the last update.
 */
import { prisma } from "../src/server/db";

async function main() {
  const diy = await prisma.diyGuide.updateMany({
    where: { status: "published", indexable: false },
    data: { indexable: true },
  });
  const cats = await prisma.diyCategory.updateMany({
    where: { status: "published", indexable: false },
    data: { indexable: true },
  });
  const articles = await prisma.article.updateMany({
    where: { status: "published", indexable: false },
    data: { indexable: true },
  });

  const counts = {
    diy: await prisma.diyGuide.count({ where: { status: "published", indexable: true } }),
    diyDraft: await prisma.diyGuide.count({ where: { NOT: { status: "published" } } }),
    cats: await prisma.diyCategory.count({ where: { status: "published", indexable: true } }),
    articles: await prisma.article.count({ where: { status: "published", indexable: true } }),
    services: await prisma.service.count({ where: { status: "active", indexable: true } }),
    serviceDraft: await prisma.service.count({ where: { status: "draft" } }),
    places: await prisma.location.count({
      where: { status: "active", indexable: true, type: { in: ["emirate", "city", "community"] } },
    }),
    placeDraft: await prisma.location.count({ where: { status: "draft" } }),
  };

  console.log(JSON.stringify({ updated: { diy: diy.count, cats: cats.count, articles: articles.count }, counts }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
