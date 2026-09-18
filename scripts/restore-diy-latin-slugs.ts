/**
 * Restore DIY guide primary slugs to Latin (`diy-{service}`) and rebuild
 * scripts/_slug-maps.json → diyGuide (latin → Arabic).
 *
 * Does NOT touch Service/Article primary slugs.
 *
 * Usage:
 *   npx tsx scripts/restore-diy-latin-slugs.ts --dry-run
 *   npx tsx scripts/restore-diy-latin-slugs.ts
 */
import "./load-env-mysql";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";

const MAP_PATH = join(process.cwd(), "scripts/_slug-maps.json");
const AR = /[\u0600-\u06FF]/;

type SlugMaps = {
  service?: Record<string, string>;
  diyGuide?: Record<string, string>;
  [k: string]: unknown;
};

function parseArgs(argv: string[]) {
  return { dryRun: argv.includes("--dry-run") };
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function reversePreferLatin(forward: Record<string, string>) {
  const rev: Record<string, string> = {};
  for (const [k, v] of Object.entries(forward)) {
    if (!v) continue;
    if (!AR.test(k)) rev[v] = k;
  }
  return rev;
}

async function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));
  if (!existsSync(MAP_PATH)) throw new Error(`Missing ${MAP_PATH}`);
  const maps = JSON.parse(readFileSync(MAP_PATH, "utf8")) as SlugMaps;
  const serviceForward = maps.service || {};
  const serviceRev: Record<string, string> = {};
  for (const [latin, ar] of Object.entries(serviceForward)) {
    if (ar) serviceRev[ar] = latin;
  }

  const diyExisting = maps.diyGuide || {};
  const diyRevLatin = reversePreferLatin(diyExisting);

  const services = await prisma.service.findMany({ select: { id: true, slug: true } });
  const serviceById = new Map(services.map((s) => [s.id, s.slug]));
  const occupied = new Set(
    (await prisma.diyGuide.findMany({ select: { slug: true } })).map((g) => g.slug),
  );

  const guides = await prisma.diyGuide.findMany({
    select: { id: true, slug: true, serviceId: true, relatedServiceSlugs: true },
  });

  const newDiyMap: Record<string, string> = {};
  // Keep existing clean latin→ar entries
  for (const [k, v] of Object.entries(diyExisting)) {
    if (!AR.test(k) && v) newDiyMap[k] = v;
  }

  let updated = 0;
  let relatedFixed = 0;
  let skipped = 0;
  const samples: Array<{ from: string; to: string }> = [];

  type Step = { id: string; from: string; to: string; relatedJson: string; arabicPublic: string };
  const plan: Step[] = [];

  for (const g of guides) {
    const relatedRaw = parseJsonArray(g.relatedServiceSlugs);
    const relatedLatin = relatedRaw.map((s) => (AR.test(s) ? serviceRev[s] || s : s)).filter(Boolean);
    const relatedChanged =
      relatedLatin.length !== relatedRaw.length || relatedLatin.some((s, i) => s !== relatedRaw[i]);

    let latinSlug = g.slug;
    const arabicPublic = AR.test(g.slug) ? g.slug : diyExisting[g.slug] || g.slug;

    if (AR.test(g.slug)) {
      const fromMap = diyRevLatin[g.slug];
      if (fromMap && !AR.test(fromMap)) {
        latinSlug = fromMap;
      } else {
        const svcSlug =
          (g.serviceId && serviceById.get(g.serviceId)) ||
          relatedLatin.find((s) => s && !AR.test(s)) ||
          "";
        const masterSvc = svcSlug && AR.test(svcSlug) ? serviceRev[svcSlug] || svcSlug : svcSlug;
        if (!masterSvc || AR.test(masterSvc)) {
          skipped += 1;
          continue;
        }
        latinSlug = masterSvc.startsWith("diy-") ? masterSvc : `diy-${masterSvc}`;
      }

      // Uniquify if needed
      if (occupied.has(latinSlug) && latinSlug !== g.slug) {
        let i = 2;
        while (occupied.has(`${latinSlug}-${i}`)) i += 1;
        latinSlug = `${latinSlug}-${i}`;
      }
    }

    newDiyMap[latinSlug] = arabicPublic;

    if (latinSlug === g.slug && !relatedChanged) {
      skipped += 1;
      continue;
    }

    plan.push({
      id: g.id,
      from: g.slug,
      to: latinSlug,
      relatedJson: JSON.stringify(relatedLatin),
      arabicPublic,
    });
  }

  if (!dryRun) {
    // Two-phase slug swap to avoid unique collisions
    for (const step of plan) {
      if (step.from !== step.to) {
        await prisma.diyGuide.update({
          where: { id: step.id },
          data: { slug: `__restore_diy_${step.id}` },
        });
      }
    }
    for (const step of plan) {
      await prisma.diyGuide.update({
        where: { id: step.id },
        data: {
          slug: step.to,
          relatedServiceSlugs: step.relatedJson,
        },
      });
      occupied.delete(step.from);
      occupied.add(step.to);
      updated += 1;
      if (step.relatedJson !== "[]") relatedFixed += 1;
      if (samples.length < 10) samples.push({ from: step.from, to: step.to });
    }

    maps.diyGuide = newDiyMap;
    writeFileSync(MAP_PATH, JSON.stringify(maps, null, 2) + "\n", "utf8");
  } else {
    updated = plan.length;
    for (const step of plan.slice(0, 10)) samples.push({ from: step.from, to: step.to });
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        planned: plan.length,
        updated,
        skipped,
        relatedFixed,
        diyMapSize: Object.keys(newDiyMap).length,
        samples,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(String(e?.message || e).slice(0, 800));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
