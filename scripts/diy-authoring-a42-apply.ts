/**
 * A4.2 apply — 311 coverage shells + Batch 1 GREEN EN authoring.
 * Does NOT publish. Does NOT author YELLOW/RED/RR. Does NOT create missing hubs.
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
import { authorGreenProfile, PLUMBING_RELATED_GUIDE_SLUG } from "../src/lib/diy/author-green-profiles";
import { parseDiyProfileJson, validateAuthoredGreenProfile } from "../src/lib/diy/profile-validate";
import {
  buildCoverageRegistry,
  diyCategorySlugForParent,
  EXISTING_SIX_GUIDES,
  LABEL_MISMATCH_GUIDES,
  loadMatrixRows,
  MISSING_HUBS,
  shellProfile,
} from "../src/lib/diy/coverage";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function riskFromMatrix(diyStatus: string): RiskLevel {
  if (diyStatus === "GREEN") return RiskLevel.green;
  if (diyStatus === "YELLOW") return RiskLevel.yellow;
  return RiskLevel.red;
}

async function ensureCategory(slug: string) {
  const row = await prisma.diyCategory.findUnique({ where: { slug } });
  assert(row, `DiyCategory missing: ${slug} — seed DIY categories first`);
  return row;
}

async function upsertGuide(args: {
  slug: string;
  categorySlug: string;
  serviceId: string | null;
  riskLevel: RiskLevel;
  profileJson: string;
  isPrimary: boolean;
  difficulty: string;
  estimatedTime: string;
  relatedServiceSlugs: string[];
  relatedSlugs: string[];
  titleEn: string;
  preserveExistingI18n: boolean;
}) {
  const category = await ensureCategory(args.categorySlug);
  const existing = await prisma.diyGuide.findUnique({
    where: { slug: args.slug },
    include: { translations: true },
  });

  const baseData = {
    categoryId: category.id,
    categorySlug: args.categorySlug,
    serviceId: args.serviceId,
    difficulty: args.difficulty,
    estimatedTime: args.estimatedTime,
    riskLevel: args.riskLevel,
    profileJson: args.profileJson,
    profileStatus: DiyProfileStatus.draft,
    profileVersion: 1,
    isPrimary: args.isPrimary,
    arabicReviewStatus: DiyArabicReviewStatus.not_started,
    createdBy: "a42-batch1",
    updatedBy: "a42-batch1",
    relatedServiceSlugs: JSON.stringify(args.relatedServiceSlugs),
    relatedSlugs: JSON.stringify(args.relatedSlugs),
    locationSlugs: "[]",
    // Never auto-publish new profiles; do not unpublish existing public guides.
    ...(existing
      ? {}
      : {
          status: ContentStatus.draft,
          indexable: false,
          schemaType: "howto",
        }),
  };

  if (existing) {
    return prisma.diyGuide.update({
      where: { id: existing.id },
      data: baseData,
    });
  }

  return prisma.diyGuide.create({
    data: {
      slug: args.slug,
      ...baseData,
      translations: {
        create: [
          {
            locale: "en",
            title: args.titleEn,
            problem: args.titleEn,
            quickAnswer: "Draft DIY profile — not published.",
            difficulty: args.difficulty,
            estimatedTime: args.estimatedTime,
            tools: "[]",
            materials: "[]",
            safety: "Follow profileJson safety fields. Draft only.",
            steps: "[]",
            checkWork: "",
            whenToStop: "Stop if unsafe.",
            professionalFallback:
              "ALNAJAH ALDAEM can inspect the issue and recommend the appropriate maintenance or repair service.",
            seoTitle: args.titleEn,
            metaDescription: "Draft DIY profile",
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
}

async function main() {
  const matrixRows = loadMatrixRows();
  assert(matrixRows.length === 311, `matrix rows ${matrixRows.length}`);

  for (const hub of MISSING_HUBS) {
    const svc = await prisma.service.findUnique({ where: { slug: hub } });
    assert(!svc, `missing hub must stay unresolved: ${hub}`);
  }

  const existingSixBefore = await prisma.diyGuide.findMany({
    where: { slug: { in: [...EXISTING_SIX_GUIDES] } },
    include: { translations: true },
  });
  assert(existingSixBefore.length === 6, `expected 6 existing guides, found ${existingSixBefore.length}`);
  const bodyFingerprint = new Map(
    existingSixBefore.map((g) => {
      const en = g.translations.find((t) => t.locale === "en");
      return [g.slug, `${en?.steps ?? ""}|${en?.quickAnswer ?? ""}|${en?.safety ?? ""}`];
    }),
  );

  const registry = buildCoverageRegistry();
  const greenAuthored: string[] = [];
  const greenReviewRequired: string[] = [];
  const errors: string[] = [];
  const guidesWithGreenProfile = new Set<string>();

  // Pass 1: GREEN authoring first (so shared primaries are not overwritten by earlier YELLOW shells)
  // Pass 2: coverage shells + primary links for non-GREEN
  const orderedRows = [
    ...matrixRows.filter((r) => r.diyStatus === "GREEN"),
    ...matrixRows.filter((r) => r.diyStatus !== "GREEN"),
  ];

  for (const row of orderedRows) {
    if ((MISSING_HUBS as readonly string[]).includes(row.offeringSlug)) {
      continue;
    }

    const service = await prisma.service.findUnique({
      where: { slug: row.offeringSlug },
      include: { primaryDiyGuide: true },
    });
    if (!service) {
      errors.push(`Service missing for matrix offering ${row.offeringSlug}`);
      continue;
    }

    const diyStatus = row.diyStatus as "GREEN" | "YELLOW" | "RED" | "REVIEW_REQUIRED";
    const coverage = registry.find((r) => r.serviceSlug === row.offeringSlug)!;
    const guideSlug = coverage.primaryGuideSlug;
    assert(guideSlug, `primary guide slug missing for ${row.offeringSlug}`);
    const categorySlug = diyCategorySlugForParent(row.parentSlug, row.offeringSlug);

    let profileJsonObj =
      diyStatus === "GREEN"
        ? authorGreenProfile(row.offeringSlug, row.serviceOffering)
        : shellProfile(diyStatus);

    const alreadyHasGreenProfile = guidesWithGreenProfile.has(guideSlug);

    if (diyStatus === "GREEN" && !alreadyHasGreenProfile) {
      const parsed = parseDiyProfileJson(profileJsonObj);
      assert(parsed.value, `parse failed ${row.offeringSlug}`);
      const validated = validateAuthoredGreenProfile(parsed.value);
      if (!validated.ok || validated.requiresHumanReview) {
        profileJsonObj = {
          ...parsed.value!,
          metadata: {
            ...parsed.value!.metadata,
            status: "safety_review",
            authored: true,
            batch: "A4.2-GREEN-1",
          },
        };
        greenReviewRequired.push(row.offeringSlug);
        if (!validated.ok) {
          errors.push(
            `GREEN validation issues for ${row.offeringSlug}: ${validated.issues.map((i) => i.code).join(",")}`,
          );
        }
      } else {
        greenAuthored.push(row.offeringSlug);
      }
    } else if (diyStatus === "GREEN" && alreadyHasGreenProfile) {
      greenAuthored.push(row.offeringSlug);
    }

    if ((diyStatus === "RED" || diyStatus === "REVIEW_REQUIRED") && profileJsonObj.steps.length > 0) {
      throw new Error(`REFUSE: procedural steps on ${diyStatus} ${row.offeringSlug}`);
    }

    const relatedSlugs =
      row.offeringSlug === "plumbing-maintenance"
        ? [PLUMBING_RELATED_GUIDE_SLUG]
        : EXISTING_SIX_GUIDES.includes(guideSlug as (typeof EXISTING_SIX_GUIDES)[number])
          ? []
          : [];

    let guide;
    if (alreadyHasGreenProfile) {
      // Shared primary — do not overwrite GREEN profileJson (YELLOW plumbing → faucet guide, etc.)
      guide = await prisma.diyGuide.findUniqueOrThrow({ where: { slug: guideSlug } });
      const relatedServices = JSON.parse(guide.relatedServiceSlugs || "[]") as string[];
      const nextRelated = Array.from(new Set([...relatedServices, row.offeringSlug]));
      const patch: { relatedServiceSlugs: string; relatedSlugs?: string; serviceId?: string } = {
        relatedServiceSlugs: JSON.stringify(nextRelated),
      };
      if (row.offeringSlug === "plumbing-maintenance") {
        patch.relatedSlugs = JSON.stringify(relatedSlugs);
      }
      await prisma.diyGuide.update({ where: { id: guide.id }, data: patch });
    } else if (diyStatus === "GREEN") {
      guide = await upsertGuide({
        slug: guideSlug,
        categorySlug,
        serviceId: service.id,
        riskLevel: riskFromMatrix(diyStatus),
        profileJson: JSON.stringify(profileJsonObj),
        isPrimary: true,
        difficulty: profileJsonObj.main.skillLevel || "TBD",
        estimatedTime: profileJsonObj.main.estimatedTime || "TBD",
        relatedServiceSlugs: Array.from(
          new Set([...(profileJsonObj.relatedServiceSlugs || []), row.offeringSlug]),
        ),
        relatedSlugs,
        titleEn: `${row.serviceOffering} — DIY profile`,
        preserveExistingI18n: EXISTING_SIX_GUIDES.includes(guideSlug as (typeof EXISTING_SIX_GUIDES)[number]),
      });
      guidesWithGreenProfile.add(guideSlug);
    } else {
      // Non-GREEN shell — skip if this slug is an existing six guide that should keep body + optional green profile
      const existingGuide = await prisma.diyGuide.findUnique({ where: { slug: guideSlug } });
      if (existingGuide && EXISTING_SIX_GUIDES.includes(guideSlug as (typeof EXISTING_SIX_GUIDES)[number])) {
        const existingProfile = parseDiyProfileJson(existingGuide.profileJson);
        if (existingProfile.value?.metadata.authored) {
          guide = existingGuide;
          guidesWithGreenProfile.add(guideSlug);
          const relatedServices = JSON.parse(guide.relatedServiceSlugs || "[]") as string[];
          await prisma.diyGuide.update({
            where: { id: guide.id },
            data: {
              relatedServiceSlugs: JSON.stringify(Array.from(new Set([...relatedServices, row.offeringSlug]))),
              relatedSlugs:
                row.offeringSlug === "plumbing-maintenance"
                  ? JSON.stringify(relatedSlugs)
                  : undefined,
            },
          });
        } else {
          // Label-mismatch / yellow existing guides: attach coverage metadata without rewriting i18n bodies.
          // Still store a non-authored shell profileJson only if empty.
          const empty = !existingGuide.profileJson || existingGuide.profileJson === "{}";
          guide = await upsertGuide({
            slug: guideSlug,
            categorySlug: existingGuide.categorySlug,
            serviceId: service.id,
            riskLevel: existingGuide.riskLevel,
            profileJson: empty ? JSON.stringify(profileJsonObj) : existingGuide.profileJson,
            isPrimary: true,
            difficulty: existingGuide.difficulty,
            estimatedTime: existingGuide.estimatedTime,
            relatedServiceSlugs: Array.from(
              new Set([
                ...(JSON.parse(existingGuide.relatedServiceSlugs || "[]") as string[]),
                row.offeringSlug,
              ]),
            ),
            relatedSlugs:
              row.offeringSlug === "plumbing-maintenance"
                ? relatedSlugs
                : (JSON.parse(existingGuide.relatedSlugs || "[]") as string[]),
            titleEn: row.serviceOffering,
            preserveExistingI18n: true,
          });
        }
      } else {
        guide = await upsertGuide({
          slug: guideSlug,
          categorySlug,
          serviceId: service.id,
          riskLevel: riskFromMatrix(diyStatus),
          profileJson: JSON.stringify(profileJsonObj),
          isPrimary: true,
          difficulty: profileJsonObj.main.skillLevel || "TBD",
          estimatedTime: profileJsonObj.main.estimatedTime || "TBD",
          relatedServiceSlugs: [row.offeringSlug],
          relatedSlugs,
          titleEn: `${row.serviceOffering} — DIY coverage`,
          preserveExistingI18n: false,
        });
      }
    }

    if (service.primaryDiyGuideId && service.primaryDiyGuideId !== guide.id) {
      const current = await prisma.diyGuide.findUnique({ where: { id: service.primaryDiyGuideId } });
      console.warn(
        `skip primary reassign ${row.offeringSlug}: existing ${current?.slug} → would be ${guideSlug}`,
      );
    } else {
      await prisma.service.update({
        where: { id: service.id },
        data: { primaryDiyGuideId: guide.id },
      });
    }
  }

  // Preserve existing six guide bodies
  const existingSixAfter = await prisma.diyGuide.findMany({
    where: { slug: { in: [...EXISTING_SIX_GUIDES] } },
    include: { translations: true },
  });
  for (const g of existingSixAfter) {
    const en = g.translations.find((t) => t.locale === "en");
    const fp = `${en?.steps ?? ""}|${en?.quickAnswer ?? ""}|${en?.safety ?? ""}`;
    assert(fp === bodyFingerprint.get(g.slug), `existing guide body changed: ${g.slug}`);
  }

  // Label mismatches remain review-only (bodies unchanged; still present)
  for (const slug of LABEL_MISMATCH_GUIDES) {
    assert(
      existingSixAfter.some((g) => g.slug === slug),
      `label mismatch guide missing: ${slug}`,
    );
  }

  const coveragePath = join(process.cwd(), "docs/diy-profile-coverage-a42.json");
  const payload = {
    meta: {
      phase: "A4.2",
      batch: "GREEN-1",
      generated: new Date().toISOString().slice(0, 10),
      totalCoverage: registry.length,
      serviceRecordsCovered: registry.filter((r) => r.hasServiceRecord).length,
      unresolvedMissingHubs: registry.filter((r) => !r.hasServiceRecord).length,
      greenAuthored: greenAuthored.length,
      greenReviewRequired: greenReviewRequired.length,
      yellowAuthored: 0,
      redAuthored: 0,
      reviewRequiredAuthored: 0,
      arabic: "not_started",
      existingGuides: 6,
      labelMismatches: [...LABEL_MISMATCH_GUIDES],
      missingHubs: [...MISSING_HUBS],
      stop: "Batch 1 complete — do not start YELLOW/RED/RR/Arabic",
    },
    rows: registry,
    greenAuthored,
    greenReviewRequired,
    errors,
  };
  writeFileSync(coveragePath, JSON.stringify(payload, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        ok: errors.length === 0,
        coverage: registry.length,
        greenAuthored: greenAuthored.length,
        greenReviewRequired: greenReviewRequired.length,
        errors,
        coveragePath,
      },
      null,
      2,
    ),
  );

  if (errors.length) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
