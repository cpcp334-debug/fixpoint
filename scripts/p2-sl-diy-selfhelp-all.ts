/**
 * P2: Persist DIY/self-help section into EVERY Service×Location EN+AR body.
 * Does NOT publish, invent coverage, or change lifecycle.
 *
 * Usage: npx tsx scripts/p2-sl-diy-selfhelp-all.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { getDiyMatrixClass } from "../src/lib/service-location/diy-matrix";
import { riskToSafetyClass } from "../src/lib/service-location/diy";
import {
  bodyHasDiySelfHelp,
  ensureDiySelfHelpSection,
  formatDiySelfHelpBodySection,
} from "../src/lib/service-location/content-builders";
import type { DiySafetyClass } from "../src/lib/service-location/types";

const BATCH = 200;

function safetyForService(slug: string, riskLevel: "green" | "yellow" | "red"): DiySafetyClass {
  return getDiyMatrixClass(slug) ?? riskToSafetyClass(riskLevel);
}

async function main() {
  const total = await prisma.serviceLocation.count();
  let cursor: string | undefined;
  let processed = 0;
  let updatedEn = 0;
  let updatedAr = 0;
  let skippedEn = 0;
  let skippedAr = 0;
  let createdI18n = 0;

  while (processed < total) {
    const rows = await prisma.serviceLocation.findMany({
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      include: {
        translations: true,
        service: { include: { translations: true, primaryDiyGuide: true } },
      },
    });
    if (!rows.length) break;
    cursor = rows[rows.length - 1]!.id;

    for (const row of rows) {
      const safety = safetyForService(row.service.slug, row.service.riskLevel);
      const guideSlug = row.service.primaryDiyGuide?.slug ?? null;

      for (const locale of ["en", "ar"] as const) {
        const serviceName =
          row.service.translations.find((t) => t.locale === locale)?.name ||
          row.service.translations.find((t) => t.locale === "en")?.name ||
          row.service.slug;

        const diy = ensureDiySelfHelpSection({
          existing: null,
          safetyState: safety,
          serviceName,
          locale,
          guideSlug,
        });
        const section = formatDiySelfHelpBodySection({ diy, locale });

        let t = row.translations.find((x) => x.locale === locale);
        if (!t) {
          t = await prisma.serviceLocationI18n.create({
            data: {
              serviceLocationId: row.id,
              locale,
              intro: "",
              localInfo: "",
              seoTitle: "",
              metaDescription: "",
              faq: "[]",
              h1: "",
              body: section,
              directAnswer: "",
              geoIntro: "",
              imageAlt: "",
            },
          });
          createdI18n += 1;
          if (locale === "en") updatedEn += 1;
          else updatedAr += 1;
          continue;
        }

        if (bodyHasDiySelfHelp(t.body || "", locale)) {
          if (locale === "en") skippedEn += 1;
          else skippedAr += 1;
          continue;
        }

        const nextBody = t.body?.trim() ? `${t.body.trim()}\n\n${section}` : section;
        await prisma.serviceLocationI18n.update({
          where: { id: t.id },
          data: { body: nextBody },
        });
        if (locale === "en") updatedEn += 1;
        else updatedAr += 1;
      }
      processed += 1;
    }

    if (processed % 2000 === 0 || processed >= total) {
      console.log(`processed ${processed}/${total} · en+${updatedEn}/skip${skippedEn} · ar+${updatedAr}/skip${skippedAr} · i18nCreated ${createdI18n}`);
    }
  }

  // Audit sample: count bodies with marker
  const [enWith, arWith, enTotal, arTotal, pubCovered] = await Promise.all([
    prisma.serviceLocationI18n.count({
      where: { locale: "en", body: { contains: "## What you can safely check yourself" } },
    }),
    prisma.serviceLocationI18n.count({
      where: { locale: "ar", body: { contains: "## ما يمكنك فحصه بأمان بنفسك" } },
    }),
    prisma.serviceLocationI18n.count({ where: { locale: "en" } }),
    prisma.serviceLocationI18n.count({ where: { locale: "ar" } }),
    prisma.serviceLocation.count({ where: { covered: true, coverageStatus: "published", indexable: true } }),
  ]);

  const report = {
    generatedAt: new Date().toISOString(),
    scope: "P2 — DIY/self-help on all Service×Location records (EN+AR), no publish, no coverage invent",
    serviceLocationTotal: total,
    processed,
    updatedEn,
    updatedAr,
    skippedEn,
    skippedAr,
    createdI18n,
    audit: {
      enWithDiyMarker: enWith,
      arWithDiyMarker: arWith,
      enI18nTotal: enTotal,
      arI18nTotal: arTotal,
      enCoveragePct: enTotal ? Math.round((enWith / enTotal) * 1000) / 10 : 0,
      arCoveragePct: arTotal ? Math.round((arWith / arTotal) * 1000) / 10 : 0,
      publicCoveredUnchanged: pubCovered,
    },
    note: "Uncovered/draft pairs stay non-public. Runtime page-resolve also injects structured DIY for preview/public.",
  };

  writeFileSync(join(process.cwd(), "docs/p2-sl-diy-selfhelp-all.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    join(process.cwd(), "docs/p2-sl-diy-selfhelp-all.md"),
    `# P2 — DIY/self-help on all Service × Location

- SL total: **${total}**
- EN bodies with DIY marker: **${enWith}** / **${enTotal}**
- AR bodies with DIY marker: **${arWith}** / **${arTotal}**
- Updated EN: ${updatedEn} · skipped EN: ${skippedEn}
- Updated AR: ${updatedAr} · skipped AR: ${skippedAr}
- Created missing i18n rows: ${createdI18n}
- Public covered published (unchanged): **${pubCovered}**

No coverage invented. No mass publish.
`,
  );

  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
  if (enWith < total || arWith < total) process.exitCode = 1;
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
