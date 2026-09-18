/**
 * Phase 1 — backfill LocationI18n AR names (Latin/EN-in-AR → curated UAE Arabic).
 * Also patches prisma/data/uae-location-master-200.json when --patch-master.
 * Idempotent.
 *
 * Usage:
 *   npx tsx scripts/phase1-backfill-location-ar-names.ts --dry-run --limit=10
 *   npx tsx scripts/phase1-backfill-location-ar-names.ts --limit=50
 *   npx tsx scripts/phase1-backfill-location-ar-names.ts --patch-master
 */
import "./load-env-mysql";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";

const AR = /[\u0600-\u06FF]/;

type PlaceMap = Record<string, string>;

function loadPlaceMap(): PlaceMap {
  const path = join(process.cwd(), "prisma/data/uae-place-names-ar.json");
  return JSON.parse(readFileSync(path, "utf8")) as PlaceMap;
}

function needsArName(name: string | null | undefined) {
  if (!name) return true;
  if (name === "REVIEW_REQUIRED" || name.startsWith("REVIEW_REQUIRED")) return true;
  return !AR.test(name);
}

function parseArgs(argv: string[]) {
  let dryRun = false;
  let limit = 0;
  let patchMaster = false;
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
    else if (a === "--patch-master") patchMaster = true;
    else if (a.startsWith("--limit=")) limit = Math.max(0, Number(a.slice(8)) || 0);
  }
  return { dryRun, limit, patchMaster };
}

function introAr(nameAr: string) {
  return `${nameAr} سجل موقع في كتالوج النجاح الدائم · Fixpoint للتخطيط. هذا السجل لا يدّعي تغطية الخدمة أو الترخيص أو توفر الحجز.`;
}

async function main() {
  const { dryRun, limit, patchMaster } = parseArgs(process.argv.slice(2));
  const placeMap = loadPlaceMap();

  const rows = await prisma.location.findMany({
    include: { translations: true },
    orderBy: { slug: "asc" },
  });

  let candidates = rows.filter((row) => {
    const ar = row.translations.find((t) => t.locale === "ar");
    return needsArName(ar?.name);
  });
  if (limit > 0) candidates = candidates.slice(0, limit);

  const samples: Array<{ slug: string; from: string; to: string }> = [];
  const missing: string[] = [];
  let updated = 0;
  let skipped = 0;

  for (const row of candidates) {
    const ar = row.translations.find((t) => t.locale === "ar");
    const nameAr = placeMap[row.slug];
    if (!nameAr || !AR.test(nameAr)) {
      missing.push(row.slug);
      skipped += 1;
      continue;
    }
    samples.push({ slug: row.slug, from: ar?.name || "", to: nameAr });
    if (dryRun) {
      updated += 1;
      continue;
    }
    if (!ar) {
      await prisma.locationI18n.create({
        data: {
          locationId: row.id,
          locale: "ar",
          name: nameAr,
          intro: introAr(nameAr),
          seoTitle: `${nameAr} | النجاح الدائم · Fixpoint`.slice(0, 60),
          metaDescription: introAr(nameAr).slice(0, 155),
        },
      });
    } else {
      const patchIntro = !AR.test(ar.intro || "") || ar.intro.includes("REVIEW_REQUIRED") || !ar.intro.trim();
      await prisma.locationI18n.update({
        where: { locationId_locale: { locationId: row.id, locale: "ar" } },
        data: {
          name: nameAr,
          seoTitle: `${nameAr} | النجاح الدائم · Fixpoint`.slice(0, 60),
          ...(patchIntro
            ? {
                intro: introAr(nameAr),
                metaDescription: introAr(nameAr).slice(0, 155),
              }
            : {}),
        },
      });
    }
    updated += 1;
  }

  let masterPatched = 0;
  if (patchMaster && !dryRun) {
    const masterPath = join(process.cwd(), "prisma/data/uae-location-master-200.json");
    const master = JSON.parse(readFileSync(masterPath, "utf8")) as {
      locations: Array<{
        slug: string;
        nameAr: string;
        arabicConfidence: string;
        arabicSource: string;
        reasonIfNotHigh: string | null;
      }>;
      meta?: { arabicVerification?: Record<string, number> };
    };
    for (const loc of master.locations) {
      const nameAr = placeMap[loc.slug];
      if (!nameAr || !AR.test(nameAr)) continue;
      if (loc.nameAr === nameAr && loc.arabicConfidence !== "REVIEW_REQUIRED") continue;
      loc.nameAr = nameAr;
      loc.arabicConfidence = "MEDIUM";
      loc.arabicSource = "curated-phase1-uae-place-names-ar";
      loc.reasonIfNotHigh = "Curated MSA/local form; medium confidence pending municipal cross-check.";
      masterPatched += 1;
    }
    if (master.meta?.arabicVerification) {
      const arabic = master.locations.filter((l) => AR.test(l.nameAr) && l.nameAr !== "REVIEW_REQUIRED").length;
      const review = master.locations.filter((l) => l.nameAr === "REVIEW_REQUIRED" || !AR.test(l.nameAr)).length;
      master.meta.arabicVerification = {
        arabicHigh: master.meta.arabicVerification.arabicHigh ?? 0,
        arabicMedium: arabic,
        arabicReviewRequired: review,
      };
    }
    writeFileSync(masterPath, JSON.stringify(master, null, 2) + "\n", "utf8");
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        limit: limit || null,
        patchMaster,
        placeMapSize: Object.keys(placeMap).length,
        candidates: candidates.length,
        updated,
        skipped,
        missing,
        masterPatched,
        samples: samples.slice(0, 15),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
