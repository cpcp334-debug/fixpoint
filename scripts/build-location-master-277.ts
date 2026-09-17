/**
 * Rebuild the UAE location master from the approved 277-location proposal.
 * File only. Does not touch the database.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type MasterLocation = {
  id: number;
  emirateSlug: string | null;
  parentCityMunicipality: string | null;
  locationName: string;
  type: "country" | "emirate" | "city" | "community" | "area";
  nameEn: string;
  nameAr: string;
  arabicSource: string;
  arabicConfidence: "HIGH" | "MEDIUM" | "REVIEW_REQUIRED";
  slug: string;
  source: string;
  sourceConfidence: string;
  reasonIfNotHigh: string | null;
  hierarchyStatus: string;
  existingSeed: boolean;
  appTypeMapping: string;
};

type MasterFile = {
  meta: Record<string, unknown>;
  locations: MasterLocation[];
};

const PROPOSED: Record<string, string[]> = {
  "abu-dhabi": [
    "Abu Dhabi",
    "Al Ain",
    "Al Dhannah",
    "Ghayathi",
    "Liwa",
    "Madinat Zayed",
    "Ruwais",
    "Sila",
    "Delma Island",
    "Al Mirfa",
    "Sir Bani Yas",
    "Al Wathba",
    "Al Shamkha",
    "Al Rahba",
    "Al Shahama",
    "Bani Yas",
    "Khalifa City",
    "Mohammed Bin Zayed City",
    "Musaffah",
    "Shakhbout City",
    "Al Bahia",
    "Al Falah",
    "Al Reef",
    "Saadiyat Island",
    "Yas Island",
    "Al Reem Island",
    "Al Raha",
    "Al Bandar",
    "Al Bateen",
    "Al Mushrif",
    "Al Khalidiyah",
    "Al Zahiyah",
    "Al Danah",
    "Al Markaziyah",
    "Al Manhal",
    "Al Nahyan",
    "Al Muroor",
    "Al Rawdah",
    "Zayed City",
  ],
  dubai: [
    "Dubai",
    "Deira",
    "Bur Dubai",
    "Downtown Dubai",
    "Business Bay",
    "Dubai Marina",
    "Jumeirah",
    "Umm Suqeim",
    "Al Barsha",
    "Al Quoz",
    "Al Safa",
    "Al Wasl",
    "Al Jaddaf",
    "Dubai Festival City",
    "Nad Al Sheba",
    "Meydan",
    "Ras Al Khor",
    "International City",
    "Dubai Silicon Oasis",
    "Dubai Production City",
    "Dubai Sports City",
    "Jumeirah Village Circle",
    "Jumeirah Village Triangle",
    "Arabian Ranches",
    "Arabian Ranches 2",
    "The Springs",
    "The Meadows",
    "The Lakes",
    "Emirates Hills",
    "Jumeirah Park",
    "Discovery Gardens",
    "The Gardens",
    "Al Furjan",
    "Dubai Investment Park",
    "Jebel Ali",
    "Jebel Ali Village",
    "Dubai South",
    "Expo City Dubai",
    "Dubai Hills Estate",
    "Town Square Dubai",
    "DAMAC Hills",
    "DAMAC Hills 2",
    "Mudon",
    "Remraam",
    "The Villa",
    "Liwan",
    "Warsan",
    "Nad Al Hamar",
    "Al Warqa",
    "Mirdif",
    "Al Khawaneej",
    "Al Mizhar",
    "Muhaisnah",
    "Al Twar",
    "Al Qusais",
    "Al Nahda Dubai",
    "Al Karama",
    "Oud Metha",
    "Al Garhoud",
    "Umm Ramool",
    "Al Rashidiya",
    "Al Bada'a",
    "Al Satwa",
    "City Walk",
    "Jumeirah 1",
    "Jumeirah 2",
    "Jumeirah 3",
    "Umm Suqeim 1",
    "Umm Suqeim 2",
    "Umm Suqeim 3",
    "Al Safa 1",
    "Al Safa 2",
    "Al Barsha 1",
    "Al Barsha 2",
    "Al Barsha 3",
    "Al Barsha South",
    "Barsha Heights",
    "Dubai Creek Harbour",
    "Dubai Islands",
    "Palm Jumeirah",
    "Jumeirah Beach Residence",
    "Jumeirah Lakes Towers",
    "Motor City",
    "Al Furjan West",
    "Dubai Maritime City",
  ],
  sharjah: [
    "Sharjah",
    "Al Majaz",
    "Al Nahda Sharjah",
    "Al Qasimia",
    "Al Yarmook",
    "Al Ghuwair",
    "Al Nabba",
    "Al Mujarrah",
    "Al Mareija",
    "Al Shuwaihean",
    "Bu Tina",
    "Al Jazzat",
    "Al Ghafia",
    "Al Ramla",
    "Al Noaf",
    "Al Juraina",
    "Muwaileh",
    "Muwaileh Commercial",
    "Al Taawun",
    "Al Khan",
    "Al Mamzar Sharjah",
    "Al Suyoh",
    "Al Rahmaniya",
    "Al Sajaa",
    "Al Gharayen",
    "Aljada",
    "Tilal City",
    "Maryam Island",
    "Al Zahia",
    "Nasma Residences",
    "Masaar",
    "University City",
    "Al Suyoh 1",
    "Al Suyoh 2",
    "Al Rahmaniya 1",
    "Al Rahmaniya 2",
    "Hay Al Gharayen",
    "Industrial Area 1",
    "Industrial Area 2",
    "Industrial Area 3",
    "Industrial Area 4",
    "Industrial Area 5",
    "Industrial Area 6",
    "Industrial Area 7",
    "Industrial Area 8",
    "Industrial Area 9",
    "Industrial Area 10",
    "Industrial Area 11",
    "Industrial Area 12",
    "Industrial Area 13",
    "Industrial Area 14",
    "Industrial Area 15",
    "Kalba",
    "Khor Fakkan",
    "Dibba Al-Hisn",
    "Al Madam",
    "Al Dhaid",
    "Maliha",
    "Al Batayeh",
    "Al Hamriyah",
    "Dhaid Industrial Area",
    "Khorfakkan Industrial Area",
  ],
  ajman: [
    "Ajman",
    "Al Nuaimiya",
    "Al Rashidiya",
    "Al Jurf",
    "Al Jurf Industrial",
    "Al Rawda",
    "Al Mowaihat",
    "Al Hamidiya",
    "Al Yasmeen",
    "Al Zahya",
    "Al Helio",
    "Emirates City",
    "Garden City",
    "Al Tallah",
    "Al Manama",
    "Masfout",
    "Nuaimiya 1",
    "Nuaimiya 2",
    "Nuaimiya 3",
    "Rashidiya 1",
    "Rashidiya 2",
    "Rashidiya 3",
    "Jurf 1",
    "Jurf 2",
    "Jurf Industrial 1",
    "Jurf Industrial 2",
    "Jurf Industrial 3",
    "Mowaihat 1",
    "Mowaihat 2",
    "Mowaihat 3",
    "Rawdha 1",
    "Rawdha 2",
    "Rawdha 3",
    "Hamidiya 1",
    "Hamidiya 2",
    "Hamidiya 3",
    "Helio 1",
    "Helio 2",
    "Tallah 1",
    "Tallah 2",
    "Mohammed Bin Zayed 1",
    "Mohammed Bin Zayed 2",
    "Nakheel 1",
    "Nakheel 2",
    "Rumaila 1",
    "Rumaila 2",
    "Rumaila 3",
    "Liwara 1",
    "Liwara 2",
    "Mushairif",
    "Safia",
    "Al Alia",
    "Al Amerah",
    "Al Bahya",
    "Al Raqayeb 1",
    "Al Raqayeb 2",
    "Al Zorah",
    "Al Muntaz 1",
    "Al Muntaz 2",
    "South Ajman",
  ],
  "umm-al-quwain": ["Umm Al Quwain", "Al Salamah", "Al Raas", "Al Haditha", "Al Ras", "Falaj Al Mualla"],
  "ras-al-khaimah": [
    "Ras Al Khaimah",
    "Al Nakheel",
    "Al Hamra Village",
    "Mina Al Arab",
    "Al Dhait",
    "Al Rams",
    "Khuzam",
    "Al Qusaidat",
    "Al Mamourah",
    "Al Jazirah Al Hamra",
    "Digdagga",
    "Sha'am",
    "Masafi",
  ],
  fujairah: [
    "Dibba Al-Fujairah",
    "Fujairah",
    "Al Aqah",
    "Al Badiyah",
    "Mirbah",
    "Qidfa",
    "Sakamkam",
    "Madhab",
    "Dadna",
    "Al Hayl",
    "Al Faseel",
    "Masafi Fujairah",
  ],
};

const EXPECTED: Record<string, number> = {
  "abu-dhabi": 39,
  dubai: 85,
  sharjah: 62,
  ajman: 60,
  "umm-al-quwain": 6,
  "ras-al-khaimah": 13,
  fujairah: 12,
};

/** Same place, different spelling or official district name. Do not use this to collapse numbered areas. */
const SLUG_ALIAS: Record<string, string> = {
  "abu-dhabi|Al Dhannah": "al-dhannah-city",
  "abu-dhabi|Sila": "al-sila",
  "abu-dhabi|Delma Island": "delma",
  "abu-dhabi|Al Mirfa": "al-marfa",
  "abu-dhabi|Al Wathba": "al-wathbah",
  "abu-dhabi|Al Shamkha": "al-shamkhah",
  "abu-dhabi|Al Rahba": "al-rahbah",
  "abu-dhabi|Al Shahama": "al-shahamah",
  "abu-dhabi|Mohammed Bin Zayed City": "mohamed-bin-zayed-city",
  "abu-dhabi|Al Bahia": "al-bahyah",
  "abu-dhabi|Saadiyat Island": "al-saadiyat-island",
  "dubai|Business Bay": "al-kalij-al-tejari-business-bay",
  "dubai|Jumeirah 1": "jumeirah-first",
  "dubai|Jumeirah 2": "jumeirah-second",
  "dubai|Jumeirah 3": "jumeirah-third",
  "dubai|Umm Suqeim 1": "umm-suqeim-first",
  "dubai|Al Barsha 1": "al-barsha-first",
  "dubai|Al Barsha 2": "al-barsha-second",
  "dubai|Al Bada'a": "al-bada",
  "dubai|Nad Al Hamar": "nad-al-hammar",
  "dubai|Emirates Hills": "al-thanyah-fifth-emirates-hills",
  "sharjah|Al Yarmook": "al-yarmook",
  "sharjah|Bu Tina": "bu-tina",
  "sharjah|Khor Fakkan": "khorfakkan",
  "sharjah|Industrial Area 5": "industrial-area-5",
  "sharjah|Muwaileh Commercial": "muwaileh-commercial-1",
  "ajman|Nuaimiya 1": "al-nuaimia",
  "ajman|Al Manama": "manama",
  "ajman|Rashidiya 1": "al-rashidiya-1",
  "ajman|Jurf 1": "al-jerf-1",
  "ajman|Rawdha 1": "al-rawda-1",
  "ajman|Mowaihat 1": "al-muwaihat-1",
  "ajman|Hamidiya 1": "al-hamidiya-1",
  "ajman|Jurf Industrial 1": "al-jerf-industrial-1",
  "ajman|Helio 1": "helio-1",
  "ajman|Tallah 1": "al-talla-1",
  "ajman|Mushairif": "meshairef",
  "ajman|Al Bahya": "al-bahia",
  "ras-al-khaimah|Al Rams": "rams",
  "ras-al-khaimah|Sha'am": "shaam",
  "ras-al-khaimah|Digdagga": "al-digdaga",
  "fujairah|Al Badiyah": "al-bidya",
  "fujairah|Dibba Al-Fujairah": "dibba-al-fujairah",
  "fujairah|Masafi Fujairah": "masafi-fujairah",
};

