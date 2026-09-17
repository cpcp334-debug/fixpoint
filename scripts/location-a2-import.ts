/**
 * Phase A2 — additive location catalog import.
 * Preserves existing UAE + 7 emirates IDs/slugs.
 * Does NOT expand ServiceLocation.
 * Does NOT delete locations.
 */
import { LocationStatus, LocationType, PrismaClient } from "@prisma/client";
import {
  appLocationType,
  loadLocationMaster,
  resolveParentCityName,
  validateLocationMaster,
  type MasterLocation,
} from "../prisma/data/location-master";

const prisma = new PrismaClient();

function meta(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= 155 ? clean : `${clean.slice(0, 152)}...`;
}

function introFor(loc: MasterLocation, locale: "en" | "ar") {
  if (locale === "en") {
    return `${loc.nameEn} is a catalog location record for Al Najah Al Daem service planning. This entry does not claim service coverage, licensing, or booking availability.`;
  }
  return `${loc.nameAr === "REVIEW_REQUIRED" ? loc.nameEn : loc.nameAr} سجل موقع في كتالوج النجاح الدائم للتخطيط. هذا السجل لا يدّعي تغطية الخدمة أو الترخيص أو توفر الحجز.`;
}

async function upsertTranslation(
  locationId: string,
  locale: "en" | "ar",
  name: string,
  loc: MasterLocation,
) {
  const intro = introFor(loc, locale);
  const seoTitle =
    locale === "en"
      ? `${loc.nameEn} | Al Najah Al Daem`.slice(0, 60)
      : `${name} | النجاح الدائم`.slice(0, 60);
  const metaDescription = meta(intro);
  await prisma.locationI18n.upsert({
    where: { locationId_locale: { locationId, locale } },
    create: {
      locationId,
      locale,
      name,
      intro,
      localServiceInfo: "",
      propertyTypes: "",
      nearbyAreas: "",
      seoTitle,
      metaDescription,
      faq: "[]",
    },
    update: {
      // Preserve existing emirate/country editorial copy; only fill if somehow empty.
      name,
    },
  });
}

