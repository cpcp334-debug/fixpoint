/**
 * Phase A1 catalog verification — counts, mappings, REVIEW_REQUIRED, no location expansion.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import {
  ACTIVE_CATEGORY_ANCHORS,
  APPROVED_CATEGORIES,
  APPROVED_CATEGORY_SLUGS,
  APPROVED_CHILD_SLUGS,
  APPROVED_CHILDREN,
  DRAFT_CATEGORY_ANCHORS,
  LEGACY_ORPHAN_CATEGORIES,
  REVIEW_REQUIRED,
  UNMAPPED_LEGACY_DRAFT_SLUGS,
  assertCatalogA1Counts,
  childSlug,
} from "../prisma/data/catalog-a1";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function main() {
  const counts = assertCatalogA1Counts();
  console.log(`Structured data OK: parents=${counts.parents} children=${counts.children} offerings=${counts.offerings}`);

  const waterTankChild = APPROVED_CHILDREN.find((c) => c.nameEn === "Water Tank Cleaning");
  assert(waterTankChild && childSlug(waterTankChild) === "water-tank-cleaning-service", "water-tank child slug locked");
  assert(!APPROVED_CHILD_SLUGS.includes("water-tank-cleaning"), "legacy water-tank-cleaning not in children");

  const cats = await prisma.serviceCategory.findMany({
    include: { translations: true },
    orderBy: { sortOrder: "asc" },
  });
  const svcs = await prisma.service.findMany({
    include: {
      translations: true,
      category: true,
    },
    orderBy: { slug: "asc" },
  });
  const slCount = await prisma.serviceLocation.count();

  const approvedCats = cats.filter((c) => APPROVED_CATEGORY_SLUGS.includes(c.slug));
  const legacyCats = cats.filter((c) => LEGACY_ORPHAN_CATEGORIES.some((l) => l.slug === c.slug));

  assert(approvedCats.length === 18, `approved categories in DB must be 18, got ${approvedCats.length}`);
  assert(counts.offerings === 311, "offerings must be 311");

  for (const def of APPROVED_CATEGORIES) {
    const row = approvedCats.find((c) => c.slug === def.slug);
    assert(row, `missing approved category ${def.slug}`);
    assert(row.status === "published", `approved category ${def.slug} must be published`);
    const en = row.translations.find((t) => t.locale === "en");
    assert(en?.name === def.nameEn, `category EN name mismatch for ${def.slug}: ${en?.name} !== ${def.nameEn}`);
  }

  for (const def of LEGACY_ORPHAN_CATEGORIES) {
    const row = legacyCats.find((c) => c.slug === def.slug);
    assert(row, `missing legacy orphan category ${def.slug}`);
    assert(row.status === "draft", `legacy category ${def.slug} must remain draft`);
  }

  const childBySlug = new Map(
    svcs.filter((s) => APPROVED_CHILD_SLUGS.includes(s.slug)).map((s) => [s.slug, s]),
  );
  assert(childBySlug.size === 293, `approved children in DB must be 293, got ${childBySlug.size}`);

  let arReview = 0;
  let diyReview = 0;
  for (const def of APPROVED_CHILDREN) {
    const slug = childSlug(def);
    const row = childBySlug.get(slug);
    assert(row, `missing approved child ${slug}`);
    assert(row.status === "draft", `child ${slug} must be draft`);
    assert(row.indexable === false, `child ${slug} must not be indexable`);
    assert(row.diyAvailable === false, `child ${slug} diyAvailable must be false`);
    assert(row.riskLevel === "yellow", `child ${slug} riskLevel must be yellow`);
    assert(row.category.slug === def.categorySlug, `child ${slug} category mismatch`);
    const en = row.translations.find((t) => t.locale === "en");
    const ar = row.translations.find((t) => t.locale === "ar");
    assert(en?.name === def.nameEn, `child EN name mismatch ${slug}`);
    assert(ar?.name === REVIEW_REQUIRED, `child AR name must be REVIEW_REQUIRED (${slug})`);
    arReview += 1;
    let schema: Record<string, unknown> = {};
    try {
      schema = JSON.parse(row.schemaData || "{}") as Record<string, unknown>;
    } catch {
      throw new Error(`child ${slug} schemaData is not JSON`);
    }
    assert(schema.catalogRole === "approved_child", `child ${slug} catalogRole`);
    assert(schema.diyReview === REVIEW_REQUIRED, `child ${slug} diyReview`);
    assert(schema.arabicReview === REVIEW_REQUIRED, `child ${slug} arabicReview`);
    diyReview += 1;
  }

  for (const anchor of ACTIVE_CATEGORY_ANCHORS) {
    const row = svcs.find((s) => s.slug === anchor.slug);
    assert(row, `missing active anchor ${anchor.slug}`);
    assert(row.status === "active", `${anchor.slug} must stay active`);
    assert(row.indexable === true, `${anchor.slug} must stay indexable`);
    assert(row.category.slug === anchor.categorySlug, `${anchor.slug} category remap`);
    const en = row.translations.find((t) => t.locale === "en");
    assert(en?.name === anchor.nameEn, `${anchor.slug} EN name preserved`);
  }

  for (const anchor of DRAFT_CATEGORY_ANCHORS) {
    const row = svcs.find((s) => s.slug === anchor.slug);
    assert(row, `missing draft anchor ${anchor.slug}`);
    assert(row.status === "draft", `${anchor.slug} must remain draft`);
    assert(row.category.slug === anchor.categorySlug, `${anchor.slug} category remap`);
  }

  for (const slug of UNMAPPED_LEGACY_DRAFT_SLUGS) {
    const row = svcs.find((s) => s.slug === slug);
    assert(row, `missing unmapped legacy draft ${slug}`);
    assert(row.status === "draft", `${slug} must remain draft`);
  }

  const activeCount = svcs.filter((s) => s.status === "active").length;
  const draftCount = svcs.filter((s) => s.status === "draft").length;
  assert(activeCount === 7, `active services must be 7, got ${activeCount}`);

  // Original published coverage remains 7 actives × 7 emirates = 49 (A3.2 may add draft rows).
  const publishedSl = await prisma.serviceLocation.count({
    where: { coverageStatus: "published", covered: true, indexable: true },
  });
  assert(publishedSl === 49, `published ServiceLocation must stay 49 (7 actives × 7 emirates), got ${publishedSl}`);
  assert(slCount >= 49, `ServiceLocation total must be at least 49, got ${slCount}`);

  const seedSrc = readFileSync(join(process.cwd(), "prisma/seed.ts"), "utf8");
  assert(seedSrc.includes("services.filter((s) => s.active)"), "ServiceLocation still limited to active services");
  assert(!seedSrc.includes("62") || !seedSrc.includes("62200"), "no 62k matrix references in seed");

  console.log(
    JSON.stringify(
      {
        approvedCategories: approvedCats.length,
        approvedChildren: childBySlug.size,
        offerings311: approvedCats.length + childBySlug.size,
        legacyOrphanCategories: legacyCats.length,
        totalCategories: cats.length,
        totalServices: svcs.length,
        activeServices: activeCount,
        draftServices: draftCount,
        arabicReviewRequiredChildren: arReview,
        diyReviewRequiredChildren: diyReview,
        serviceLocations: slCount,
        publishedServiceLocations: publishedSl,
        waterTankChildSlug: "water-tank-cleaning-service",
        legacyWaterTankSlugPreserved: Boolean(svcs.find((s) => s.slug === "water-tank-cleaning")),
      },
      null,
      2,
    ),
  );
  console.log("Phase A1 catalog verification PASSED");
}

main()
  .catch((e) => {
    console.error("Phase A1 catalog verification FAILED");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