const EMIRATE_NAME: Record<string, string> = {
  "abu-dhabi": "Abu Dhabi",
  dubai: "Dubai",
  sharjah: "Sharjah",
  ajman: "Ajman",
  "umm-al-quwain": "Umm Al Quwain",
  "ras-al-khaimah": "Ras Al Khaimah",
  fujairah: "Fujairah",
};

function norm(value: string) {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(name: string) {
  return name
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function main() {
  for (const [slug, names] of Object.entries(PROPOSED)) {
    const expected = EXPECTED[slug];
    if (names.length !== expected) {
      throw new Error(`${slug} count ${names.length} !== ${expected}`);
    }
    const seen = new Set<string>();
    for (const name of names) {
      const key = norm(name);
      if (seen.has(key)) throw new Error(`duplicate name in ${slug}: ${name}`);
      seen.add(key);
    }
  }
  const proposedTotal = Object.values(PROPOSED).reduce((n, list) => n + list.length, 0);
  if (proposedTotal !== 277) throw new Error(`proposed total ${proposedTotal} !== 277`);

  const path = join(process.cwd(), "prisma/data/uae-location-master-200.json");
  const current = JSON.parse(readFileSync(path, "utf8")) as MasterFile;
  const bySlug = new Map(current.locations.map((row) => [row.slug, row]));
  const byEmirateName = new Map<string, MasterLocation>();
  for (const row of current.locations) {
    if (!row.emirateSlug && row.type !== "country") continue;
    if (row.emirateSlug) byEmirateName.set(`${row.emirateSlug}|${norm(row.nameEn)}`, row);
  }

  const used = new Set<string>();
  const next: MasterLocation[] = [];
  const country = current.locations.find((row) => row.slug === "uae");
  if (!country) throw new Error("missing uae");
  next.push(country);
  used.add("uae");

  const emirateFallback: MasterLocation = {
    id: 5,
    emirateSlug: "ajman",
    parentCityMunicipality: null,
    locationName: "Ajman",
    type: "emirate",
    nameEn: "Ajman",
    nameAr: "عجمان",
    arabicSource: "prisma/data/locations.ts",
    arabicConfidence: "HIGH",
    slug: "ajman",
    source: "locations.ts",
    sourceConfidence: "HIGH",
    reasonIfNotHigh: null,
    hierarchyStatus: "CONFIRMED",
    existingSeed: true,
    appTypeMapping: "emirate",
  };
  for (const slug of [
    "abu-dhabi",
    "dubai",
    "sharjah",
    "ajman",
    "umm-al-quwain",
    "ras-al-khaimah",
    "fujairah",
  ]) {
    const row = bySlug.get(slug) ?? (slug === "ajman" ? emirateFallback : undefined);
    if (!row || row.type !== "emirate") throw new Error(`missing emirate record ${slug}`);
    next.push({ ...row, parentCityMunicipality: null });
    used.add(slug);
  }

  let nextId = Math.max(...current.locations.map((row) => row.id)) + 1;
  const kept: string[] = [];
  const added: string[] = [];
  const renamed: Array<{ slug: string; from: string; to: string }> = [];

  function takeSlug(preferred: string, emirate: string) {
    if (!used.has(preferred) && !bySlug.has(preferred)) return preferred;
    const scoped = `${preferred}-${emirate}`;
    if (!used.has(scoped) && !bySlug.has(scoped)) return scoped;
    const extra = `${scoped}-2`;
    if (!used.has(extra)) return extra;
    throw new Error(`slug collision ${preferred} in ${emirate}`);
  }

  for (const [emirate, names] of Object.entries(PROPOSED)) {
    for (const name of names) {
      if (name === EMIRATE_NAME[emirate]) continue;
      const alias = SLUG_ALIAS[`${emirate}|${name}`];
      const exact = byEmirateName.get(`${emirate}|${norm(name)}`);
      const aliased = alias ? bySlug.get(alias) : undefined;
      const existing = aliased && aliased.emirateSlug === emirate ? aliased : exact;

      if (existing && !used.has(existing.slug)) {
        if (existing.nameEn !== name && existing.type !== "emirate") {
          renamed.push({ slug: existing.slug, from: existing.nameEn, to: name });
        }
        const copy: MasterLocation = {
          ...existing,
          nameEn: existing.type === "emirate" ? existing.nameEn : name,
          locationName: existing.type === "emirate" ? existing.locationName : name,
        };
        if (existing.type === "emirate") {
          copy.parentCityMunicipality = null;
        } else if (existing.type === "city") {
          copy.parentCityMunicipality = null;
        } else {
          const parentStillCity = next.some(
            (row) =>
              row.emirateSlug === emirate &&
              row.type === "city" &&
              row.nameEn === existing.parentCityMunicipality,
          );
          if (!parentStillCity) {
            copy.parentCityMunicipality = EMIRATE_NAME[emirate]!;
            copy.hierarchyStatus = "PARENT_EMIRATE";
          }
        }
        next.push(copy);
        used.add(existing.slug);
        kept.push(`${emirate}/${existing.slug}`);
        continue;
      }

      const slug = takeSlug(slugify(name), emirate);
      used.add(slug);
      next.push({
        id: nextId,
        emirateSlug: emirate,
        parentCityMunicipality: EMIRATE_NAME[emirate]!,
        locationName: name,
        type: "community",
        nameEn: name,
        nameAr: "REVIEW_REQUIRED",
        arabicSource: "none",
        arabicConfidence: "REVIEW_REQUIRED",
        slug,
        source: "final-proposed-uae-location-master-2026-09-11",
        sourceConfidence: "PROPOSED",
        reasonIfNotHigh: "Arabic not verified in this catalog update. Do not invent a translation.",
        hierarchyStatus: "PARENT_EMIRATE",
        existingSeed: false,
        appTypeMapping: "community",
      });
      nextId += 1;
      added.push(`${emirate}/${slug}`);
    }
  }

  // Ajman lists both Al Nuaimiya and Nuaimiya 1. They share one existing slug; keep the numbered row on that slug.
  const nuaimiya = next.find((row) => row.emirateSlug === "ajman" && row.nameEn === "Al Nuaimiya" && row.slug === "al-nuaimia");
  const nuaimiya1 = next.find((row) => row.emirateSlug === "ajman" && row.nameEn === "Nuaimiya 1");
  if (nuaimiya && nuaimiya1 && nuaimiya.slug === nuaimiya1.slug) {
    throw new Error("Ajman Nuaimiya alias collided; split the parent name onto a new slug");
  }

  const removed = current.locations
    .filter((row) => row.type !== "country" && !used.has(row.slug))
    .map((row) => row.slug);

  const counts = { country: 0, emirate: 0, city: 0, community: 0, area: 0 };
  const arabic = { arabicHigh: 0, arabicMedium: 0, arabicReviewRequired: 0 };
  for (const row of next) {
    counts[row.type] += 1;
    if (row.arabicConfidence === "HIGH") arabic.arabicHigh += 1;
    else if (row.arabicConfidence === "MEDIUM") arabic.arabicMedium += 1;
    else arabic.arabicReviewRequired += 1;
  }

  const byEmirate: Record<string, number> = {};
  for (const slug of Object.keys(PROPOSED)) {
    byEmirate[slug] = next.filter((row) => row.emirateSlug === slug).length;
  }

  const out: MasterFile = {
    meta: {
      ...(current.meta as object),
      title: "UAE Location Master (Final proposed catalog)",
      version: "2.0.0",
      updated: "2026-09-11",
      targetTotal: next.length,
      actualTotal: next.length,
      proposedEmirateLocations: 277,
      includesCountryRecord: true,
      databaseImport: "NOT_APPLIED",
      serviceLocationExpansion: "NOT_APPLIED",
      note: "277 proposed locations include the 7 emirates. United Arab Emirates remains a separate country record. Database rows were not deleted or imported.",
      breakdown: {
        ...counts,
        cityCommunityAreaSubtotal: counts.city + counts.community + counts.area,
      },
      breakdownByEmirate: byEmirate,
      arabicVerification: {
        nameEnFieldsPresent: next.length,
        nameArFieldsPresent: next.length,
        ...arabic,
        nameArLiteralReviewRequiredString: next.filter((row) => row.nameAr === "REVIEW_REQUIRED").length,
        note: "Existing official Arabic was kept when a proposed name matched an existing record. New names are REVIEW_REQUIRED. Mleiha is an alias of Maliha, not a second location. Al Saja'a is an alias of Al Sajaa.",
      },
      aliases: {
        Mleiha: "Maliha",
        "Al Saja'a": "Al Sajaa",
        "Al Saja": "Al Sajaa",
      },
      reconciliation: {
        kept: kept.length,
        added: added.length,
        renamedDisplay: renamed,
        removedFromMaster: removed,
      },
      validation: {
        totalRecords: next.length,
        uniqueSlugsExpected: next.length,
        existingEightPreserved: true,
        existingEightSlugs: [
          "uae",
          "dubai",
          "abu-dhabi",
          "sharjah",
          "ajman",
          "umm-al-quwain",
          "ras-al-khaimah",
          "fujairah",
        ],
      },
    },
    locations: next,
  };

  writeFileSync(path, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(
    JSON.stringify(
      {
        total: next.length,
        proposed: proposedTotal,
        counts,
        byEmirate,
        kept: kept.length,
        added: added.length,
        removed: removed.length,
        renamed: renamed.length,
      },
      null,
      2,
    ),
  );
}

main();
