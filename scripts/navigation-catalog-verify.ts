/**
 * Navigation integrity for the approved catalog (18 / 436 / 454).
 */
import {
  assertNavTreeIntegrity,
  buildApprovedNavTree,
  approvedPublicServiceSlugs,
} from "../src/lib/catalog/approved-nav";
import { APPROVED_CHILD_SLUGS, UNMAPPED_LEGACY_DRAFT_SLUGS, assertCatalogA1Counts } from "../prisma/data/catalog-a1";
import { DIY_SAFETY_A411_UNRESOLVED_MISSING_HUBS } from "../prisma/data/diy-safety-alignment-a411";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function main() {
  const a1 = assertCatalogA1Counts();
  const nav = assertNavTreeIntegrity();
  assert(nav.parents === 18, `parents ${nav.parents}`);
  assert(nav.children === 436, `children ${nav.children}`);
  assert(nav.offerings === 454, `offerings ${nav.offerings}`);
  assert(nav.brokenParentLinks.length === 0, `broken parents ${nav.brokenParentLinks.join(",")}`);
  assert(nav.hubs === 7, `hubs ${nav.hubs}`);

  const tree = buildApprovedNavTree();
  assert(tree.every((c) => c.href.startsWith("/services/")), "category hrefs");
  assert(tree.every((c) => c.childCount === c.children.length), "childCount mismatch");

  const publicSlugs = approvedPublicServiceSlugs();
  for (const slug of APPROVED_CHILD_SLUGS) {
    assert(publicSlugs.has(slug), `missing public slug ${slug}`);
  }
  for (const legacy of UNMAPPED_LEGACY_DRAFT_SLUGS) {
    assert(!tree.some((c) => c.children.some((ch) => ch.slug === legacy)), `legacy in nav ${legacy}`);
  }
  for (const hub of DIY_SAFETY_A411_UNRESOLVED_MISSING_HUBS) {
    const cat = tree.find((c) => c.slug === hub);
    assert(cat?.isCategoryOnlyHub, `hub not marked category-only: ${hub}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        parents: nav.parents,
        children: nav.children,
        offerings: nav.offerings,
        hubs: nav.hubs,
        a1,
        sample: tree.slice(0, 3).map((c) => ({ slug: c.slug, children: c.childCount, href: c.href })),
      },
      null,
      2,
    ),
  );
}

main();
