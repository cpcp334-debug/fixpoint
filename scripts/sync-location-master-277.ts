/**
 * Phase 1 — Fast sync Hostinger Location rows to the 277 UAE master.
 *
 * - Restores Latin primary slugs for Arabic-orphan rows (keeps IDs)
 * - Bulk-activates the 277 serving places
 * - Creates any truly missing master slugs
 * - Patches scripts/_slug-maps.json location AR forms
 * - Does NOT expand ServiceLocation; does NOT rewrite existing hub copy
 *
 * Usage:
 *   npx tsx scripts/sync-location-master-277.ts --dry-run
 *   npx tsx scripts/sync-location-master-277.ts
 */
import "./load-env-mysql";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LocationStatus, LocationType, PrismaClient } from "@prisma/client";
import {
  appLocationType,
  loadLocationMaster,
  resolveParentCityName,
  validateLocationMaster,
  type MasterLocation,
} from "../prisma/data/location-master";

const prisma = new PrismaClient();
const MAP_PATH = join(process.cwd(), "scripts/_slug-maps.json");
const AR = /[\u0600-\u06FF]/;

const ARABIC_TO_LATIN: Record<string, string> = {
  "مدينة-زايد": "madinat-zayed",
  "الزاهية-أبوظبي": "al-zahiyah",
  "الروضة-أبوظبي": "al-rawdah",
  النهضة: "al-nahda-dubai",
  "الراشدية-دبي": "al-rashidiya-dubai",
  الزاهية: "al-zahia",
  الراس: "al-raas",
  "مسافي-رأس-الخيمة": "masafi-rak",
};

const LATIN_TO_AR_FIX: Record<string, string> = {
  "madinat-zayed": "مدينة-زايد",
  "al-zahiyah": "الزاهية-أبوظبي",
  "al-rawdah": "الروضة-أبوظبي",
  "al-nahda-dubai": "النهضة-دبي",
  "al-rashidiya-dubai": "الراشدية-دبي",
  "al-zahia": "الزاهية-الشارقة",
  "al-raas": "الراس-أم-القيوين",
  "al-ras-umm-al-quwain": "الراس-أم-القيوين-2",
  "masafi-rak": "مسافي-رأس-الخيمة",
  "masafi-fujairah": "مسافي-الفجيرة",
};

function meta(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= 155 ? clean : `${clean.slice(0, 152)}...`;
}

function introFor(loc: MasterLocation, locale: "en" | "ar") {
  if (locale === "en") {
    return `${loc.nameEn} is a Fixpoint catalog place in the United Arab Emirates for planning cleaning and building maintenance requests.`;
  }
  const name = loc.nameAr === "REVIEW_REQUIRED" || !AR.test(loc.nameAr) ? loc.nameEn : loc.nameAr;
  return `${name} مكان في كتالوج فكس بوينت داخل الإمارات العربية المتحدة لتخطيط طلبات التنظيف وصيانة المباني.`;
}

