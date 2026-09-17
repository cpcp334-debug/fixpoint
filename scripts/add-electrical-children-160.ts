/**
 * Add missing approved electrical children.
 * Draft only. Not indexable. No ServiceLocation rows. No status changes on existing rows.
 */
import { prisma } from "../src/server/db";
import { APPROVED_CHILDREN, childSchemaData, childSlug } from "../prisma/data/catalog-a1";
import { buildVisitorServiceCopy } from "../src/lib/catalog/service-visitor-copy";

function faq(locale: "en" | "ar", name: string) {
  if (locale === "ar") {
    return JSON.stringify([
      { q: `ماذا يشمل ${name}؟`, a: "يبدأ بتقييم العَرَض الذي تذكره. الفني يحدد إن كان المطلوب فحصاً أو إصلاحاً أو استبدالاً. لا يوجد دليل منزلي للكهرباء الحية." },
      { q: "هل ذكر الخدمة يعني أنها متاحة في كل منطقة؟", a: "لا. ذكر الخدمة لا يعني التغطية. يُؤكد التوفر لكل طلب." },
    ]);
  }
  return JSON.stringify([
    { q: `What does ${name} include?`, a: "It starts with the symptom you report. The technician then says whether inspection, repair, or replacement is the next step. There is no DIY guide for live electrical work." },
    { q: "Does listing this service mean it is available everywhere?", a: "No. A listed service is not coverage. Availability is confirmed for each request." },
  ]);
}

async function main() {
  const category = await prisma.serviceCategory.findUnique({ where: { slug: "electrical" } });
  if (!category) throw new Error("electrical category missing");

  const electrical = APPROVED_CHILDREN.filter((c) => c.categorySlug === "electrical");
  if (electrical.length !== 160) throw new Error(`expected 160 electrical children, got ${electrical.length}`);

  let created = 0;
  let already = 0;
  for (const def of electrical) {
    const slug = childSlug(def);
    const existing = await prisma.service.findUnique({ where: { slug }, select: { id: true } });
    if (existing) {
      await prisma.service.update({
        where: { id: existing.id },
        data: { riskLevel: "red", diyAvailable: false },
      });
      already += 1;
      continue;
    }
    const copy = buildVisitorServiceCopy({
      slug,
      nameEn: def.nameEn,
      categorySlug: "electrical",
      categoryNameEn: "Electrical Maintenance",
      categoryNameAr: "الكهرباء",
    });
    await prisma.service.create({
      data: {
        categoryId: category.id,
        slug,
        serviceType: "maintenance",
        status: "draft",
        riskLevel: "red",
        diyAvailable: false,
        quoteMethod: "inspection",
        inspectionRequired: true,
        bookingEnabled: true,
        emergencyAvailable: false,
        amcAvailable: false,
        indexable: false,
        relatedServiceSlugs: "[]",
        aiIntakeQuestions: JSON.stringify([{ en: "Describe what you saw, smelled, or heard, and which room.", ar: "صف ما رأيته أو شممته أو سمعته، وفي أي غرفة." }]),
        schemaData: JSON.stringify(childSchemaData(def)),
        translations: {
          create: [
            {
              locale: "en",
              name: copy.nameEn,
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
              keywords: copy.nameEn,
              faq: faq("en", copy.nameEn),
            },
            {
              locale: "ar",
              name: copy.nameAr,
              shortDescription: copy.shortAr,
              longDescription: copy.longAr,
              whoItIsFor: copy.whoAr,
              whatWeDo: copy.whatAr,
              whenProfessional: copy.whenAr,
              process: copy.processAr,
              pricingInfo: copy.priceAr,
              professionalFallback: copy.safetyAr,
              safetyNotes: copy.safetyAr,
              seoTitle: `${copy.nameAr} | النجاح الدائم`.slice(0, 60),
              metaDescription: copy.shortAr.slice(0, 155),
              keywords: copy.nameAr,
              faq: faq("ar", copy.nameAr),
            },
          ],
        },
      },
    });
    created += 1;
  }

  const sl = await prisma.serviceLocation.count({
    where: { coverageStatus: "published", covered: true, indexable: true },
  });
  console.log(JSON.stringify({ created, already, publishedServiceLocations: sl }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
