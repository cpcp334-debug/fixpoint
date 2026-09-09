/**
 * Read-only hierarchy audit: approved 18 parents × 293 children.
 * No DB mutation.
 */
import {
  APPROVED_CATEGORIES,
  APPROVED_CHILDREN,
  APPROVED_CATEGORY_SLUGS,
  ACTIVE_CATEGORY_ANCHORS,
  DRAFT_CATEGORY_ANCHORS,
  LEGACY_ORPHAN_CATEGORIES,
  UNMAPPED_LEGACY_DRAFT_SLUGS,
  assertCatalogA1Counts,
  childSlug,
} from "../prisma/data/catalog-a1";
import { categories, services } from "../prisma/data/services";

type GapClass = "EXACT MATCH" | "CLEAR FROM APPROVED CATEGORY" | "AMBIGUOUS → REVIEW_REQUIRED";

type GapRow = {
  n: number;
  childService: string;
  childSlug: string;
  currentParent: string;
  intendedParent: string;
  reason: string;
  confidence: GapClass;
};

function main() {
  const counts = assertCatalogA1Counts();
  const approved = new Set(APPROVED_CATEGORY_SLUGS);
  const catName = new Map(APPROVED_CATEGORIES.map((c) => [c.slug, c.nameEn]));
  const seedBySlug = new Map(services.map((s) => [s.slug, s]));
  const seedCats = new Map(categories.map((c) => [c.slug, c]));

  const gaps: GapRow[] = [];
  const parentCounts: Record<string, number> = {};
  let n = 0;

  for (const def of APPROVED_CHILDREN) {
    n += 1;
    const slug = childSlug(def);
    parentCounts[def.categorySlug] = (parentCounts[def.categorySlug] || 0) + 1;

    const intended = def.categorySlug;
    const intendedName = catName.get(intended) ?? intended;

    if (!approved.has(intended)) {
      gaps.push({
        n,
        childService: def.nameEn,
        childSlug: slug,
        currentParent: intended,
        intendedParent: "REVIEW_REQUIRED",
        reason: "categorySlug is not one of the approved 18 parents",
        confidence: "AMBIGUOUS → REVIEW_REQUIRED",
      });
      continue;
    }

    const svc = seedBySlug.get(slug);
    if (!svc) {
      gaps.push({
        n,
        childService: def.nameEn,
        childSlug: slug,
        currentParent: "(missing in services seed)",
        intendedParent: intendedName,
        reason: "Approved child missing from services.ts seed array",
        confidence: "AMBIGUOUS → REVIEW_REQUIRED",
      });
      continue;
    }

    const current = svc.categorySlug;
    const currentName = catName.get(current) ?? seedCats.get(current)?.name.en ?? current;

    if (current === intended) {
      // Exact match — not a gap; tracked separately
      continue;
    }

    if (approved.has(current) && current !== intended) {
      gaps.push({
        n,
        childService: def.nameEn,
        childSlug: slug,
        currentParent: currentName,
        intendedParent: intendedName,
        reason: `Seed categorySlug "${current}" differs from catalog-a1 parent "${intended}"`,
        confidence: "AMBIGUOUS → REVIEW_REQUIRED",
      });
      continue;
    }

    if (!approved.has(current) && approved.has(intended)) {
      // Clear remap from legacy orphan → approved parent already specified in catalog-a1
      gaps.push({
        n,
        childService: def.nameEn,
        childSlug: slug,
        currentParent: currentName,
        intendedParent: intendedName,
        reason: `Seed still on non-approved category "${current}"; catalog-a1 assigns approved parent "${intended}"`,
        confidence: "CLEAR FROM APPROVED CATEGORY",
      });
      continue;
    }

    gaps.push({
      n,
      childService: def.nameEn,
      childSlug: slug,
      currentParent: currentName,
      intendedParent: intendedName,
      reason: "Unresolved parent mismatch",
      confidence: "AMBIGUOUS → REVIEW_REQUIRED",
    });
  }

  // Multi-parent / duplicate slug checks
  const slugSeen = new Map<string, string>();
  const duplicateSlugs: string[] = [];
  for (const def of APPROVED_CHILDREN) {
    const slug = childSlug(def);
    if (slugSeen.has(slug)) duplicateSlugs.push(slug);
    slugSeen.set(slug, def.categorySlug);
  }

  const childrenMissingParent = APPROVED_CHILDREN.filter((c) => !c.categorySlug).length;
  const childrenWithNonApproved = APPROVED_CHILDREN.filter((c) => !approved.has(c.categorySlug));
  const exactMatches = APPROVED_CHILDREN.filter((def) => {
    const svc = seedBySlug.get(childSlug(def));
    return svc && svc.categorySlug === def.categorySlug;
  }).length;

  // Anchor name notes (not child parent gaps)
  const anchorNotes = [
    ...ACTIVE_CATEGORY_ANCHORS.map((a) => ({
      slug: a.slug,
      categorySlug: a.categorySlug,
      nameEn: a.nameEn,
      approvedParentName: catName.get(a.categorySlug),
      nameExact: a.nameEn === catName.get(a.categorySlug),
      kind: "active_anchor",
    })),
    ...DRAFT_CATEGORY_ANCHORS.map((a) => ({
      slug: a.slug,
      categorySlug: a.categorySlug,
      nameEn: a.nameEn,
      approvedParentName: catName.get(a.categorySlug),
      nameExact: a.nameEn === catName.get(a.categorySlug),
      kind: "draft_anchor",
      note: (a as { note?: string }).note,
    })),
  ];

  const report = {
    catalogAssert: counts,
    approvedParentsUnchanged: APPROVED_CATEGORIES.map((c) => ({ slug: c.slug, nameEn: c.nameEn })),
    childrenPerApprovedParent: Object.fromEntries(
      APPROVED_CATEGORIES.map((c) => [c.slug, parentCounts[c.slug] || 0]),
    ),
    sumChildren: Object.values(parentCounts).reduce((a, b) => a + b, 0),
    exactMatchCount: exactMatches,
    gapCount: gaps.length,
    gapsByConfidence: {
      EXACT_MATCH_rows_in_gap_table: gaps.filter((g) => g.confidence === "EXACT MATCH").length,
      CLEAR: gaps.filter((g) => g.confidence === "CLEAR FROM APPROVED CATEGORY").length,
      AMBIGUOUS: gaps.filter((g) => g.confidence === "AMBIGUOUS → REVIEW_REQUIRED").length,
    },
    gaps,
    childrenMissingParent,
    childrenWithNonApprovedParent: childrenWithNonApproved.map((c) => ({
      nameEn: c.nameEn,
      categorySlug: c.categorySlug,
    })),
    duplicateSlugs,
    everyChildHasExactlyOneParent:
      childrenMissingParent === 0 &&
      childrenWithNonApproved.length === 0 &&
      duplicateSlugs.length === 0 &&
      APPROVED_CHILDREN.every((c) => typeof c.categorySlug === "string" && c.categorySlug.length > 0),
    approvedParentsCount: APPROVED_CATEGORIES.length,
    offerings311: counts.offerings,
    legacyOrphanCategories: LEGACY_ORPHAN_CATEGORIES.length,
    unmappedLegacyDrafts: UNMAPPED_LEGACY_DRAFT_SLUGS.length,
    anchorNotes,
    a2Blocked: gaps.some((g) => g.confidence === "AMBIGUOUS → REVIEW_REQUIRED") || !counts.offerings,
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
