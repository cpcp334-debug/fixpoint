/**
 * Phase A2 location catalog verification + DIY classification row checks.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import {
  EXISTING_EIGHT_SLUGS,
  loadLocationMaster,
  validateLocationMaster,
} from "../prisma/data/location-master";
import { assertCatalogA1Counts } from "../prisma/data/catalog-a1";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function loadDiyMatrix() {
  const path = join(process.cwd(), "docs/diy-classification-matrix-311.json");
  return JSON.parse(readFileSync(path, "utf8")) as {
    meta: {
      counts: {
        total: number;
        GREEN: number;
        YELLOW: number;
        RED: number;
        REVIEW_REQUIRED: number;
        existingGuidesMapped?: number;
        existingGuideMapped?: number;
        newGuidesRequired?: number;
        newGuideRequired?: number;
        safetyReviewRequired?: number;
        arabicReviewRequired?: number;
      };
    };
    rows: Array<{ n: number; offeringSlug: string; diyStatus: string; reason: string }>;
  };
}

async function main() {
  const catalog = assertCatalogA1Counts();
  assert(catalog.offerings === 454, "catalog offerings must be 454");

  const diy = loadDiyMatrix();
  assert(diy.rows.length === 311, `DIY matrix rows must be 311, got ${diy.rows.length}`);
  assert(diy.meta.counts.total === 311, "DIY meta total must be 311");
  const diySlugs = new Set<string>();
  for (const row of diy.rows) {
    assert(row.offeringSlug, `DIY row ${row.n} missing slug`);
    assert(!diySlugs.has(row.offeringSlug), `duplicate DIY offering slug ${row.offeringSlug}`);
    diySlugs.add(row.offeringSlug);
    assert(
      ["GREEN", "YELLOW", "RED", "REVIEW_REQUIRED"].includes(row.diyStatus),
      `invalid diyStatus on ${row.offeringSlug}`,
    );
    assert(!/live wiring|gas leak repair procedure|refrigerant charging steps/i.test(row.reason), "dangerous instruction leak in reason");
  }
  const statusSum =
    diy.meta.counts.GREEN + diy.meta.counts.YELLOW + diy.meta.counts.RED + diy.meta.counts.REVIEW_REQUIRED;
  assert(statusSum === 311, `DIY status counts must sum to 311, got ${statusSum}`);

  const master = loadLocationMaster();
  const validation = validateLocationMaster(master);
  assert(validation.ok, `master validation failed: ${validation.errors.join("; ")}`);

  const locations = await prisma.location.findMany({
    include: {
      translations: true,
      parent: { include: { translations: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  const masterSlugs = new Set(master.locations.map((row) => row.slug));
  assert(locations.length >= master.locations.length, `DB locations ${locations.length} < master ${master.locations.length}`);

  const bySlug = new Map(locations.map((l) => [l.slug, l]));
  for (const slug of EXISTING_EIGHT_SLUGS) {
    assert(bySlug.has(slug), `missing preserved location ${slug}`);
  }

  const countries = locations.filter((l) => l.type === "country");
  const emirates = locations.filter((l) => l.type === "emirate");
  const cities = locations.filter((l) => l.type === "city");
  const communities = locations.filter((l) => l.type === "community");
  assert(countries.length === 1, `country count ${countries.length}`);
  assert(emirates.length === 7, `emirate count ${emirates.length}`);
  for (const slug of masterSlugs) {
    assert(bySlug.has(slug), `master location missing from DB: ${slug}`);
  }

  for (const loc of locations) {
    if (loc.type === "country") {
      assert(!loc.parentId, "country must have no parent");
      continue;
    }
    assert(loc.parentId, `${loc.slug} missing parentId`);
    assert(loc.parent, `${loc.slug} orphan parent`);
    if (loc.type === "emirate") assert(loc.parent.type === "country", `${loc.slug} parent must be country`);
    if (loc.type === "city") assert(loc.parent.type === "emirate", `${loc.slug} parent must be emirate`);
    if (loc.type === "community" && masterSlugs.has(loc.slug)) {
      assert(loc.parent.type === "city" || loc.parent.type === "emirate", `${loc.slug} parent must be city or emirate`);
    }
    const en = loc.translations.find((t) => t.locale === "en");
    const ar = loc.translations.find((t) => t.locale === "ar");
    assert(en?.name, `${loc.slug} missing EN name`);
    assert(ar?.name, `${loc.slug} missing AR name`);
  }

  for (const m of master.locations.filter((l) => l.type === "community" || l.type === "area")) {
    assert(m.parentCityMunicipality, `${m.slug} missing parentCityMunicipality in source`);
  }

  for (const slug of ["dubai", "abu-dhabi", "sharjah", "ajman", "umm-al-quwain", "ras-al-khaimah", "fujairah"] as const) {
    const em = bySlug.get(slug);
    assert(em?.type === "emirate", `preserved emirate missing/wrong type: ${slug}`);
    assert(em.slug === slug, `emirate slug mutated: ${slug}`);
  }

  for (const loc of [...cities, ...communities]) {
    if (masterSlugs.has(loc.slug)) {
      assert(loc.status === "active", `${loc.slug} master location must be published`);
      assert(loc.indexable === true, `${loc.slug} master location must be indexable`);
      continue;
    }
    assert(loc.status === "draft", `${loc.slug} outside the master must remain draft`);
    assert(loc.indexable === false, `${loc.slug} outside the master must not be indexable`);
  }

  const slCount = await prisma.serviceLocation.count();
  const publishedSl = await prisma.serviceLocation.count({
    where: { coverageStatus: "published", covered: true, indexable: true },
  });
  assert(publishedSl === 49, `published ServiceLocation must remain 49, got ${publishedSl}`);
  assert(slCount >= 49, `ServiceLocation total must be at least 49, got ${slCount}`);

  const serviceCount = await prisma.service.count();

  // Emirates preserve active/serves/indexable public behavior.
  for (const em of emirates) {
    assert(em.status === "active", `${em.slug} emirate must stay active`);
    assert(em.serves === true, `${em.slug} emirate must serve`);
    assert(em.indexable === true, `${em.slug} emirate must stay indexable`);
  }

  console.log(
    JSON.stringify(
      {
        diy: {
          parents: catalog.parents,
          children: catalog.children,
          offerings: catalog.offerings,
          matrixRows: diy.rows.length,
          GREEN: diy.meta.counts.GREEN,
          YELLOW: diy.meta.counts.YELLOW,
          RED: diy.meta.counts.RED,
          REVIEW_REQUIRED: diy.meta.counts.REVIEW_REQUIRED,
          existingGuidesMapped: diy.meta.counts.existingGuidesMapped ?? diy.meta.counts.existingGuideMapped,
          newGuidesRequired: diy.meta.counts.newGuidesRequired ?? diy.meta.counts.newGuideRequired,
          safetyReviewRequired: diy.meta.counts.safetyReviewRequired,
          arabicReviewRequired: diy.meta.counts.arabicReviewRequired,
        },
        locations: {
          country: countries.length,
          emirates: emirates.length,
          cities: cities.length,
          communities: communities.length,
          total: locations.length,
          arabicHigh: validation.counts.arabicHigh,
          arabicMedium: validation.counts.arabicMedium,
          arabicReviewRequired: validation.counts.arabicReviewRequired,
        },
        database: {
          serviceRows: serviceCount,
          locationRows: locations.length,
          serviceLocationRows: slCount,
          publishedServiceLocationRows: publishedSl,
        },
      },
      null,
      2,
    ),
  );
  console.log("location-catalog-verify PASSED");
}

main()
  .catch((e) => {
    console.error("location-catalog-verify FAILED");
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
