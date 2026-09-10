/**
 * Image assignment infrastructure (no fabricated binaries).
 * Resolves ServiceLocation → Service hero → category convention → approved_fallback.
 * Writes EN/AR imageAlt when missing. Never publishes. Never invents asset files.
 *
 * Env:
 *   IMAGE_ASSIGN_LIMIT (default 500)
 *   IMAGE_ASSIGN_OFFSET (default 0)
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { prisma } from "../src/server/db";
import { pickI18n } from "../src/lib/utils";
import { resolveImageInheritance, isPublishedHeroPath } from "../src/lib/service-location/images";

function publicAssetExists(webPath: string | null | undefined): boolean {
  if (!webPath || !isPublishedHeroPath(webPath)) return false;
  const rel = webPath.replace(/^\//, "");
  return existsSync(join(process.cwd(), "public", rel));
}

async function main() {
  const limit = Number(process.env.IMAGE_ASSIGN_LIMIT || "500");
  const offset = Number(process.env.IMAGE_ASSIGN_OFFSET || "0");

  const rows = await prisma.serviceLocation.findMany({
    where: { coverageStatus: { not: "published" } },
    select: {
      id: true,
      heroImageOverride: true,
      coverageStatus: true,
      service: { select: { heroImage: true, slug: true, category: { select: { slug: true } }, translations: true } },
      location: { select: { translations: true } },
      translations: { select: { locale: true, imageAlt: true, id: true } },
    },
    orderBy: [{ service: { slug: "asc" } }, { location: { slug: "asc" } }],
    skip: offset,
    take: limit,
  });

  const report = {
    offset,
    limit,
    selected: rows.length,
    altsWritten: 0,
    overrideReady: 0,
    serviceHeroReady: 0,
    categoryFilePresent: 0,
    approvedFallback: 0,
    skippedPublished: 0,
    storageProvider: process.env.STORAGE_PROVIDER || "local",
    objectStorageConfigured: false,
  };

  for (const row of rows) {
    if (row.coverageStatus === "published") {
      report.skippedPublished += 1;
      continue;
    }
    for (const locale of ["en", "ar"] as const) {
      const serviceName = pickI18n(row.service.translations, locale)?.name || row.service.slug;
      const locationName = pickI18n(row.location.translations, locale)?.name || "UAE";
      const categoryPath = `/media/categories/${row.service.category.slug}.jpg`;
      const categoryExists = publicAssetExists(categoryPath);
      if (categoryExists) report.categoryFilePresent += 1;

      const image = resolveImageInheritance({
        heroImageOverride: row.heroImageOverride,
        serviceHeroImage: row.service.heroImage,
        categorySlug: row.service.category.slug,
        categoryAssetExists: categoryExists,
        serviceName,
        locationName,
        locale,
      });

      if (image.source === "override") report.overrideReady += 1;
      else if (image.source === "service") report.serviceHeroReady += 1;
      else if (image.source === "category") report.categoryFilePresent += 1;
      else report.approvedFallback += 1;

      const t = row.translations.find((x) => x.locale === locale);
      if (t && !t.imageAlt?.trim()) {
        await prisma.serviceLocationI18n.update({
          where: { id: t.id },
          data: { imageAlt: image.alt },
        });
        report.altsWritten += 1;
      } else if (!t) {
        // do not create full i18n shells here — content pipeline owns that
      }
    }
  }

  const out = join(process.cwd(), "docs/content-image-assign.json");
  writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
