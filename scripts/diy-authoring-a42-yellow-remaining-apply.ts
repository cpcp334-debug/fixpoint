/**
 * Apply remaining YELLOW DIY profiles (after Batch 2).
 * Category-templated limited troubleshooting; draft only; hubs + painting excluded.
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
import { authorYellowProfileByCategory } from "../src/lib/diy/author-yellow-generic";
import { yellowPrimaryGuideSlug } from "../src/lib/diy/author-yellow-profiles";
import { parseDiyProfileJson, validateAuthoredYellowProfile } from "../src/lib/diy/profile-validate";
import { diyCategorySlugForParent, EXISTING_SIX_GUIDES, MISSING_HUBS } from "../src/lib/diy/coverage";
import {
  listRemainingYellow,
  selectRemainingYellowBatch,
  YELLOW_REMAINING_BATCH,
  YELLOW_SKIP_PAINTING,
} from "../src/lib/diy/yellow-remaining";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function main() {
  const batchSize = Number(process.env.YELLOW_BATCH_SIZE || "101");
  const offset = Number(process.env.YELLOW_BATCH_OFFSET || "0");
  const { selected, totalRemaining } = selectRemainingYellowBatch(batchSize, offset);
  assert(selected.length > 0, "no remaining YELLOW to author at this offset");

  for (const h of MISSING_HUBS) {
    assert(!(await prisma.service.findUnique({ where: { slug: h } })), `hub service must not exist: ${h}`);
  }
  const paint = await prisma.service.findUnique({ where: { slug: YELLOW_SKIP_PAINTING } });
  assert(paint?.riskLevel === "green" && paint.diyAvailable === true, "painting-services must remain unchanged");

  const existingSixBefore = await prisma.diyGuide.findMany({
    where: { slug: { in: [...EXISTING_SIX_GUIDES] } },
    include: { translations: true },
  });
  assert(existingSixBefore.length === 6, "existing six missing");
  const bodyFingerprint = new Map(
    existingSixBefore.map((g) => {
      const en = g.translations.find((t) => t.locale === "en");
      return [g.slug, `${en?.steps ?? ""}|${en?.quickAnswer ?? ""}|${en?.safety ?? ""}`];
    }),
  );

  const authored: Array<{
    slug: string;
    title: string;
    guideSlug: string;
    parentSlug: string;
    profileStatus: string;
    safetyOk: boolean;
    reviewStatus: string;
  }> = [];
  const heldReviewRequired: string[] = [];
  const errors: string[] = [];

  for (const row of selected) {
    const service = await prisma.service.findUnique({ where: { slug: row.offeringSlug } });
    if (!service) {
      errors.push(`Service missing ${row.offeringSlug}`);
      continue;
    }

    const guideSlug = yellowPrimaryGuideSlug(row.offeringSlug);
    const categorySlug = diyCategorySlugForParent(row.parentSlug, row.offeringSlug);
    const category = await prisma.diyCategory.findUnique({ where: { slug: categorySlug } });
    assert(category, `DiyCategory missing ${categorySlug}`);

    let profile = authorYellowProfileByCategory(row.offeringSlug, row.serviceOffering, row.parentSlug);
    const parsed = parseDiyProfileJson(profile);
    assert(parsed.value, `parse failed ${row.offeringSlug}`);
    let validated = validateAuthoredYellowProfile(parsed.value);
    if (validated.requiresHumanReview) {
      heldReviewRequired.push(row.offeringSlug);
      profile = {
        ...parsed.value!,
        steps: [],
        metadata: { ...parsed.value!.metadata, status: "safety_review", batch: YELLOW_REMAINING_BATCH, authored: true },
      };
    } else if (!validated.ok) {
      errors.push(`${row.offeringSlug}: ${validated.issues.map((i) => i.code).join(",")}`);
      continue;
    } else {
      profile = validated.value!;
    }

    if (!heldReviewRequired.includes(row.offeringSlug)) {
      validated = validateAuthoredYellowProfile(parseDiyProfileJson(profile).value!);
      if (!validated.ok) {
        errors.push(`${row.offeringSlug} final: ${validated.issues.map((i) => i.code).join(",")}`);
        continue;
      }
      profile = validated.value!;
    }

    const existing = await prisma.diyGuide.findUnique({ where: { slug: guideSlug } });
    const guide = existing
      ? await prisma.diyGuide.update({
          where: { id: existing.id },
          data: {
            categoryId: category.id,
            categorySlug,
            serviceId: service.id,
            difficulty: profile.main.skillLevel || "limited",
            estimatedTime: profile.main.estimatedTime || "15–45 minutes",
            riskLevel: RiskLevel.yellow,
            profileJson: JSON.stringify(profile),
            profileStatus: DiyProfileStatus.draft,
            profileVersion: existing.profileVersion + 1,
            isPrimary: true,
            arabicReviewStatus: DiyArabicReviewStatus.not_started,
            updatedBy: "a42-yellow-remaining",
            relatedServiceSlugs: JSON.stringify(
              Array.from(new Set([...(profile.relatedServiceSlugs || []), row.offeringSlug])),
            ),
            relatedSlugs: JSON.stringify(profile.relatedGuideSlugs || []),
            locationSlugs: "[]",
            status: ContentStatus.draft,
            indexable: false,
          },
        })
      : await prisma.diyGuide.create({
          data: {
            slug: guideSlug,
            categoryId: category.id,
            categorySlug,
            serviceId: service.id,
            difficulty: profile.main.skillLevel || "limited",
            estimatedTime: profile.main.estimatedTime || "15–45 minutes",
            riskLevel: RiskLevel.yellow,
            schemaType: "howto",
            status: ContentStatus.draft,
            indexable: false,
            profileJson: JSON.stringify(profile),
            profileStatus: DiyProfileStatus.draft,
            profileVersion: 1,
            isPrimary: true,
            arabicReviewStatus: DiyArabicReviewStatus.not_started,
            createdBy: "a42-yellow-remaining",
            updatedBy: "a42-yellow-remaining",
            relatedServiceSlugs: JSON.stringify(
              Array.from(new Set([...(profile.relatedServiceSlugs || []), row.offeringSlug])),
            ),
            relatedSlugs: JSON.stringify(profile.relatedGuideSlugs || []),
            locationSlugs: "[]",
            translations: {
              create: [
                {
                  locale: "en",
                  title: `${row.serviceOffering} — limited DIY troubleshooting`,
                  problem: profile.main.symptoms || profile.main.overview,
                  quickAnswer: profile.main.canIDoIt,
                  difficulty: profile.main.skillLevel,
                  estimatedTime: profile.main.estimatedTime,
                  tools: "[]",
                  materials: "[]",
                  safety: profile.safety.warnings.join(" "),
                  steps: "[]",
                  checkWork: "",
                  whenToStop: profile.safety.stopConditions.join(" "),
                  professionalFallback: profile.professional.professionalFallback,
                  seoTitle: `${row.serviceOffering} DIY (draft)`,
                  metaDescription: "Draft YELLOW limited troubleshooting — not published.",
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
          title: `${row.serviceOffering} — limited DIY troubleshooting`,
          problem: profile.main.symptoms || profile.main.overview,
          quickAnswer: profile.main.canIDoIt,
          difficulty: profile.main.skillLevel,
          estimatedTime: profile.main.estimatedTime,
          safety: profile.safety.warnings.join(" "),
          whenToStop: profile.safety.stopConditions.join(" "),
          professionalFallback: profile.professional.professionalFallback,
          seoTitle: `${row.serviceOffering} DIY (draft)`,
          metaDescription: "Draft YELLOW limited troubleshooting — not published.",
        },
      });
    }

    // Demote any other primary on this service
    await prisma.diyGuide.updateMany({
      where: { serviceId: service.id, isPrimary: true, NOT: { id: guide.id } },
      data: { isPrimary: false },
    });
    await prisma.service.update({
      where: { id: service.id },
      data: { primaryDiyGuideId: guide.id },
    });

    authored.push({
      slug: row.offeringSlug,
      title: `${row.serviceOffering} — limited DIY troubleshooting`,
      guideSlug,
      parentSlug: row.parentSlug,
      profileStatus: "draft",
      safetyOk: !heldReviewRequired.includes(row.offeringSlug),
      reviewStatus: heldReviewRequired.includes(row.offeringSlug) ? "safety_review" : "draft",
    });
  }

  // Fingerprint check
  const existingSixAfter = await prisma.diyGuide.findMany({
    where: { slug: { in: [...EXISTING_SIX_GUIDES] } },
    include: { translations: true },
  });
  for (const g of existingSixAfter) {
    const en = g.translations.find((t) => t.locale === "en");
    const fp = `${en?.steps ?? ""}|${en?.quickAnswer ?? ""}|${en?.safety ?? ""}`;
    assert(bodyFingerprint.get(g.slug) === fp, `existing guide body changed: ${g.slug}`);
  }

  const stillRemaining = listRemainingYellow().filter((r) => !authored.some((a) => a.slug === r.offeringSlug));
  // After this apply, remaining among original list minus what we just did — recount from DB primary profiles
  const report = {
    meta: {
      phase: "A4.2",
      batch: YELLOW_REMAINING_BATCH,
      generated: new Date().toISOString().slice(0, 10),
      offset,
      batchSize,
      yellowAuthoredThisBatch: authored.length,
      totalRemainingBefore: totalRemaining,
      heldReviewRequired,
      skippedHubs: [...MISSING_HUBS],
      skippedPainting: YELLOW_SKIP_PAINTING,
      errors: errors.length,
    },
    authored,
    errors,
    remainingAfterBatch: stillRemaining.map((r) => r.offeringSlug),
  };

  writeFileSync(join(process.cwd(), "docs/diy-authoring-a42-yellow-remaining.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.meta, null, 2));
  if (errors.length) {
    console.error("ERRORS", errors);
    process.exit(1);
  }
  console.log(`YELLOW remaining batch applied: ${authored.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
