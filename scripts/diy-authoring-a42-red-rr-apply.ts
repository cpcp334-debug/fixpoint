/**
 * Apply RED + REVIEW_REQUIRED DIY safety profiles (draft / safety_review).
 * No procedural steps. Skips category-only hubs. Does not touch painting-services DIY flags.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ContentStatus,
  DiyArabicReviewStatus,
  DiyProfileStatus,
  RiskLevel,
} from "@prisma/client";
import { prisma } from "../src/server/db";
import { loadMatrixRows, diyCategorySlugForParent, EXISTING_SIX_GUIDES, MISSING_HUBS } from "../src/lib/diy/coverage";
import { authorRedSafetyProfile, authorReviewRequiredProfile, RED_BATCH } from "../src/lib/diy/author-red-rr";
import { yellowPrimaryGuideSlug } from "../src/lib/diy/author-yellow-profiles";
import { parseDiyProfileJson } from "../src/lib/diy/profile-validate";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function upsertGuide(args: {
  slug: string;
  serviceOffering: string;
  parentSlug: string;
  risk: "red" | "yellow";
  profileStatus: DiyProfileStatus;
  profile: string;
  createdBy: string;
}) {
  const service = await prisma.service.findUnique({ where: { slug: args.slug } });
  if (!service) return { ok: false as const, error: `missing service ${args.slug}` };
  const guideSlug = yellowPrimaryGuideSlug(args.slug);
  const categorySlug = diyCategorySlugForParent(args.parentSlug, args.slug);
  const category = await prisma.diyCategory.findUnique({ where: { slug: categorySlug } });
  if (!category) return { ok: false as const, error: `missing diy category ${categorySlug}` };

  const existing = await prisma.diyGuide.findUnique({ where: { slug: guideSlug } });
  const profileObj = parseDiyProfileJson(JSON.parse(args.profile)).value!;
  const dataCommon = {
    categoryId: category.id,
    categorySlug,
    serviceId: service.id,
    difficulty: profileObj.main.skillLevel,
    estimatedTime: profileObj.main.estimatedTime,
    riskLevel: args.risk === "red" ? RiskLevel.red : RiskLevel.yellow,
    profileJson: args.profile,
    profileStatus: args.profileStatus,
    isPrimary: true,
    arabicReviewStatus: DiyArabicReviewStatus.not_started,
    status: ContentStatus.draft,
    indexable: false,
    relatedServiceSlugs: JSON.stringify([args.slug]),
    relatedSlugs: "[]",
    locationSlugs: "[]",
  };

  const guide = existing
    ? await prisma.diyGuide.update({
        where: { id: existing.id },
        data: {
          ...dataCommon,
          profileVersion: existing.profileVersion + 1,
          updatedBy: args.createdBy,
        },
      })
    : await prisma.diyGuide.create({
        data: {
          slug: guideSlug,
          schemaType: "howto",
          ...dataCommon,
          profileVersion: 1,
          createdBy: args.createdBy,
          updatedBy: args.createdBy,
          translations: {
            create: [
              {
                locale: "en",
                title: `${args.serviceOffering} — safety guidance (draft)`,
                problem: profileObj.main.symptoms,
                quickAnswer: profileObj.main.canIDoIt,
                difficulty: profileObj.main.skillLevel,
                estimatedTime: profileObj.main.estimatedTime,
                tools: "[]",
                materials: "[]",
                safety: profileObj.safety.warnings.join(" "),
                steps: "[]",
                checkWork: "",
                whenToStop: profileObj.safety.stopConditions.join(" "),
                professionalFallback: profileObj.professional.professionalFallback,
                seoTitle: `${args.serviceOffering} safety (draft)`,
                metaDescription: "Draft safety profile — not published.",
                faq: "[]",
              },
              {
                locale: "ar",
                title: "",
                problem: "",
                quickAnswer: "",
                difficulty: "",
                estimatedTime: "",
                tools: "[]",
                materials: "[]",
                safety: "",
                steps: "[]",
                checkWork: "",
                whenToStop: "",
                professionalFallback: "",
                seoTitle: "",
                metaDescription: "",
                faq: "[]",
              },
            ],
          },
        },
      });

  if (existing) {
    await prisma.diyGuideI18n.updateMany({
      where: { guideId: guide.id, locale: "en" },
      data: {
        title: `${args.serviceOffering} — safety guidance (draft)`,
        problem: profileObj.main.symptoms,
        quickAnswer: profileObj.main.canIDoIt,
        safety: profileObj.safety.warnings.join(" "),
        whenToStop: profileObj.safety.stopConditions.join(" "),
        professionalFallback: profileObj.professional.professionalFallback,
        steps: "[]",
      },
    });
  }

  await prisma.diyGuide.updateMany({
    where: { serviceId: service.id, isPrimary: true, NOT: { id: guide.id } },
    data: { isPrimary: false },
  });
  await prisma.service.update({ where: { id: service.id }, data: { primaryDiyGuideId: guide.id } });
  return { ok: true as const, guideSlug };
}

async function main() {
  for (const h of MISSING_HUBS) {
    assert(!(await prisma.service.findUnique({ where: { slug: h } })), `hub must not exist ${h}`);
  }
  const paint = await prisma.service.findUnique({ where: { slug: "painting-services" } });
  assert(paint?.riskLevel === "green" && paint.diyAvailable === true, "painting unchanged");

  const sixBefore = await prisma.diyGuide.findMany({
    where: { slug: { in: [...EXISTING_SIX_GUIDES] } },
    include: { translations: true },
  });
  const fp = new Map(
    sixBefore.map((g) => {
      const en = g.translations.find((t) => t.locale === "en");
      return [g.slug, `${en?.steps}|${en?.quickAnswer}|${en?.safety}`];
    }),
  );

  const rows = loadMatrixRows();
  const redRows = rows.filter(
    (r) => r.diyStatus === "RED" && !(MISSING_HUBS as readonly string[]).includes(r.offeringSlug),
  );
  const rrRows = rows.filter(
    (r) =>
      r.diyStatus === "REVIEW_REQUIRED" && !(MISSING_HUBS as readonly string[]).includes(r.offeringSlug),
  );

  const authoredRed: string[] = [];
  const authoredRr: string[] = [];
  const errors: string[] = [];

  for (const row of redRows) {
    const profile = authorRedSafetyProfile(row.offeringSlug, row.serviceOffering, row.parentSlug);
    const res = await upsertGuide({
      slug: row.offeringSlug,
      serviceOffering: row.serviceOffering,
      parentSlug: row.parentSlug,
      risk: "red",
      profileStatus: DiyProfileStatus.draft,
      profile: JSON.stringify(profile),
      createdBy: RED_BATCH,
    });
    if (!res.ok) errors.push(res.error);
    else authoredRed.push(row.offeringSlug);
  }

  for (const row of rrRows) {
    const profile = authorReviewRequiredProfile(row.offeringSlug, row.serviceOffering, row.parentSlug);
    const res = await upsertGuide({
      slug: row.offeringSlug,
      serviceOffering: row.serviceOffering,
      parentSlug: row.parentSlug,
      risk: "yellow", // Prisma RiskLevel has no RR; keep yellow+profileSafety RR
      profileStatus: DiyProfileStatus.safety_review,
      profile: JSON.stringify(profile),
      createdBy: "A4.2-RR-1",
    });
    if (!res.ok) errors.push(res.error);
    else authoredRr.push(row.offeringSlug);
  }

  const sixAfter = await prisma.diyGuide.findMany({
    where: { slug: { in: [...EXISTING_SIX_GUIDES] } },
    include: { translations: true },
  });
  for (const g of sixAfter) {
    const en = g.translations.find((t) => t.locale === "en");
    assert(fp.get(g.slug) === `${en?.steps}|${en?.quickAnswer}|${en?.safety}`, `guide body changed ${g.slug}`);
  }

  const report = {
    meta: {
      phase: "A4.2",
      generated: new Date().toISOString().slice(0, 10),
      redAuthored: authoredRed.length,
      reviewRequiredAuthored: authoredRr.length,
      redMatrixExcludingHubs: redRows.length,
      rrMatrixExcludingHubs: rrRows.length,
      errors: errors.length,
    },
    authoredRed,
    authoredRr,
    errors,
  };
  writeFileSync(join(process.cwd(), "docs/diy-authoring-a42-red-rr.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.meta, null, 2));
  if (errors.length) {
    console.error(errors);
    process.exit(1);
  }
  console.log("RED + REVIEW_REQUIRED DIY profiles applied");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
