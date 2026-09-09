/**
 * A4.2 Batch 2 apply — author exactly 20 YELLOW profiles.
 * Creates diy-{slug} as new primary; existing guides stay related only.
 * Does not reset DB. Does not author hubs / painting-services.
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
import { authorYellowProfile, yellowPrimaryGuideSlug } from "../src/lib/diy/author-yellow-profiles";
import { parseDiyProfileJson, validateAuthoredYellowProfile } from "../src/lib/diy/profile-validate";
import { diyCategorySlugForParent, EXISTING_SIX_GUIDES, LABEL_MISMATCH_GUIDES } from "../src/lib/diy/coverage";
import { selectYellowBatch2 } from "../src/lib/diy/yellow-batch";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function main() {
  const selection = selectYellowBatch2();
  assert(selection.selected.length === 20, `expected 20 selected, got ${selection.selected.length}`);
  assert(selection.skippedHubs.length === 6, `expected 6 skipped hubs, got ${selection.skippedHubs.length}`);
  assert(selection.skippedPainting, "painting-services must be skipped");

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

  const paint = await prisma.service.findUnique({ where: { slug: "painting-services" } });
  assert(paint?.riskLevel === "green" && paint.diyAvailable === true, "painting-services must remain green/diy");

  const authored: Array<{
    slug: string;
    title: string;
    guideSlug: string;
    profileStatus: string;
    safetyOk: boolean;
    reviewStatus: string;
  }> = [];
  const heldReviewRequired: string[] = [];
  const errors: string[] = [];

  for (const row of selection.selected) {
    const service = await prisma.service.findUnique({
      where: { slug: row.offeringSlug },
      include: { primaryDiyGuide: true },
    });
    if (!service) {
      errors.push(`Service missing ${row.offeringSlug}`);
      continue;
    }

    const guideSlug = yellowPrimaryGuideSlug(row.offeringSlug);
    const categorySlug = diyCategorySlugForParent(row.parentSlug, row.offeringSlug);
    const category = await prisma.diyCategory.findUnique({ where: { slug: categorySlug } });
    assert(category, `DiyCategory missing ${categorySlug}`);

    let profile = authorYellowProfile(row.offeringSlug, row.serviceOffering);
    const parsed = parseDiyProfileJson(profile);
    assert(parsed.value, `parse failed ${row.offeringSlug}`);
    const validated = validateAuthoredYellowProfile(parsed.value);
    if (!validated.ok || validated.requiresHumanReview) {
      profile = {
        ...parsed.value!,
        metadata: {
          ...parsed.value!.metadata,
          status: "safety_review",
          authored: true,
          batch: "A4.2-YELLOW-1",
        },
        matrixSafety: validated.requiresHumanReview ? "REVIEW_REQUIRED" : parsed.value!.matrixSafety,
        safety: {
          ...parsed.value!.safety,
          safetyLevel: validated.requiresHumanReview ? "REVIEW_REQUIRED" : parsed.value!.safety.safetyLevel,
        },
      };
      // Spec: if unsafe, mark REVIEW_REQUIRED and hold — do not force YELLOW content
      if (validated.requiresHumanReview) {
        heldReviewRequired.push(row.offeringSlug);
        // Still persist as draft hold profile without dangerous steps
        profile.steps = [];
        profile.metadata.status = "safety_review";
      } else if (!validated.ok) {
        errors.push(
          `${row.offeringSlug}: ${validated.issues.map((i) => i.code).join(",")}`,
        );
      }
    }

    // Re-validate after any hold mutation
    if (!heldReviewRequired.includes(row.offeringSlug)) {
      const again = validateAuthoredYellowProfile(parseDiyProfileJson(profile).value!);
      if (!again.ok) {
        errors.push(`${row.offeringSlug} final: ${again.issues.map((i) => i.code).join(",")}`);
        continue;
      }
      profile = again.value!;
    }

    const relatedGuides = profile.relatedGuideSlugs ?? [];
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
            updatedBy: "a42-yellow-1",
            relatedServiceSlugs: JSON.stringify(
              Array.from(new Set([...(profile.relatedServiceSlugs || []), row.offeringSlug])),
            ),
            relatedSlugs: JSON.stringify(relatedGuides),
            locationSlugs: "[]",
            // never publish
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
            createdBy: "a42-yellow-1",
            updatedBy: "a42-yellow-1",
            relatedServiceSlugs: JSON.stringify(
              Array.from(new Set([...(profile.relatedServiceSlugs || []), row.offeringSlug])),
            ),
            relatedSlugs: JSON.stringify(relatedGuides),
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

    // Explicit Batch 2 primary assignment to diy-{slug} (not silent overwrite of unrelated guides)
    await prisma.service.update({
      where: { id: service.id },
      data: { primaryDiyGuideId: guide.id },
    });

    authored.push({
      slug: row.offeringSlug,
      title: `${row.serviceOffering} — limited DIY troubleshooting`,
      guideSlug,
      profileStatus: "draft",
      safetyOk: !heldReviewRequired.includes(row.offeringSlug) && errors.every((e) => !e.startsWith(row.offeringSlug)),
      reviewStatus: heldReviewRequired.includes(row.offeringSlug) ? "REVIEW_REQUIRED_HOLD" : "draft",
    });
  }

  // Preserve existing six bodies
  const existingSixAfter = await prisma.diyGuide.findMany({
    where: { slug: { in: [...EXISTING_SIX_GUIDES] } },
    include: { translations: true },
  });
  for (const g of existingSixAfter) {
    const en = g.translations.find((t) => t.locale === "en");
    const fp = `${en?.steps ?? ""}|${en?.quickAnswer ?? ""}|${en?.safety ?? ""}`;
    assert(fp === bodyFingerprint.get(g.slug), `existing guide body changed: ${g.slug}`);
  }
  for (const slug of LABEL_MISMATCH_GUIDES) {
    assert(existingSixAfter.some((g) => g.slug === slug), `label mismatch missing ${slug}`);
  }

  // painting unchanged
  const paintAfter = await prisma.service.findUnique({ where: { slug: "painting-services" } });
  assert(
    paintAfter?.riskLevel === "green" && paintAfter.diyAvailable === true,
    "painting-services changed",
  );

  const report = {
    meta: {
      phase: "A4.2",
      batch: "YELLOW-1",
      generated: new Date().toISOString().slice(0, 10),
      yellowAuthoredThisBatch: authored.length,
      yellowRemainingAfter: 128 - authored.filter((a) => a.reviewStatus === "draft").length,
      skippedHubs: selection.skippedHubs,
      skippedPainting: "painting-services",
      heldReviewRequired,
      greenAuthoredMin: 46,
      redAuthored: 0,
      reviewRequiredAuthored: 0,
      stop: "Batch 2 complete — do not continue remaining YELLOW / RED / RR",
    },
    authored,
    errors,
  };

  const outPath = join(process.cwd(), "docs/diy-authoring-a42-yellow-batch2.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify({ ok: errors.length === 0 && authored.length === 20, ...report.meta, errors, outPath }, null, 2));
  if (errors.length || authored.length !== 20) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
