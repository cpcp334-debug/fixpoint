import { prisma } from "../src/server/db";
import { loadEligibilityForId } from "../src/lib/service-location/publication-ops";

async function main() {
  const row = await prisma.serviceLocation.findFirst({
    where: { coverageStatus: { not: "published" } },
    include: {
      service: { select: { slug: true, status: true, heroImage: true } },
      location: { select: { slug: true, status: true, serves: true } },
      translations: { select: { locale: true, h1: true, intro: true, seoTitle: true, metaDescription: true, directAnswer: true, geoIntro: true, imageAlt: true, body: true } },
    },
  });
  if (!row) throw new Error("none");
  const { eligibility } = await loadEligibilityForId(prisma, row.id);
  console.log(
    JSON.stringify(
      {
        pair: `${row.service.slug}/${row.location.slug}`,
        covered: row.covered,
        lifecycle: row.coverageStatus,
        qualityStatus: row.qualityStatus,
        qualityScore: row.qualityScore,
        serviceStatus: row.service.status,
        locationStatus: row.location.status,
        serves: row.location.serves,
        hero: row.service.heroImage,
        enShell: {
          h1: Boolean(row.translations.find((t) => t.locale === "en")?.h1?.trim()),
          intro: Boolean(row.translations.find((t) => t.locale === "en")?.intro?.trim()),
          seo: Boolean(row.translations.find((t) => t.locale === "en")?.seoTitle?.trim()),
          meta: Boolean(row.translations.find((t) => t.locale === "en")?.metaDescription?.trim()),
          da: Boolean(row.translations.find((t) => t.locale === "en")?.directAnswer?.trim()),
          geo: Boolean(row.translations.find((t) => t.locale === "en")?.geoIntro?.trim()),
          alt: row.translations.find((t) => t.locale === "en")?.imageAlt,
        },
        eligibility,
      },
      null,
      2,
    ),
  );
}

main().finally(() => prisma.$disconnect());
