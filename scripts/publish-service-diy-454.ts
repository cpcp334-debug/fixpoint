/**
 * Publish one visitor DIY / stop-and-observe guide per approved offering (454).
 * Hazardous jobs do not include repair steps.
 * Does not mark hazardous services as DIY-available.
 */
import { prisma } from "../src/server/db";
import {
  ACTIVE_CATEGORY_ANCHORS,
  APPROVED_CATEGORIES,
  APPROVED_CHILDREN,
  DRAFT_CATEGORY_ANCHORS,
  childSlug,
} from "../prisma/data/catalog-a1";
import { composeServiceDiyGuide, renderedDiyWords, type ServiceGuideInput } from "../src/lib/diy/service-guide";

const HUBS = ["refrigerator", "microwave", "washing-machine", "water-heater", "dishwasher", "oven", "burner-cooker"];

function offerings(): ServiceGuideInput[] {
  const cats = new Map(APPROVED_CATEGORIES.map((c) => [c.slug, c.nameEn]));
  const rows: ServiceGuideInput[] = [];
  for (const a of [...ACTIVE_CATEGORY_ANCHORS, ...DRAFT_CATEGORY_ANCHORS]) {
    rows.push({
      slug: a.slug,
      nameEn: a.nameEn,
      categorySlug: a.categorySlug,
      categoryNameEn: cats.get(a.categorySlug) || a.nameEn,
      href: `/${a.slug}`,
    });
  }
  for (const slug of HUBS) {
    rows.push({
      slug,
      nameEn: cats.get(slug) || slug,
      categorySlug: slug,
      categoryNameEn: cats.get(slug) || slug,
      href: `/services/${slug}`,
    });
  }
  for (const child of APPROVED_CHILDREN) {
    const slug = childSlug(child);
    rows.push({
      slug,
      nameEn: child.nameEn,
      categorySlug: child.categorySlug,
      categoryNameEn: cats.get(child.categorySlug) || child.categorySlug,
      href: `/${slug}`,
    });
  }
  return rows;
}

const DIY_RENDERED_WORD_MIN = 1000;

async function ensureCategory(slug: string, nameEn: string, nameAr: string) {
  const arName = nameAr && !nameAr.startsWith("REVIEW_REQUIRED") ? nameAr : nameEn;
  const existing = await prisma.diyCategory.findUnique({ where: { slug }, select: { id: true } });
  if (existing) {
    await prisma.diyCategory.update({ where: { id: existing.id }, data: { status: "published", indexable: true } });
    await prisma.diyCategoryI18n.updateMany({
      where: { categoryId: existing.id, locale: "ar" },
      data: {
        name: arName,
        description: `أدلة لصاحب المنزل ضمن ${arName}. الأعمال الخطرة تشرح متى تتوقف، لا كيف تُصلح.`,
      },
    });
    return existing.id;
  }
  const created = await prisma.diyCategory.create({
    data: {
      slug,
      status: "published",
      indexable: true,
      sortOrder: 20,
      translations: {
        create: [
          {
            locale: "en",
            name: nameEn,
            description: `Homeowner guides for ${nameEn}. Hazardous jobs explain what to stop, not how to repair.`,
            seoTitle: `${nameEn} guides | Al Najah Al Daem`.slice(0, 60),
            metaDescription: `Guides for ${nameEn} in the UAE. Safe preparation where it is allowed, and stop rules where it is not.`,
          },
          {
            locale: "ar",
            name: arName,
            description: `أدلة لصاحب المنزل ضمن ${arName}. الأعمال الخطرة تشرح متى تتوقف، لا كيف تُصلح.`,
            seoTitle: `أدلة ${arName} | النجاح الدائم`.slice(0, 60),
            metaDescription: `أدلة ${arName} في الإمارات. تجهيز آمن حيث يجوز، وقواعد توقف حيث لا يجوز.`,
          },
        ],
      },
    },
  });
  return created.id;
}

