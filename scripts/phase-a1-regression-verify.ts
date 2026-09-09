/**
 * A1 regression: public catalog still exposes only 7 active services;
 * booking/quote/AI helpers resolve active anchors by slug.
 */
import { prisma } from "../src/server/db";
import { getActiveServices, getServiceBySlug } from "../src/lib/catalog";
import { ACTIVE_SERVICE_SLUGS } from "../prisma/data/shared";
import { APPROVED_CHILD_SLUGS } from "../prisma/data/catalog-a1";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function main() {
  const active = await getActiveServices("en");
  assert(active.length === 7, `getActiveServices must return 7, got ${active.length}`);
  const activeSlugs = new Set(active.map((s) => s.slug));
  for (const slug of ACTIVE_SERVICE_SLUGS) {
    assert(activeSlugs.has(slug), `missing active ${slug}`);
    const row = await getServiceBySlug(slug, "en");
    assert(row, `getServiceBySlug(${slug})`);
    assert(row.status === "active" && row.indexable, `${slug} active+indexable`);
  }

  const sampleChild = APPROVED_CHILD_SLUGS[0];
  const childPublic = await getServiceBySlug(sampleChild, "en");
  assert(!childPublic, `draft child ${sampleChild} must not be publicly resolvable`);

  const childRow = await prisma.service.findUnique({ where: { slug: sampleChild } });
  assert(childRow?.status === "draft", `${sampleChild} stays draft`);
  assert(childRow?.bookingEnabled === true, `${sampleChild} bookingEnabled true (admin/ops)`);
  assert(childRow?.indexable === false, `${sampleChild} not indexable`);

  for (const slug of ACTIVE_SERVICE_SLUGS) {
    const row = await prisma.service.findUnique({ where: { slug } });
    assert(row?.bookingEnabled === true, `${slug} bookingEnabled preserved`);
  }

  console.log(
    JSON.stringify({
      publicActive: active.length,
      sampleDraftHidden: sampleChild,
      ok: true,
    }),
  );
  console.log("Phase A1 booking/quote/catalog regression PASSED");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
