/**
 * Replace template service copy with visitor-specific copy.
 * Does not change status, coverage, slugs, or publish state.
 */
import { prisma } from "../src/server/db";
import { APPROVED_CATEGORIES } from "../prisma/data/catalog-a1";
import { buildVisitorServiceCopy, isTemplateServiceCopy } from "../src/lib/catalog/service-visitor-copy";

const CATEGORY_AR: Record<string, string> = Object.fromEntries(
  APPROVED_CATEGORIES.map((cat) => [cat.slug, cat.nameAr]),
);

function faq(locale: "en" | "ar", name: string) {
  if (locale === "ar") {
    return JSON.stringify([
      { q: `ماذا يشمل ${name}؟`, a: "يبدأ بتقييم ما تذكره، ثم يحدد الفني إن كان المطلوب فحصاً أو إصلاحاً أو استبدالاً." },
      { q: "هل ذكر الخدمة يعني أنها متاحة في كل منطقة؟", a: "لا. ذكر الخدمة لا يعني التغطية. يُؤكد التوفر لكل طلب." },
    ]);
  }
  return JSON.stringify([
    { q: `What does ${name} include?`, a: "It starts with what you report. The technician then says whether inspection, repair, or replacement is the next step." },
    { q: "Does listing this service mean it is available everywhere?", a: "No. A listed service is not coverage. Availability is confirmed for each request." },
  ]);
}

async function main() {
  const rows = await prisma.service.findMany({
    include: { translations: true, category: true },
    orderBy: { slug: "asc" },
  });
  let updated = 0;
  let skipped = 0;
  for (const row of rows) {
    const en = row.translations.find((t) => t.locale === "en");
    if (!en || !isTemplateServiceCopy(en.shortDescription)) {
      skipped += 1;
      continue;
    }
    const categorySlug = row.category?.slug || "general-maintenance";
    const category = APPROVED_CATEGORIES.find((cat) => cat.slug === categorySlug);
    const copy = buildVisitorServiceCopy({
      slug: row.slug,
      nameEn: en.name || row.slug,
      categorySlug,
      categoryNameEn: category?.nameEn || "Maintenance",
      categoryNameAr: CATEGORY_AR[categorySlug] || "الصيانة",
    });
    await prisma.serviceI18n.update({
      where: { serviceId_locale: { serviceId: row.id, locale: "en" } },
      data: {
        shortDescription: copy.shortEn,
        longDescription: copy.longEn,
        whoItIsFor: copy.whoEn,
        whatWeDo: copy.whatEn,
        whenProfessional: copy.whenEn,
        process: copy.processEn,
        pricingInfo: copy.priceEn,
        professionalFallback: copy.safetyEn,
        safetyNotes: copy.safetyEn,
        seoTitle: `${copy.nameEn} | Al Najah Al Daem`.slice(0, 60),
        metaDescription: copy.shortEn.slice(0, 155),
        faq: faq("en", copy.nameEn),
      },
    });
    const existingAr = row.translations.find((t) => t.locale === "ar");
    const keepArName =
      existingAr?.name &&
      /[\u0600-\u06FF]/.test(existingAr.name) &&
      !existingAr.name.startsWith("خدمة ضمن");
    await prisma.serviceI18n.update({
      where: { serviceId_locale: { serviceId: row.id, locale: "ar" } },
      data: {
        name: keepArName ? existingAr.name : copy.nameAr,
        shortDescription: copy.shortAr,
        longDescription: copy.longAr,
        whoItIsFor: copy.whoAr,
        whatWeDo: copy.whatAr,
        whenProfessional: copy.whenAr,
        process: copy.processAr,
        pricingInfo: copy.priceAr,
        professionalFallback: copy.safetyAr,
        safetyNotes: copy.safetyAr,
        seoTitle: `${keepArName ? existingAr.name : copy.nameAr} | النجاح الدائم`.slice(0, 60),
        metaDescription: copy.shortAr.slice(0, 155),
        faq: faq("ar", keepArName ? existingAr.name : copy.nameAr),
      },
    });
    updated += 1;
  }
  console.log(JSON.stringify({ updated, skipped, total: rows.length }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