async function main() {
  const list = offerings();
  if (list.length !== 454) throw new Error(`expected 454 offerings, got ${list.length}`);

  const categoryIds = new Map<string, string>();
  for (const cat of APPROVED_CATEGORIES) {
    categoryIds.set(cat.slug, await ensureCategory(cat.slug, cat.nameEn, cat.nameAr));
  }

  let published = 0;
  let failed = 0;
  const failures: string[] = [];
  let minEn = 99999;
  let minAr = 99999;

  for (const item of list) {
    const guide = composeServiceDiyGuide(item);
    const enWords = renderedDiyWords(guide.en);
    const arWords = renderedDiyWords(guide.ar);
    minEn = Math.min(minEn, enWords);
    minAr = Math.min(minAr, arWords);
    if (enWords < DIY_RENDERED_WORD_MIN || arWords < DIY_RENDERED_WORD_MIN) {
      failed += 1;
      failures.push(`${guide.slug}: en_${enWords} ar_${arWords}`);
      continue;
    }
    const categoryId = categoryIds.get(item.categorySlug);
    if (!categoryId) throw new Error(`missing DIY category ${item.categorySlug}`);
    const service = await prisma.service.findUnique({ where: { slug: item.slug }, select: { id: true, primaryDiyGuideId: true } });

    const data = {
      categoryId,
      categorySlug: item.categorySlug,
      serviceId: service?.id,
      difficulty: guide.en.difficulty,
      estimatedTime: guide.en.estimatedTime,
      riskLevel: guide.riskLevel as "red" | "yellow",
      schemaType: guide.schemaType,
      status: "published" as const,
      indexable: true,
      relatedSlugs: "[]",
      relatedServiceSlugs: JSON.stringify(service ? [item.slug] : []),
      locationSlugs: "[]",
      profileJson: JSON.stringify({ source: "service-diy-454", hazardous: guide.danger, repairSteps: false }),
      profileStatus: "published" as const,
      isPrimary: false,
      arabicReviewStatus: arWords >= DIY_RENDERED_WORD_MIN ? ("reviewed" as const) : ("not_started" as const),
      publishedAt: new Date(),
      updatedBy: "publish-service-diy-454",
    };
    const translations = {
      create: (["en", "ar"] as const).map((locale) => {
        const copy = guide[locale];
        return {
          locale,
          title: copy.title,
          problem: copy.problem,
          quickAnswer: copy.quickAnswer,
          difficulty: copy.difficulty,
          estimatedTime: copy.estimatedTime,
          tools: JSON.stringify(copy.tools),
          materials: JSON.stringify(copy.materials),
          safety: copy.safety,
          steps: JSON.stringify(copy.steps),
          checkWork: copy.checkWork,
          whenToStop: copy.whenToStop,
          professionalFallback: copy.professionalFallback,
          seoTitle: copy.seoTitle,
          metaDescription: copy.metaDescription.slice(0, 160),
          faq: JSON.stringify(copy.faq),
        };
      }),
    };

    const existing = await prisma.diyGuide.findUnique({ where: { slug: guide.slug }, select: { id: true, publishedAt: true } });
    let guideId: string;
    if (existing) {
      await prisma.diyGuideI18n.deleteMany({ where: { guideId: existing.id } });
      const updated = await prisma.diyGuide.update({
        where: { id: existing.id },
        data: { ...data, publishedAt: existing.publishedAt ?? new Date(), translations },
      });
      guideId = updated.id;
    } else {
      const created = await prisma.diyGuide.create({ data: { slug: guide.slug, ...data, translations } });
      guideId = created.id;
    }
    if (service && !service.primaryDiyGuideId) {
      await prisma.service.update({ where: { id: service.id }, data: { primaryDiyGuideId: guideId } });
    }
    published += 1;
  }

  const publicCount = await prisma.diyGuide.count({ where: { status: "published", indexable: true, slug: { startsWith: "diy-" } } });
  console.log(JSON.stringify({ offerings: list.length, published, failed, publicCount, minEn, minAr, sampleFailures: failures.slice(0, 6) }, null, 2));
  if (failed) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
