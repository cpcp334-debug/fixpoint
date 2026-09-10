/**
 * Attach curated topic WebP heroes to grandfathered published ServiceLocation rows.
 * Does NOT rewrite body content.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { topicWebpForServiceSlug } from "../src/lib/media/topic-webp";

async function main() {
  const rows = await prisma.serviceLocation.findMany({
    where: { coverageStatus: "published", indexable: true },
    include: {
      service: { include: { translations: true } },
      location: { include: { translations: true } },
      translations: true,
    },
  });

  const updated: Array<Record<string, string>> = [];
  for (const row of rows) {
    const src = topicWebpForServiceSlug(row.service.slug);
    const enName = row.service.translations.find((t) => t.locale === "en")?.name || row.service.slug;
    const arName = row.service.translations.find((t) => t.locale === "ar")?.name || enName;
    const locEn = row.location.translations.find((t) => t.locale === "en")?.name || row.location.slug;
    const locAr = row.location.translations.find((t) => t.locale === "ar")?.name || locEn;

    await prisma.serviceLocation.update({
      where: { id: row.id },
      data: { heroImageOverride: src },
    });
    // Also set service hero if empty so inheritance works elsewhere
    if (!row.service.heroImage) {
      await prisma.service.update({
        where: { id: row.serviceId },
        data: { heroImage: src },
      });
    }

    for (const locale of ["en", "ar"] as const) {
      const alt =
        locale === "ar"
          ? `صورة توضيحية لـ${arName} في ${locAr} — محتوى تعليمي`
          : `Educational illustration for ${enName} in ${locEn}`;
      const existing = row.translations.find((t) => t.locale === locale);
      if (existing) {
        await prisma.serviceLocationI18n.update({
          where: { id: existing.id },
          data: { imageAlt: alt },
        });
      }
    }

    updated.push({
      service: row.service.slug,
      location: row.location.slug,
      hero: src,
    });
  }

  writeFileSync(
    join(process.cwd(), "docs/gf49-hero-attach-report.json"),
    JSON.stringify({ updated: updated.length, rows: updated }, null, 2),
  );
  console.log(JSON.stringify({ ok: true, updated: updated.length }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