async function main() {
  if (process.env.LOCATION_MASTER_IMPORT !== "1") {
    throw new Error(
      "Location master import is not approved. The 277-location file was updated; database import is a separate step.",
    );
  }
  const beforeSl = await prisma.serviceLocation.count();
  const beforeLocations = await prisma.location.count();
  const master = loadLocationMaster();
  const validation = validateLocationMaster(master);
  if (!validation.ok) {
    console.error("Location master validation FAILED");
    for (const err of validation.errors) console.error(` - ${err}`);
    process.exit(1);
  }
  console.log("Location master validation PASSED", validation.counts);

  const bySlug = new Map<string, { id: string; type: LocationType }>();
  const existing = await prisma.location.findMany({ select: { id: true, slug: true, type: true } });
  for (const row of existing) bySlug.set(row.slug, { id: row.id, type: row.type });

  const preservedEmirateIdsBefore = new Map<string, string>();
  for (const slug of [
    "dubai",
    "abu-dhabi",
    "sharjah",
    "ajman",
    "umm-al-quwain",
    "ras-al-khaimah",
    "fujairah",
  ] as const) {
    const row = bySlug.get(slug);
    if (row) preservedEmirateIdsBefore.set(slug, row.id);
  }
  const uaeIdBefore = bySlug.get("uae")?.id ?? null;

  const preserveSlugs = new Set(
    master.locations.filter((l) => l.existingSeed).map((l) => l.slug),
  );

  // Ensure UAE exists (do not recreate if present).
  const uaeMaster = master.locations.find((l) => l.slug === "uae")!;
  let uae = bySlug.get("uae");
  if (!uae) {
    const created = await prisma.location.create({
      data: {
        slug: "uae",
        type: LocationType.country,
        status: LocationStatus.active,
        serves: true,
        indexable: false,
        sortOrder: 0,
      },
    });
    await upsertTranslation(created.id, "en", uaeMaster.nameEn, uaeMaster);
    await upsertTranslation(created.id, "ar", uaeMaster.nameAr, uaeMaster);
    uae = { id: created.id, type: LocationType.country };
    bySlug.set("uae", uae);
    console.log("Created missing UAE country row");
  }

  // Preserve emirates: update parent/type only if needed; never change slug.
  const emirates = master.locations.filter((l) => l.type === "emirate");
  for (const em of emirates) {
    const row = bySlug.get(em.slug);
    if (!row) {
      const created = await prisma.location.create({
        data: {
          slug: em.slug,
          type: LocationType.emirate,
          parentId: uae.id,
          status: LocationStatus.active,
          serves: true,
          indexable: true,
          sortOrder: em.id,
        },
      });
      await upsertTranslation(created.id, "en", em.nameEn, em);
      await upsertTranslation(created.id, "ar", em.nameAr, em);
      bySlug.set(em.slug, { id: created.id, type: LocationType.emirate });
      console.log(`Created missing emirate ${em.slug}`);
      continue;
    }
    if (row.type !== LocationType.emirate) {
      throw new Error(`Slug ${em.slug} exists but type is ${row.type}, expected emirate`);
    }
    await prisma.location.update({
      where: { id: row.id },
      data: { parentId: uae.id, type: LocationType.emirate },
    });
  }

  // Cities then communities (additive upsert by slug).
  const cities = master.locations.filter((l) => l.type === "city");
  const communities = master.locations.filter((l) => l.type === "community" || l.type === "area");

  let createdCount = 0;
  let updatedCount = 0;

  async function upsertNew(loc: MasterLocation, parentId: string, sortOrder: number) {
    const type = appLocationType(loc.type) as LocationType;
    const existingRow = bySlug.get(loc.slug);
    if (preserveSlugs.has(loc.slug)) {
      throw new Error(`Refusing to recreate preserved slug as new location: ${loc.slug}`);
    }

    // Conservative: draft, no serves, no index — catalog infrastructure only.
    const status = LocationStatus.draft;
    const serves = false;
    const indexable = false;

    if (!existingRow) {
      const created = await prisma.location.create({
        data: {
          slug: loc.slug,
          type,
          parentId,
          status,
          serves,
          indexable,
          sortOrder,
        },
      });
      await prisma.locationI18n.createMany({
        data: [
          {
            locationId: created.id,
            locale: "en",
            name: loc.nameEn,
            intro: introFor(loc, "en"),
            seoTitle: `${loc.nameEn} | Al Najah Al Daem`.slice(0, 60),
            metaDescription: meta(introFor(loc, "en")),
          },
          {
            locationId: created.id,
            locale: "ar",
            name: loc.nameAr,
            intro: introFor(loc, "ar"),
            seoTitle: `${loc.nameAr === "REVIEW_REQUIRED" ? loc.nameEn : loc.nameAr} | النجاح الدائم`.slice(0, 60),
            metaDescription: meta(introFor(loc, "ar")),
          },
        ],
      });
      bySlug.set(loc.slug, { id: created.id, type });
      createdCount += 1;
      return;
    }

    await prisma.location.update({
      where: { id: existingRow.id },
      data: { parentId, type, status, serves, indexable, sortOrder },
    });
    await upsertTranslation(existingRow.id, "en", loc.nameEn, loc);
    await upsertTranslation(existingRow.id, "ar", loc.nameAr, loc);
    updatedCount += 1;
  }

  for (const city of cities) {
    const em = bySlug.get(city.emirateSlug!);
    if (!em) throw new Error(`Missing emirate for city ${city.slug}`);
    await upsertNew(city, em.id, city.id);
  }

  const cityByEmName = new Map(
    cities.map((c) => {
      const row = bySlug.get(c.slug);
      if (!row) throw new Error(`City not in DB map: ${c.slug}`);
      return [`${c.emirateSlug}|${c.nameEn}`, row] as const;
    }),
  );

  for (const community of communities) {
    const parentName = resolveParentCityName(community.parentCityMunicipality);
    const emirate = bySlug.get(community.emirateSlug!);
    if (!emirate) throw new Error(`Missing emirate for ${community.slug}`);
    const emirateMaster = master.locations.find((row) => row.slug === community.emirateSlug);
    if (emirateMaster?.nameEn === parentName) {
      await upsertNew(community, emirate.id, community.id);
      continue;
    }
    const parent = cityByEmName.get(`${community.emirateSlug}|${parentName}`);
    if (!parent) {
      throw new Error(
        `Missing parent city for ${community.slug}: ${community.emirateSlug}|${parentName}`,
      );
    }
    await upsertNew(community, parent.id, community.id);
  }

  const afterSl = await prisma.serviceLocation.count();
  const total = await prisma.location.count();
  const byType = await prisma.location.groupBy({ by: ["type"], _count: true });
  const afterRows = await prisma.location.findMany({
    where: {
      slug: {
        in: [
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
    select: { id: true, slug: true },
  });
  const afterBySlug = new Map(afterRows.map((r) => [r.slug, r.id]));
  if (uaeIdBefore && afterBySlug.get("uae") !== uaeIdBefore) {
    throw new Error("UAE location ID changed during A2 import");
  }
  for (const [slug, id] of preservedEmirateIdsBefore) {
    if (afterBySlug.get(slug) !== id) {
      throw new Error(`Emirate ID changed for ${slug}`);
    }
  }

  if (afterSl !== beforeSl) {
    throw new Error(`ServiceLocation changed during A2 import: before=${beforeSl} after=${afterSl}`);
  }
  const afterAll = await prisma.location.findMany({ select: { slug: true, status: true, serves: true, indexable: true } });
  const afterSet = new Set(afterAll.map((row) => row.slug));
  const missingMaster = master.locations.filter((row) => !afterSet.has(row.slug)).map((row) => row.slug);
  if (missingMaster.length) {
    throw new Error(`Master locations still missing after import: ${missingMaster.slice(0, 8).join(", ")}`);
  }
  if (total !== beforeLocations + createdCount) {
    throw new Error(`Location total unexpected: before=${beforeLocations} created=${createdCount} after=${total}`);
  }

  console.log(
    JSON.stringify(
      {
        createdCount,
        updatedCount,
        locationTotalBefore: beforeLocations,
        locationTotal: total,
        byType,
        serviceLocationBefore: beforeSl,
        serviceLocationAfter: afterSl,
        preservedEmirateIdsUnchanged: [...preservedEmirateIdsBefore.keys()],
        uaeIdUnchanged: Boolean(uaeIdBefore),
      },
      null,
      2,
    ),
  );
  console.log("Phase A2 location import complete");
}

main()
  .catch((e) => {
    console.error("Phase A2 location import FAILED");
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
