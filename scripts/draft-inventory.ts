import { prisma } from "../src/server/db";

async function main() {
  const [
    services,
    locations,
    diy,
    articles,
    diyCats,
    sl,
    faqs,
  ] = await Promise.all([
    prisma.service.findMany({ where: { status: "draft" }, select: { slug: true } }),
    prisma.location.findMany({
      where: { status: "draft" },
      select: { slug: true, type: true, translations: { where: { locale: "en" }, select: { name: true } } },
    }),
    prisma.diyGuide.findMany({
      where: { NOT: { status: "published" } },
      select: { slug: true, status: true, translations: { select: { locale: true, title: true } } },
    }),
    prisma.article.findMany({
      where: { NOT: { status: "published" } },
      select: { slug: true, status: true },
    }),
    prisma.diyCategory.findMany({
      where: { NOT: { status: "published" } },
      select: { slug: true, status: true },
    }),
    prisma.serviceLocation.groupBy({
      by: ["coverageStatus", "covered", "indexable"],
      _count: true,
    }),
    prisma.faq.groupBy({ by: ["status"], _count: true }).catch(() => []),
  ]);

  console.log(
    JSON.stringify(
      {
        serviceDrafts: services.map((row) => row.slug),
        locationDrafts: locations.map((row) => ({
          slug: row.slug,
          type: row.type,
          name: row.translations[0]?.name,
        })),
        diyStatuses: diy.reduce<Record<string, number>>((acc, row) => {
          acc[row.status] = (acc[row.status] || 0) + 1;
          return acc;
        }, {}),
        diySample: diy.slice(0, 12).map((row) => ({
          slug: row.slug,
          status: row.status,
          titles: row.translations.map((t) => `${t.locale}:${t.title}`),
        })),
        articleDrafts: articles,
        diyCategoryDrafts: diyCats,
        serviceLocations: sl,
        faqs,
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
