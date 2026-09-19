/**
 * Publish agent-authored independent MSA Arabic for location-hub pilots.
 * Keeps existing EN LocationI18n rows untouched. Does NOT call OpenAI.
 *
 * Usage:
 *   npx tsx scripts/publish-pilot-independent-ar.ts
 *   npx tsx scripts/publish-pilot-independent-ar.ts --dry-run
 */
import "./load-env-mysql";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { PILOT_INDEPENDENT_AR } from "../src/lib/locations/pilot-independent-ar";
import {
  composeLocationHub,
  renderedHubWords,
  type LocationHubPackage,
} from "../src/lib/locations/hub-article";
import { evaluateLocationHubGates } from "../src/lib/locations/hub-gates";
import { loadLocationMaster } from "../prisma/data/location-master";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const master = loadLocationMaster();
  const results: Array<{
    slug: string;
    arWords: number;
    enWords: number;
    pass: boolean;
    failures: string[];
    url: string;
    updated: boolean;
  }> = [];

  for (const [slug, ar] of Object.entries(PILOT_INDEPENDENT_AR)) {
    const row = master.locations.find((l) => l.slug === slug);
    if (!row) throw new Error(`Missing master location ${slug}`);

    const base = composeLocationHub(row);
    // Prefer live EN from DB when present so we do not rewrite EN on gate package
    const loc = await prisma.location.findUnique({
      where: { slug },
      include: { translations: true },
    });
    if (!loc) throw new Error(`Missing DB location ${slug}`);

    const enDb = loc.translations.find((t) => t.locale === "en");
    const en = enDb
      ? {
          name: enDb.name,
          intro: enDb.intro,
          localServiceInfo: enDb.localServiceInfo,
          propertyTypes: enDb.propertyTypes,
          nearbyAreas: enDb.nearbyAreas,
          faq: enDb.faq,
          seoTitle: enDb.seoTitle,
          metaDescription: enDb.metaDescription,
          imageAlt: base.en.imageAlt,
        }
      : base.en;

    const pkg: LocationHubPackage = {
      slug,
      coverImage: base.coverImage,
      en,
      ar: {
        name: ar.name,
        intro: ar.intro,
        localServiceInfo: ar.localServiceInfo,
        propertyTypes: ar.propertyTypes,
        nearbyAreas: ar.nearbyAreas,
        faq: ar.faq,
        seoTitle: ar.seoTitle,
        metaDescription: ar.metaDescription,
        imageAlt: ar.imageAlt,
      },
    };

    const gate = evaluateLocationHubGates(pkg);
    const arWords = renderedHubWords(pkg.ar);
    const enWords = renderedHubWords(pkg.en);

    if (!gate.pass) {
      results.push({
        slug,
        arWords,
        enWords,
        pass: false,
        failures: gate.failures,
        url: `https://fixpoint.ae/ar/locations/${slug}`,
        updated: false,
      });
      continue;
    }

    if (!dryRun) {
      await prisma.locationI18n.upsert({
        where: { locationId_locale: { locationId: loc.id, locale: "ar" } },
        create: {
          locationId: loc.id,
          locale: "ar",
          name: ar.name,
          intro: ar.intro,
          localServiceInfo: ar.localServiceInfo,
          propertyTypes: ar.propertyTypes,
          nearbyAreas: ar.nearbyAreas,
          seoTitle: ar.seoTitle,
          metaDescription: ar.metaDescription,
          faq: ar.faq,
        },
        update: {
          name: ar.name,
          intro: ar.intro,
          localServiceInfo: ar.localServiceInfo,
          propertyTypes: ar.propertyTypes,
          nearbyAreas: ar.nearbyAreas,
          seoTitle: ar.seoTitle,
          metaDescription: ar.metaDescription,
          faq: ar.faq,
        },
      });
      await prisma.location.update({
        where: { id: loc.id },
        data: { status: "active", indexable: true, serves: true },
      });
    }

    results.push({
      slug,
      arWords,
      enWords,
      pass: true,
      failures: [],
      url: `https://fixpoint.ae/ar/locations/${slug}`,
      updated: !dryRun,
    });
  }

  const report = {
    dryRun,
    openaiUsed: false,
    note: "Agent-authored independent MSA Arabic pilots; EN preserved; OpenAI not called.",
    published: results.filter((r) => r.updated).length,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    results,
  };

  writeFileSync(
    join(process.cwd(), "docs/location-hub-pilot-independent-ar-report.json"),
    JSON.stringify(report, null, 2) + "\n",
    "utf8",
  );
  console.log(JSON.stringify(report, null, 2));
  if (report.failed) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