function arSlugFromName(nameAr: string, latin: string) {
  const base = nameAr
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || latin;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const master = loadLocationMaster();
  const validation = validateLocationMaster(master);
  if (!validation.ok) {
    console.error("Master validation FAILED", validation.errors);
    process.exit(1);
  }

  const before = await prisma.location.findMany({
    select: { id: true, slug: true, status: true, indexable: true, type: true, parentId: true },
  });
  const beforeBySlug = new Map(before.map((r) => [r.slug, r]));
  const beforeSl = await prisma.serviceLocation.count();
  const masterSlugs = master.locations.map((l) => l.slug);
  const servingSlugs = master.locations.filter((l) => l.type !== "country").map((l) => l.slug);

  const beforeInMaster = before.filter((r) => masterSlugs.includes(r.slug)).length;
  const beforeActiveServing = before.filter(
    (r) => servingSlugs.includes(r.slug) && r.status === "active" && r.indexable,
  ).length;
  const beforeArabicPrimary = before.filter((r) => AR.test(r.slug)).length;

  const renames: Array<{ id: string; from: string; to: string }> = [];
  for (const row of before) {
    if (!AR.test(row.slug)) continue;
    const latin = ARABIC_TO_LATIN[row.slug];
    if (!latin) {
      console.warn(`Unmapped Arabic location slug: ${row.slug}`);
      continue;
    }
    if (beforeBySlug.has(latin) && beforeBySlug.get(latin)!.id !== row.id) {
      throw new Error(`Cannot rename ${row.slug} → ${latin}: latin slug already occupied`);
    }
    renames.push({ id: row.id, from: row.slug, to: latin });
  }

  if (!dryRun && renames.length) {
    for (const step of renames) {
      await prisma.location.update({ where: { id: step.id }, data: { slug: `__sync_${step.id}` } });
    }
    for (const step of renames) {
      await prisma.location.update({ where: { id: step.id }, data: { slug: step.to } });
    }
  }

  const rows = dryRun
    ? before.map((r) => {
        const hit = renames.find((x) => x.id === r.id);
        return hit ? { ...r, slug: hit.to } : r;
      })
    : await prisma.location.findMany({
        select: { id: true, slug: true, status: true, indexable: true, type: true, parentId: true },
      });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  const uae = bySlug.get("uae");
  if (!uae) throw new Error("Missing UAE country row");

  let created = 0;
  const missingMaster = master.locations.filter((l) => !bySlug.has(l.slug));

  // Build parent resolution helpers from master + current DB
  const cities = master.locations.filter((l) => l.type === "city");

  async function createOne(loc: MasterLocation, parentId: string) {
    created += 1;
    if (dryRun) return;
    const type = appLocationType(loc.type) as LocationType;
    const row = await prisma.location.create({
      data: {
        slug: loc.slug,
        type,
        parentId,
        status: LocationStatus.active,
        serves: true,
        indexable: loc.type !== "country",
        sortOrder: loc.id,
      },
    });
    const arName = loc.nameAr === "REVIEW_REQUIRED" ? loc.nameEn : loc.nameAr;
    await prisma.locationI18n.createMany({
      data: [
        {
          locationId: row.id,
          locale: "en",
          name: loc.nameEn,
          intro: introFor(loc, "en"),
          seoTitle: `${loc.nameEn} | Al Najah Al Daem · Fixpoint`.slice(0, 70),
          metaDescription: meta(introFor(loc, "en")),
        },
        {
          locationId: row.id,
          locale: "ar",
          name: arName,
          intro: introFor(loc, "ar"),
          seoTitle: `${arName} | النجاح الدائم · فكس بوينت`.slice(0, 70),
          metaDescription: meta(introFor(loc, "ar")),
        },
      ],
    });
    bySlug.set(loc.slug, {
      id: row.id,
      slug: row.slug,
      status: row.status,
      indexable: row.indexable,
      type: row.type,
      parentId: row.parentId,
    });
  }

  // Create missing in hierarchy order: emirates → cities → communities
  for (const em of missingMaster.filter((l) => l.type === "emirate")) {
    await createOne(em, uae.id);
  }
  for (const city of missingMaster.filter((l) => l.type === "city")) {
    const em = bySlug.get(city.emirateSlug!);
    if (!em) throw new Error(`Missing emirate for city ${city.slug}`);
    await createOne(city, em.id);
  }
  for (const community of missingMaster.filter((l) => l.type === "community" || l.type === "area")) {
    const parentName = resolveParentCityName(community.parentCityMunicipality);
    const emirate = bySlug.get(community.emirateSlug!);
    if (!emirate) throw new Error(`Missing emirate for ${community.slug}`);
    const emirateMaster = master.locations.find((row) => row.slug === community.emirateSlug);
    let parentId = emirate.id;
    if (emirateMaster?.nameEn !== parentName) {
      const parentCity = cities.find((c) => c.emirateSlug === community.emirateSlug && c.nameEn === parentName);
      const parentRow = parentCity ? bySlug.get(parentCity.slug) : undefined;
      if (parentRow) parentId = parentRow.id;
    }
    await createOne(community, parentId);
  }

  if (!dryRun) {
    // Bulk activate serving master places (chunk to avoid huge IN lists on some hosts)
    const chunk = 80;
    for (let i = 0; i < servingSlugs.length; i += chunk) {
      const slice = servingSlugs.slice(i, i + chunk);
      await prisma.location.updateMany({
        where: { slug: { in: slice } },
        data: { status: LocationStatus.active, indexable: true, serves: true },
      });
    }
    await prisma.location.updateMany({
      where: { slug: "uae" },
      data: { status: LocationStatus.active, indexable: false, serves: true },
    });
  }

  let mapPatched = 0;
  if (existsSync(MAP_PATH)) {
    const maps = JSON.parse(readFileSync(MAP_PATH, "utf8")) as { location?: Record<string, string> };
    const location = { ...(maps.location || {}) };
    const taken = new Set(Object.values(location).filter((v) => AR.test(v)));

    for (const [latin, ar] of Object.entries(LATIN_TO_AR_FIX)) {
      if (location[latin] === ar) continue;
      // free AR target from other latin keys
      for (const [k, v] of Object.entries(location)) {
        if (v === ar && k !== latin) delete location[k];
      }
      location[latin] = ar;
      taken.add(ar);
      mapPatched += 1;
    }

    for (const loc of master.locations) {
      if (location[loc.slug] && AR.test(location[loc.slug])) continue;
      let candidate =
        LATIN_TO_AR_FIX[loc.slug] ||
        (loc.nameAr && loc.nameAr !== "REVIEW_REQUIRED" ? arSlugFromName(loc.nameAr, loc.slug) : loc.slug);
      if (taken.has(candidate) && location[loc.slug] !== candidate) {
        candidate = `${candidate}-${loc.emirateSlug || "uae"}`;
      }
      location[loc.slug] = candidate;
      taken.add(candidate);
      mapPatched += 1;
    }

    // Restore any latin keys we deleted while freeing AR targets
    for (const loc of master.locations) {
      if (location[loc.slug] && AR.test(location[loc.slug])) continue;
      let candidate =
        LATIN_TO_AR_FIX[loc.slug] ||
        (loc.nameAr && loc.nameAr !== "REVIEW_REQUIRED" ? arSlugFromName(loc.nameAr, loc.slug) : `${loc.slug}-ar`);
      while (taken.has(candidate) && location[loc.slug] !== candidate) {
        candidate = `${candidate}-2`;
      }
      location[loc.slug] = candidate;
      taken.add(candidate);
      mapPatched += 1;
    }

    if (!dryRun) {
      maps.location = location;
      writeFileSync(MAP_PATH, JSON.stringify(maps, null, 2) + "\n", "utf8");
    }
  }

  const after = dryRun
    ? [...bySlug.values()]
    : await prisma.location.findMany({
        select: { id: true, slug: true, status: true, indexable: true, type: true },
      });
  const afterSl = await prisma.serviceLocation.count();
  if (afterSl !== beforeSl) {
    throw new Error(`ServiceLocation count changed: ${beforeSl} → ${afterSl}`);
  }

  const afterInMaster = after.filter((r) => masterSlugs.includes(r.slug)).length;
  const afterActiveServing = after.filter(
    (r) => servingSlugs.includes(r.slug) && r.status === "active" && r.indexable,
  ).length;
  const missing = masterSlugs.filter((s) => !after.some((r) => r.slug === s));
  const leftoverArabic = after.filter((r) => AR.test(r.slug));
  const leftoverOutside = after.filter((r) => !masterSlugs.includes(r.slug));

  console.log(
    JSON.stringify(
      {
        dryRun,
        before: {
          dbTotal: before.length,
          inMaster: beforeInMaster,
          activeServing: beforeActiveServing,
          arabicPrimary: beforeArabicPrimary,
        },
        after: {
          dbTotal: after.length,
          inMaster: afterInMaster,
          activeServing: afterActiveServing,
          created,
          renames: renames.length,
          renameSamples: renames,
          missingCount: missing.length,
          missing,
          leftoverArabic: leftoverArabic.map((r) => r.slug),
          leftoverOutsideMaster: leftoverOutside.length,
          leftoverOutsideSample: leftoverOutside.slice(0, 8).map((r) => r.slug),
          mapPatched,
          serviceLocationCount: afterSl,
          servingTarget: servingSlugs.length,
        },
      },
      null,
      2,
    ),
  );

  if (!dryRun && (missing.length || leftoverArabic.length || afterActiveServing !== servingSlugs.length)) {
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
