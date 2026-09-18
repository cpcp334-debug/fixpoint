/**
 * Rebuild scripts/_slug-maps.json after a partial Phase 2 run that renamed
 * entities but died before saving maps. Matches current Arabic slugs to
 * legacy Latin keys via EN names + master/inventory files.
 *
 * Also finishes remaining DIY guide slug/categorySlug remaps.
 */
import "./load-env-mysql";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import {
  ensureUniqueSlug,
  isAlreadyArabicSlug,
  remapJsonSlugArray,
  toArabicSlug,
} from "../src/lib/slug/arabic-slug";

type SlugMaps = {
  serviceCategory: Record<string, string>;
  service: Record<string, string>;
  location: Record<string, string>;
  diyCategory: Record<string, string>;
  diyGuide: Record<string, string>;
};

const AR = /[\u0600-\u06FF]/;
const MAP_PATH = join(process.cwd(), "scripts/_slug-maps.json");

function slugifyLatin(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const maps: SlugMaps = {
    serviceCategory: {},
    service: {},
    location: {},
    diyCategory: {},
    diyGuide: {},
  };

  // --- Categories: invert known AR names from current DB + CATEGORY list ---
  const catArToLatin: Record<string, string> = {
    التكييف: "ac",
    الأجهزة: "appliances",
    "الحمامات-والمطابخ": "bath-kitchen",
    "مواقد-وأفران-الغاز": "burner-cooker",
    النجارة: "carpentry",
    التنظيف: "cleaning",
    "غسالة-الصحون": "dishwasher",
    الكهرباء: "electrical",
    "الأرضيات-والبلاط": "flooring",
    "الصيانة-العامة-للمباني": "general-maintenance",
    "الصالات-الرياضية": "gym",
    المايكروويف: "microwave",
    "الأبواب-والنوافذ": "openings",
    الأفران: "oven",
    الدهان: "painting",
    السباكة: "plumbing",
    "الوقائية-والطوارئ": "preventive",
    الثلاجات: "refrigerator",
    "الأسطح-والواجهات": "roof-exterior",
    الساونا: "sauna",
    "منشآت-متخصصة": "specialist",
    المسابح: "swimming-pool",
    الجدران: "walls",
    "غسالات-الملابس": "washing-machine",
    "سخانات-المياه": "water-heater",
    "خزانات-المياه": "water-tank",
    "العزل-المائي": "waterproofing",
  };

  const serviceCats = await prisma.serviceCategory.findMany({
    include: { translations: true },
  });
  for (const c of serviceCats) {
    const latin = catArToLatin[c.slug] || slugifyLatin(c.translations.find((t) => t.locale === "en")?.name || c.slug);
    maps.serviceCategory[latin] = c.slug;
  }

  const diyCats = await prisma.diyCategory.findMany({ include: { translations: true } });
  for (const c of diyCats) {
    const latin = catArToLatin[c.slug] || Object.entries(maps.serviceCategory).find(([, v]) => v === c.slug)?.[0] || slugifyLatin(c.translations.find((t) => t.locale === "en")?.name || c.slug);
    maps.diyCategory[latin] = c.slug;
  }

  // --- Services: inventory has old Latin slugs + EN names ---
  const invPath = join(process.cwd(), "scripts/_tmp-phase1-inventory.json");
  const inv = existsSync(invPath)
    ? (JSON.parse(readFileSync(invPath, "utf8")) as {
        reviewServices: Array<{ slug: string; en?: string }>;
      })
    : { reviewServices: [] };

  const services = await prisma.service.findMany({
    include: { translations: true, category: true },
  });
  const byEn = new Map<string, (typeof services)[number]>();
  for (const s of services) {
    const en = s.translations.find((t) => t.locale === "en")?.name?.trim().toLowerCase();
    if (en) byEn.set(en, s);
  }

  // All services from DB — also fetch ones that weren't in review inventory
  const allOldCandidates = new Map<string, string>(); // latin → en
  for (const r of inv.reviewServices || []) {
    allOldCandidates.set(r.slug, (r.en || "").toLowerCase());
  }
  // Parents that already had AR names — reconstruct from EN
  for (const s of services) {
    const en = s.translations.find((t) => t.locale === "en")?.name || "";
    const guess = slugifyLatin(en);
    if (guess && !allOldCandidates.has(guess)) allOldCandidates.set(guess, en.toLowerCase());
  }

  let svcMapped = 0;
  let svcMiss = 0;
  const svcMissing: string[] = [];
  for (const [latin, en] of allOldCandidates) {
    let row = en ? byEn.get(en) : undefined;
    if (!row) {
      // try match by Arabic slug uniqueness of toArabicSlug from current AR name — already renamed
      // fallback: if a service slug equals maps target for this latin via AR name builder — skip
      row = services.find((s) => {
        const enName = s.translations.find((t) => t.locale === "en")?.name || "";
        return slugifyLatin(enName) === latin;
      });
    }
    if (!row) {
      svcMiss += 1;
      if (svcMissing.length < 20) svcMissing.push(latin);
      continue;
    }
    maps.service[latin] = row.slug;
    svcMapped += 1;
  }
  // Ensure every current service has at least identity or reverse entry
  for (const s of services) {
    const en = s.translations.find((t) => t.locale === "en")?.name || "";
    const latin = slugifyLatin(en);
    if (latin && !Object.values(maps.service).includes(s.slug)) {
      maps.service[latin] = s.slug;
      svcMapped += 1;
    }
  }

  // --- Locations: master JSON still has Latin slugs + nameEn/nameAr ---
  const master = JSON.parse(readFileSync(join(process.cwd(), "prisma/data/uae-location-master-200.json"), "utf8")) as {
    locations: Array<{ slug: string; nameEn: string; nameAr: string }>;
  };
  const locations = await prisma.location.findMany({ include: { translations: true } });
  const locByAr = new Map<string, (typeof locations)[number]>();
  const locByEn = new Map<string, (typeof locations)[number]>();
  for (const l of locations) {
    const ar = l.translations.find((t) => t.locale === "ar")?.name?.trim();
    const en = l.translations.find((t) => t.locale === "en")?.name?.trim().toLowerCase();
    if (ar) locByAr.set(ar, l);
    if (en) locByEn.set(en, l);
  }
  let locMapped = 0;
  let locMiss = 0;
  for (const m of master.locations) {
    const row =
      (m.nameAr && AR.test(m.nameAr) ? locByAr.get(m.nameAr) : undefined) ||
      locByEn.get(m.nameEn.toLowerCase()) ||
      locations.find((l) => l.slug === m.slug);
    if (!row) {
      locMiss += 1;
      continue;
    }
    maps.location[m.slug] = row.slug;
    locMapped += 1;
  }

  // --- Finish DIY guides ---
  const guides = await prisma.diyGuide.findMany({
    include: {
      translations: { where: { locale: "ar" }, select: { title: true } },
      service: { select: { slug: true } },
    },
  });
  const taken = new Set(guides.map((g) => g.slug).filter(isAlreadyArabicSlug));
  let diyUpdated = 0;
  for (const g of guides) {
    const oldSlug = g.slug;
    const newCat = maps.diyCategory[g.categorySlug] || (isAlreadyArabicSlug(g.categorySlug) ? g.categorySlug : g.categorySlug);
    // Resolve category: if still latin key
    const resolvedCat =
      maps.diyCategory[g.categorySlug] ||
      (isAlreadyArabicSlug(g.categorySlug) ? g.categorySlug : Object.values(maps.diyCategory).find((x) => x === g.categorySlug) || g.categorySlug);

    let nextSlug = g.slug;
    if (!isAlreadyArabicSlug(g.slug)) {
      const title = g.translations[0]?.title;
      const desired =
        title && AR.test(title)
          ? toArabicSlug(title)
          : g.service?.slug
            ? toArabicSlug(`diy-${g.service.slug}`)
            : toArabicSlug(`diy-${g.slug}`);
      nextSlug = ensureUniqueSlug(desired, taken, "diy");
    } else {
      taken.add(g.slug);
    }

    // Remap related JSON using service/location maps
    // relatedServiceSlugs may still hold LATIN keys
    const related = remapJsonSlugArray(g.relatedServiceSlugs, maps.service);
    const locs = remapJsonSlugArray(g.locationSlugs, maps.location);

    maps.diyGuide[oldSlug] = nextSlug;
    // also map if old was already arabic
    if (isAlreadyArabicSlug(oldSlug)) maps.diyGuide[oldSlug] = oldSlug;

    if (!dryRun && (nextSlug !== g.slug || resolvedCat !== g.categorySlug || related !== g.relatedServiceSlugs || locs !== g.locationSlugs)) {
      await prisma.diyGuide.update({
        where: { id: g.id },
        data: {
          slug: nextSlug,
          categorySlug: resolvedCat,
          relatedServiceSlugs: related,
          locationSlugs: locs,
        },
      });
      diyUpdated += 1;
    }
  }

  if (!dryRun) writeFileSync(MAP_PATH, JSON.stringify(maps, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        dryRun,
        mapCounts: {
          serviceCategory: Object.keys(maps.serviceCategory).length,
          service: Object.keys(maps.service).length,
          location: Object.keys(maps.location).length,
          diyCategory: Object.keys(maps.diyCategory).length,
          diyGuide: Object.keys(maps.diyGuide).length,
        },
        svcMapped,
        svcMiss,
        svcMissing,
        locMapped,
        locMiss,
        diyUpdated,
        samples: {
          service: Object.entries(maps.service).slice(0, 5),
          location: Object.entries(maps.location).slice(0, 5),
          diyCategory: Object.entries(maps.diyCategory).slice(0, 5),
        },
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
