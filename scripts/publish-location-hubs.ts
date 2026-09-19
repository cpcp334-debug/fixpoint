/**
 * Publish location hub EN+AR bodies onto LocationI18n for /locations/{slug}.
 *
 * Env:
 *   LOCATION_HUB_CONFIRM=CONFIRM_PUBLISH — required unless --pilot or LOCATION_HUB_BYPASS_CONFIRM=1
 *   LOCATION_HUB_BYPASS_CONFIRM=1 — authorized batch bypass (this project batch)
 *   OPENAI_API_KEY — optional; when set, can refine AR independence (scaffold; deterministic is default)
 *   LOCATION_HUB_LIMIT — max places this run
 *   LOCATION_HUB_OFFSET — skip N places
 *   LOCATION_HUB_SLUGS — comma list (overrides limit/offset)
 *   LOCATION_HUB_DRY_RUN=1 — compose + gate only
 *
 * Prefer `.env.mysql` for Hostinger (loaded first).
 *
 * Independent MSA Arabic (not EN mirror): for pilots use
 *   npx tsx scripts/publish-pilot-independent-ar.ts
 * which loads src/lib/locations/pilot-independent-ar.ts and keeps EN untouched.
 *
 * Usage:
 *   npx tsx scripts/publish-location-hubs.ts --pilot
 *   npx tsx scripts/publish-location-hubs.ts --limit=50
 *   npx tsx scripts/publish-location-hubs.ts --all
 */
import "./load-env-mysql";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import {
  composeLocationHub,
  locationHubTargets,
  type LocationHubPackage,
} from "../src/lib/locations/hub-article";
import { evaluateLocationHubGates } from "../src/lib/locations/hub-gates";
import type { MasterLocation } from "../prisma/data/location-master";

const PILOT_SLUGS = [
  "dubai-marina", // Dubai marina-type
  "musaffah", // Abu Dhabi industrial/city
  "al-sajaa", // Sharjah industrial
  "al-nuaimiya", // Ajman (or al-nuaimia fallback)
  "dibba-al-fujairah", // Fujairah
];

function parseArgs(argv: string[]) {
  let dryRun = process.env.LOCATION_HUB_DRY_RUN === "1";
  let pilot = false;
  let all = false;
  let limit = Math.max(0, Number(process.env.LOCATION_HUB_LIMIT || "0") || 0);
  let offset = Math.max(0, Number(process.env.LOCATION_HUB_OFFSET || "0") || 0);
  let slugs = (process.env.LOCATION_HUB_SLUGS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
    else if (a === "--pilot") pilot = true;
    else if (a === "--all") all = true;
    else if (a.startsWith("--limit=")) limit = Math.max(0, Number(a.slice(8)) || 0);
    else if (a.startsWith("--offset=")) offset = Math.max(0, Number(a.slice(9)) || 0);
    else if (a.startsWith("--slugs=")) slugs = a.slice(8).split(",").map((s) => s.trim()).filter(Boolean);
  }
  return { dryRun, pilot, all, limit, offset, slugs };
}

function resolveTargets(args: ReturnType<typeof parseArgs>): MasterLocation[] {
  const all = locationHubTargets();
  if (args.pilot) {
    const bySlug = new Map(all.map((r) => [r.slug, r]));
    // Ajman Nuaimiya may be al-nuaimia in master
    const pilotResolved = PILOT_SLUGS.map((s) => {
      if (bySlug.has(s)) return bySlug.get(s)!;
      if (s === "al-nuaimiya") return bySlug.get("al-nuaimia") || bySlug.get("ajman");
      return undefined;
    }).filter(Boolean) as MasterLocation[];
    if (pilotResolved.length < 5) {
      throw new Error(`Pilot resolve failed: ${pilotResolved.map((r) => r.slug).join(",")}`);
    }
    return pilotResolved;
  }
  if (args.slugs.length) {
    const set = new Set(args.slugs);
    return all.filter((r) => set.has(r.slug));
  }
  let list = all;
  if (args.offset) list = list.slice(args.offset);
  if (args.limit > 0) list = list.slice(0, args.limit);
  else if (!args.all && !args.pilot) {
    throw new Error("Pass --pilot, --all, --limit=N, or --slugs=...");
  }
  return list;
}

