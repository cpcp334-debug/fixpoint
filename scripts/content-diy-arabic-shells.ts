/**
 * Author conservative Arabic shells for DIY guides that lack Arabic script.
 * Does NOT rewrite EN bodies. Does NOT touch the existing six preserved guides' EN.
 * Existing six AR (already Arabic) are left unchanged.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { EXISTING_SIX_GUIDES } from "../src/lib/diy/coverage";

const PRESERVE = new Set(EXISTING_SIX_GUIDES as readonly string[]);

function hasArabic(text: string | null | undefined) {
  return /[\u0600-\u06FF]/.test(text || "");
}

async function main() {
  const guides = await prisma.diyGuide.findMany({
    include: { translations: true, service: { select: { slug: true, riskLevel: true } } },
    orderBy: { slug: "asc" },
  });

  const report = {
    updated: 0,
    skippedHasArabic: 0,
    skippedPreserveAr: 0,
    failed: [] as Array<{ slug: string; error: string }>,
  };

  for (const guide of guides) {
    const en = guide.translations.find((t) => t.locale === "en");
    const ar = guide.translations.find((t) => t.locale === "ar");
    if (hasArabic(ar?.title) || hasArabic(ar?.problem)) {
      report.skippedHasArabic += 1;
      continue;
    }

    const problemAr = `هذا الدليل يوضح فحوصات محدودة وآمنة فقط عند السماح بها حسب تصنيف السلامة. لا يقدّم إجراءات إصلاح خطرة.`;
    const quickAr = `تحقق بأمان، وتوقّف فورًا عند أي خطر، واطلب فنيًا عند الشك.`;
    const safetyAr = `لا تتعامل مع الكهرباء الحية أو الغاز أو أنظمة التبريد المغلقة أو الأعمال الإنشائية الخطرة.`;
    const whenStopAr = `توقّف واطلب مساعدة مهنية عند وجود خطر أو عدم وضوح السبب أو الحاجة لأدوات متخصصة.`;
    const fallbackAr = `هل تحتاج مساعدة؟ يمكن لفريق النجاح الدائم فحص المشكلة والتوصية بالخدمة المناسبة للصيانة أو الإصلاح.`;
    const safeTitleAr = `دليل DIY معتمد — مراجعة عربية مطلوبة`;
    const seoTitleAr = `دليل DIY — مراجعة عربية | النجاح الدائم`;
    const metaAr = `محتوى عربي محافظ للسلامة فقط. لا إجراءات إصلاح خطرة. مراجعة تقنية مطلوبة قبل الفهرسة.`;

    try {
      await prisma.diyGuideI18n.upsert({
        where: { guideId_locale: { guideId: guide.id, locale: "ar" } },
        create: {
          guideId: guide.id,
          locale: "ar",
          title: safeTitleAr,
          problem: problemAr,
          quickAnswer: quickAr,
          safety: safetyAr,
          whenToStop: whenStopAr,
          tools: "[]",
          materials: "[]",
          steps: "[]",
          faq: "[]",
          professionalFallback: fallbackAr,
          seoTitle: seoTitleAr,
          metaDescription: metaAr,
        },
        update: {
          title: safeTitleAr,
          problem: problemAr,
          quickAnswer: quickAr,
          safety: safetyAr,
          whenToStop: whenStopAr,
          professionalFallback: fallbackAr,
          seoTitle: seoTitleAr,
          metaDescription: metaAr,
        },
      });
      await prisma.diyGuide.update({
        where: { id: guide.id },
        data: { arabicReviewStatus: "translation_review" },
      });
      report.updated += 1;
      void PRESERVE;
    } catch (e) {
      report.failed.push({
        slug: guide.slug,
        error: e instanceof Error ? e.message.slice(0, 240) : String(e).slice(0, 240),
      });
    }
  }

  const out = join(process.cwd(), "docs/content-diy-arabic-shells.json");
  writeFileSync(out, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(
    JSON.stringify(
      {
        updated: report.updated,
        skippedHasArabic: report.skippedHasArabic,
        failedCount: report.failed.length,
        failedSample: report.failed.slice(0, 5),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
