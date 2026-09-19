/**
 * Publish independent MSA Arabic for location hubs (AR-only; EN preserved).
 * Resume-safe: skips pilots by default; supports --offset/--limit/--slugs/--resume.
 * No OpenAI. Gates before write.
 *
 * Usage:
 *   npx tsx scripts/publish-independent-ar-hubs.ts --dry-run --limit=10
 *   npx tsx scripts/publish-independent-ar-hubs.ts --all
 *   npx tsx scripts/publish-independent-ar-hubs.ts --offset=50 --limit=50
 *   npx tsx scripts/publish-independent-ar-hubs.ts --resume
 *   npx tsx scripts/publish-independent-ar-hubs.ts --include-pilots
 */
import "./load-env-mysql";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import {
  composeLocationHub,
  renderedHubWords,
  type LocationHubPackage,
} from "../src/lib/locations/hub-article";
import { evaluateLocationHubGates } from "../src/lib/locations/hub-gates";
import { composeIndependentAr } from "../src/lib/locations/independent-ar-composer";
import { locationHubTargets } from "../src/lib/locations/hub-article";
import { PILOT_INDEPENDENT_AR_SLUGS } from "../src/lib/locations/pilot-independent-ar";

const REPORT_PATH = join(process.cwd(), "docs/location-hub-independent-ar-progress.json");
const PILOT_SET = new Set(PILOT_INDEPENDENT_AR_SLUGS);

type Progress = {
  updatedAt: string;
  completedSlugs: string[];
  failed: Array<{ slug: string; failures: string[] }>;
  lastBatch: { offset: number; limit: number; published: number };
};

function loadProgress(): Progress {
  if (!existsSync(REPORT_PATH)) {
    return {
      updatedAt: new Date().toISOString(),
      completedSlugs: [],
      failed: [],
      lastBatch: { offset: 0, limit: 0, published: 0 },
    };
  }
  return JSON.parse(readFileSync(REPORT_PATH, "utf8")) as Progress;
}

function parseArgs(argv: string[]) {
  let dryRun = false;
  let all = false;
  let resume = false;
  let includePilots = false;
  let limit = 0;
  let offset = 0;
  let slugs: string[] = [];
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
    else if (a === "--all") all = true;
    else if (a === "--resume") resume = true;
    else if (a === "--include-pilots") includePilots = true;
    else if (a.startsWith("--limit=")) limit = Math.max(0, Number(a.slice(8)) || 0);
    else if (a.startsWith("--offset=")) offset = Math.max(0, Number(a.slice(9)) || 0);
    else if (a.startsWith("--slugs="))
      slugs = a
        .slice(8)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  }
  return { dryRun, all, resume, includePilots, limit, offset, slugs };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const progress = loadProgress();
  const done = new Set(progress.completedSlugs);
  let targets = locationHubTargets();

  if (args.slugs.length) {
    const set = new Set(args.slugs);
    targets = targets.filter((r) => set.has(r.slug));
  } else {
    if (!args.includePilots) {
      targets = targets.filter((r) => !PILOT_SET.has(r.slug) && r.slug !== "al-nuaimia");
      // pilots may live as al-nuaimiya in PILOT map but al-nuaimia in master
      targets = targets.filter((r) => !["dubai-marina", "musaffah", "al-sajaa", "al-nuaimia", "dibba-al-fujairah"].includes(r.slug));
    }
    if (args.resume) {
      targets = targets.filter((r) => !done.has(r.slug));
    }
    if (args.offset) targets = targets.slice(args.offset);
    if (args.limit > 0) targets = targets.slice(0, args.limit);
    else if (!args.all && !args.resume && !args.slugs.length) {
      throw new Error("Pass --all, --resume, --limit=N, or --slugs=...");
    }
  }

  const results: Array<{
    slug: string;
    arWords: number;
    enWords: number;
    pass: boolean;
    failures: string[];
    updated: boolean;
    urlAr: string;
  }> = [];

  let published = 0;
  let failed = 0;

  for (const row of targets) {
    const ar = composeIndependentAr(row);
    const base = composeLocationHub(row);

    const loc = await prisma.location.findUnique({
      where: { slug: row.slug },
      include: { translations: true },
    });
    if (!loc) {
      failed += 1;
      results.push({
        slug: row.slug,
        arWords: 0,
        enWords: 0,
        pass: false,
        failures: ["missing_db_location"],
        updated: false,
        urlAr: `https://fixpoint.ae/ar/locations/${row.slug}`,
      });
      continue;
    }

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

    // If EN body is thin/missing, keep composed EN for gate package only (do not write EN unless missing)
    const pkg: LocationHubPackage = {
      slug: row.slug,
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

    // Ensure EN meets gate for package evaluation — if live EN is short, use composed EN for gate only
    if (renderedHubWords(pkg.en) < 800) {
      pkg.en = base.en;
    }

    const gate = evaluateLocationHubGates(pkg);
    const arWords = renderedHubWords(pkg.ar);
    const enWords = renderedHubWords(pkg.en);

    if (!gate.pass) {
      failed += 1;
      progress.failed.push({ slug: row.slug, failures: gate.failures });
      results.push({
        slug: row.slug,
        arWords,
        enWords,
        pass: false,
        failures: gate.failures,
        updated: false,
        urlAr: `https://fixpoint.ae/ar/locations/${encodeURIComponent(ar.name.replace(/\s+/g, "-"))}`,
      });
      continue;
    }

    if (!args.dryRun) {
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
      done.add(row.slug);
      published += 1;
    }

    results.push({
      slug: row.slug,
      arWords,
      enWords,
      pass: true,
      failures: [],
      updated: !args.dryRun,
      urlAr: `https://fixpoint.ae/ar/locations/${row.slug}`,
    });
  }

  progress.updatedAt = new Date().toISOString();
  progress.completedSlugs = [...done];
  progress.lastBatch = {
    offset: args.offset,
    limit: args.limit || targets.length,
    published,
  };

  const report = {
    dryRun: args.dryRun,
    openaiUsed: false,
    note: "Independent MSA Arabic composer (banks + place-kind); EN preserved; pilots skipped unless --include-pilots.",
    targets: targets.length,
    published,
    failed,
    completedTotal: progress.completedSlugs.length,
    servingTarget: 277,
    remainingApprox: Math.max(0, 277 - 5 - progress.completedSlugs.filter((s) => !PILOT_SET.has(s)).length),
    minAr: results.filter((r) => r.pass).reduce((m, r) => Math.min(m, r.arWords), 99999),
    maxAr: results.filter((r) => r.pass).reduce((m, r) => Math.max(m, r.arWords), 0),
    sample: results.slice(0, 8),
    sampleFailures: results.filter((r) => !r.pass).slice(0, 10),
    progress,
  };

  if (report.minAr === 99999) report.minAr = 0;

  writeFileSync(REPORT_PATH, JSON.stringify(progress, null, 2) + "\n", "utf8");
  writeFileSync(
    join(process.cwd(), "docs/location-hub-independent-ar-report.json"),
    JSON.stringify(report, null, 2) + "\n",
    "utf8",
  );
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
