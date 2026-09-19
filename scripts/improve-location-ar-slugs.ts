/**
 * Improve Arabic location slugs in scripts/_slug-maps.json.
 * Source: AR_NAME_OVERRIDES + master nameAr + AR_SLUG_DISAMBIGUATION.
 * DB primary Latin slug unchanged. No 301s.
 *
 * Usage:
 *   npx tsx scripts/improve-location-ar-slugs.ts --dry-run
 *   npx tsx scripts/improve-location-ar-slugs.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadLocationMaster } from "../prisma/data/location-master";
import { toArabicSlug, ensureUniqueSlug } from "../src/lib/slug/arabic-slug";
import {
  AR_NAME_OVERRIDES,
  AR_SLUG_DISAMBIGUATION,
} from "../src/lib/locations/ar-content-banks";
import { displayNameAr } from "../src/lib/locations/independent-ar-composer";

const MAP_PATH = join(process.cwd(), "scripts/_slug-maps.json");

const EMIRATE_HINT: Record<string, string> = {
  "abu-dhabi": "أبوظبي",
  dubai: "دبي",
  sharjah: "الشارقة",
  ajman: "عجمان",
  "umm-al-quwain": "أم-القيوين",
  "ras-al-khaimah": "رأس-الخيمة",
  fujairah: "الفجيرة",
};

function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!existsSync(MAP_PATH)) throw new Error("missing _slug-maps.json");
  const maps = JSON.parse(readFileSync(MAP_PATH, "utf8")) as {
    location?: Record<string, string>;
    [k: string]: unknown;
  };
  const location = { ...(maps.location || {}) };
  const master = loadLocationMaster();
  const taken = new Set<string>();
  const changes: Array<{ slug: string; from: string; to: string; nameAr: string }> = [];

  for (const pref of Object.values(AR_SLUG_DISAMBIGUATION)) {
    taken.add(pref);
  }

  for (const row of master.locations) {
    if (row.slug === "uae") {
      const uae = "دولة-الإمارات-العربية-المتحدة";
      if (location.uae !== uae) {
        changes.push({ slug: "uae", from: location.uae || "", to: uae, nameAr: "دولة الإمارات العربية المتحدة" });
      }
      location.uae = uae;
      taken.add(uae);
      continue;
    }

    const display = AR_NAME_OVERRIDES[row.slug] || displayNameAr(row);
    let final: string;
    if (AR_SLUG_DISAMBIGUATION[row.slug]) {
      final = AR_SLUG_DISAMBIGUATION[row.slug]!;
      taken.add(final);
    } else {
      const desired = toArabicSlug(display);
      if (location[row.slug] === desired && !taken.has(desired)) {
        final = desired;
        taken.add(final);
      } else if (location[row.slug] === desired) {
        final = desired;
      } else {
        final = ensureUniqueSlug(
          desired,
          taken,
          EMIRATE_HINT[row.emirateSlug || (row.type === "emirate" ? row.slug : "")],
        );
      }
    }

    const prev = location[row.slug];
    if (prev !== final) {
      changes.push({ slug: row.slug, from: prev || "", to: final, nameAr: display });
    }
    location[row.slug] = final;
  }

  const report = {
    dryRun,
    total: Object.keys(location).length,
    changed: changes.length,
    samples: changes.slice(0, 30),
    overridesApplied: Object.keys(AR_NAME_OVERRIDES).map((k) => ({
      latin: k,
      ar: location[k],
      name: AR_NAME_OVERRIDES[k],
    })),
  };

  if (!dryRun) {
    maps.location = location;
    writeFileSync(MAP_PATH, JSON.stringify(maps, null, 2) + "\n", "utf8");
  }

  writeFileSync(
    join(process.cwd(), "docs/location-ar-slug-improve-report.json"),
    JSON.stringify(report, null, 2) + "\n",
    "utf8",
  );
  console.log(JSON.stringify(report, null, 2));
}

main();
