/**
 * Restore Latin primary slugs from scripts/_slug-maps.json (reverse of Phase 2 Arabic overwrite).
 * Policy: DB `slug` = English/Latin; Arabic URLs resolve via maps (locale-aware routing).
 *
 * Usage:
 *   npx tsx scripts/restore-latin-primary-slugs.ts --dry-run
 *   npx tsx scripts/restore-latin-primary-slugs.ts --entities=services,locations
 *   npx tsx scripts/restore-latin-primary-slugs.ts
 */
import "./load-env-mysql";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";

type SlugMaps = {
  serviceCategory?: Record<string, string>;
  service?: Record<string, string>;
  location?: Record<string, string>;
  diyCategory?: Record<string, string>;
  diyGuide?: Record<string, string>;
};

const MAP_PATH = join(process.cwd(), "scripts/_slug-maps.json");
const AR = /[\u0600-\u06FF]/;

function parseArgs(argv: string[]) {
  let dryRun = false;
  let entities = new Set(["serviceCategory", "service", "location", "diyCategory", "diyGuide"]);
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
    else if (a.startsWith("--entities=")) {
      entities = new Set(a.slice(11).split(",").map((s) => s.trim()).filter(Boolean));
    }
  }
  return { dryRun, entities };
}

function reverseMap(forward: Record<string, string> | undefined) {
  const rev: Record<string, string> = {};
  for (const [latin, ar] of Object.entries(forward || {})) {
    if (ar) rev[ar] = latin;
  }
  return rev;
}

function isArabicSlug(slug: string) {
  return AR.test(slug);
}

async function restoreTable(args: {
  name: string;
  dryRun: boolean;
  rev: Record<string, string>;
  list: () => Promise<Array<{ id: string; slug: string }>>;
  update: (id: string, slug: string) => Promise<unknown>;
  occupied: Set<string>;
}) {
  const rows = await args.list();
  let updated = 0;
  let skipped = 0;
  let missingMap = 0;
  const samples: Array<{ from: string; to: string }> = [];

  // Two-phase to avoid unique collisions: arabic → temp → latin
  const plan: Array<{ id: string; from: string; to: string; temp: string }> = [];
  for (const row of rows) {
    if (!isArabicSlug(row.slug)) {
      skipped += 1;
      continue;
    }
    const latin = args.rev[row.slug];
    if (!latin) {
      missingMap += 1;
      continue;
    }
    if (latin === row.slug) {
      skipped += 1;
      continue;
    }
    if (args.occupied.has(latin) && ![...plan].some((p) => p.from === latin)) {
      // latin already taken by another row that is already latin — skip
      const clash = rows.find((r) => r.slug === latin && r.id !== row.id);
      if (clash) {
        missingMap += 1;
        continue;
      }
    }
    plan.push({ id: row.id, from: row.slug, to: latin, temp: `__restore_${row.id}` });
  }

  if (!args.dryRun) {
    for (const step of plan) {
      await args.update(step.id, step.temp);
    }
    for (const step of plan) {
      await args.update(step.id, step.to);
      updated += 1;
      if (samples.length < 8) samples.push({ from: step.from, to: step.to });
    }
  } else {
    updated = plan.length;
    for (const step of plan.slice(0, 8)) samples.push({ from: step.from, to: step.to });
  }

  console.log(JSON.stringify({ entity: args.name, updated, skipped, missingMap, samples }, null, 2));
  return updated;
}

async function main() {
  const { dryRun, entities } = parseArgs(process.argv.slice(2));
  if (!existsSync(MAP_PATH)) throw new Error(`Missing ${MAP_PATH}`);
  const maps = JSON.parse(readFileSync(MAP_PATH, "utf8")) as SlugMaps;
  const revService = reverseMap(maps.service);
  const revLocation = reverseMap(maps.location);
  const revCat = reverseMap(maps.serviceCategory);
  const revDiyCat = reverseMap(maps.diyCategory);
  const revDiy = reverseMap(maps.diyGuide);

  console.log(JSON.stringify({ dryRun, revCounts: {
    service: Object.keys(revService).length,
    location: Object.keys(revLocation).length,
    serviceCategory: Object.keys(revCat).length,
    diyCategory: Object.keys(revDiyCat).length,
    diyGuide: Object.keys(revDiy).length,
  } }, null, 2));

  if (entities.has("serviceCategory")) {
    const rows = await prisma.serviceCategory.findMany({ select: { id: true, slug: true } });
    await restoreTable({
      name: "serviceCategory",
      dryRun,
      rev: revCat,
      list: async () => rows,
      occupied: new Set(rows.map((r) => r.slug)),
      update: (id, slug) => prisma.serviceCategory.update({ where: { id }, data: { slug } }),
    });
  }

  if (entities.has("service")) {
    const rows = await prisma.service.findMany({ select: { id: true, slug: true } });
    await restoreTable({
      name: "service",
      dryRun,
      rev: revService,
      list: async () => rows,
      occupied: new Set(rows.map((r) => r.slug)),
      update: (id, slug) => prisma.service.update({ where: { id }, data: { slug } }),
    });
  }

  if (entities.has("location")) {
    const rows = await prisma.location.findMany({ select: { id: true, slug: true } });
    await restoreTable({
      name: "location",
      dryRun,
      rev: revLocation,
      list: async () => rows,
      occupied: new Set(rows.map((r) => r.slug)),
      update: (id, slug) => prisma.location.update({ where: { id }, data: { slug } }),
    });
  }

  if (entities.has("diyCategory")) {
    const rows = await prisma.diyCategory.findMany({ select: { id: true, slug: true } });
    await restoreTable({
      name: "diyCategory",
      dryRun,
      rev: revDiyCat,
      list: async () => rows,
      occupied: new Set(rows.map((r) => r.slug)),
      update: (id, slug) => prisma.diyCategory.update({ where: { id }, data: { slug } }),
    });
  }

  if (entities.has("diyGuide")) {
    const rows = await prisma.diyGuide.findMany({ select: { id: true, slug: true } });
    await restoreTable({
      name: "diyGuide",
      dryRun,
      rev: revDiy,
      list: async () => rows,
      occupied: new Set(rows.map((r) => r.slug)),
      update: (id, slug) => prisma.diyGuide.update({ where: { id }, data: { slug } }),
    });
  }
}

main()
  .catch((e) => {
    console.error(String(e.message || e).slice(0, 800));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
