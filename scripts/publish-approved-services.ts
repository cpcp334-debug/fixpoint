/**
 * Make approved catalog services public.
 * Does not publish the 13 legacy leftovers.
 * Does not expand ServiceLocation coverage.
 * Cities and communities stay visitable but are not indexable.
 */
import { prisma } from "../src/server/db";
import {
  ACTIVE_CATEGORY_ANCHORS,
  APPROVED_CHILDREN,
  DRAFT_CATEGORY_ANCHORS,
  childSlug,
} from "../prisma/data/catalog-a1";

const LEGACY = new Set([
  "carpentry-joinery",
  "flooring-tiling",
  "waterproofing-sealing",
  "roof-exterior-maintenance",
  "bathroom-maintenance",
  "kitchen-maintenance",
  "doors-windows",
  "preventive-maintenance",
  "emergency-maintenance",
  "demolition-dismantling",
  "home-appliance-maintenance",
  "oven-cooker-maintenance",
  "kitchen-appliance-maintenance",
]);

async function main() {
  const approved = new Set<string>([
    ...ACTIVE_CATEGORY_ANCHORS.map((row) => row.slug),
    ...DRAFT_CATEGORY_ANCHORS.map((row) => row.slug),
    ...APPROVED_CHILDREN.map((row) => childSlug(row)),
  ]);

  const services = await prisma.service.findMany({ select: { id: true, slug: true, status: true, indexable: true } });
  const toPublish = services.filter((row) => approved.has(row.slug) && !LEGACY.has(row.slug));
  const leftDraft = services.filter((row) => !approved.has(row.slug) || LEGACY.has(row.slug));

  const published = await prisma.service.updateMany({
    where: { id: { in: toPublish.map((row) => row.id) } },
    data: { status: "active", indexable: true },
  });

  const locations = await prisma.location.updateMany({
    where: { type: { in: ["city", "community"] } },
    data: { indexable: false },
  });

  const [activeIndexable, draft, covered, indexableLocations] = await Promise.all([
    prisma.service.count({ where: { status: "active", indexable: true } }),
    prisma.service.count({ where: { status: "draft" } }),
    prisma.serviceLocation.count({ where: { covered: true, coverageStatus: "published", indexable: true } }),
    prisma.location.count({ where: { indexable: true, type: { in: ["emirate", "city", "community"] } } }),
  ]);

  console.log(
    JSON.stringify(
      {
        approvedSlugs: approved.size,
        servicesUpdated: published.count,
        leftDraft: leftDraft.map((row) => row.slug),
        citiesCommunitiesNoindex: locations.count,
        activeIndexable,
        draft,
        coveredPublished: covered,
        indexablePlacePages: indexableLocations,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