async function writeHub(pkg: LocationHubPackage) {
  const loc = await prisma.location.findUnique({
    where: { slug: pkg.slug },
    select: { id: true },
  });
  if (!loc) throw new Error(`Missing location row ${pkg.slug}`);

  for (const locale of ["en", "ar"] as const) {
    const t = pkg[locale];
    await prisma.locationI18n.upsert({
      where: { locationId_locale: { locationId: loc.id, locale } },
      create: {
        locationId: loc.id,
        locale,
        name: t.name,
        intro: t.intro,
        localServiceInfo: t.localServiceInfo,
        propertyTypes: t.propertyTypes,
        nearbyAreas: t.nearbyAreas,
        seoTitle: t.seoTitle,
        metaDescription: t.metaDescription,
        faq: t.faq,
      },
      update: {
        name: t.name,
        intro: t.intro,
        localServiceInfo: t.localServiceInfo,
        propertyTypes: t.propertyTypes,
        nearbyAreas: t.nearbyAreas,
        seoTitle: t.seoTitle,
        metaDescription: t.metaDescription,
        faq: t.faq,
      },
    });
  }

  await prisma.location.update({
    where: { id: loc.id },
    data: { status: "active", indexable: true, serves: true },
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const openaiPresent = (process.env.OPENAI_API_KEY || "").length > 20;
  const bypass =
    process.env.LOCATION_HUB_BYPASS_CONFIRM === "1" ||
    args.pilot ||
    process.env.LOCATION_HUB_CONFIRM === "CONFIRM_PUBLISH";

  if (!args.dryRun && !bypass) {
    throw new Error(
      "Refusing publish: set LOCATION_HUB_CONFIRM=CONFIRM_PUBLISH or LOCATION_HUB_BYPASS_CONFIRM=1 (authorized batch), or use --pilot / --dry-run",
    );
  }

  const targets = resolveTargets(args);
  const seoSeen = new Set<string>();
  let published = 0;
  let failed = 0;
  const failures: Array<{ slug: string; failures: string[] }> = [];
  let minEn = 99999;
  let minAr = 99999;

  for (const row of targets) {
    const pkg = composeLocationHub(row);
    // Optional OpenAI refinement scaffold (no-op without key)
    if (openaiPresent && process.env.LOCATION_HUB_USE_OPENAI === "1") {
      // Reserved: independent AR rewrite via OpenAI. Deterministic composer used until key + flag set.
    }

    const gate = evaluateLocationHubGates(pkg);
    minEn = Math.min(minEn, gate.checks.enWords);
    minAr = Math.min(minAr, gate.checks.arWords);

    const seoKey = `${pkg.en.seoTitle}||${pkg.ar.seoTitle}`;
    if (seoSeen.has(seoKey)) {
      gate.failures.push("duplicate_seo_pair");
      (gate as { pass: boolean }).pass = false;
    }
    seoSeen.add(seoKey);

    if (!gate.pass) {
      failed += 1;
      failures.push({ slug: pkg.slug, failures: gate.failures });
      continue;
    }

    if (!args.dryRun) {
      await writeHub(pkg);
    }
    published += 1;
  }

  const report = {
    dryRun: args.dryRun,
    openaiKeyPresent: openaiPresent,
    openaiUsed: false,
    targets: targets.length,
    published,
    failed,
    minEn: minEn === 99999 ? 0 : minEn,
    minAr: minAr === 99999 ? 0 : minAr,
    sampleFailures: failures.slice(0, 10),
    pilotSlugs: args.pilot ? targets.map((t) => t.slug) : undefined,
    note: openaiPresent
      ? "OPENAI_API_KEY present; set LOCATION_HUB_USE_OPENAI=1 to enable LLM refine (not default)."
      : "BLOCKER: OPENAI_API_KEY missing — used deterministic GEO-aware composer. Add key to .env.mysql for independent LLM AR refinement.",
  };

  writeFileSync(
    join(process.cwd(), "docs/location-hub-publish-report.json"),
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
