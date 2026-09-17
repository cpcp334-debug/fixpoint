/**
 * Update electrical service visitor copy. Does not change status, coverage, or publish state.
 */
import { prisma } from "../src/server/db";
import { ELECTRICAL_PRICE_AR, ELECTRICAL_PRICE_EN, ELECTRICAL_SERVICE_COPY } from "../prisma/data/electrical-service-copy";

function faq(locale: "en" | "ar", name: string) {
  if (locale === "ar") {
    return JSON.stringify([
      { q: `ماذا يشمل ${name}؟`, a: "يبدأ بتقييم العَرَض الذي تذكره، ثم يحدد الفني إن كان المطلوب فحصاً أو إصلاحاً أو استبدالاً." },
      { q: "هل ذكر الخدمة يعني أنها متاحة في كل منطقة؟", a: "لا. ذكر الخدمة لا يعني التغطية. يُؤكد التوفر لكل طلب." },
    ]);
  }
  return JSON.stringify([
    { q: `What does ${name} include?`, a: "It starts with the symptom you report. The technician then says whether inspection, repair, or replacement is the next step." },
    { q: "Does listing this service mean it is available everywhere?", a: "No. A listed service is not coverage. Availability is confirmed for each request." },
  ]);
}

async function main() {
  let updated = 0;
  for (const [slug, copy] of Object.entries(ELECTRICAL_SERVICE_COPY)) {
    const service = await prisma.service.findUnique({ where: { slug }, select: { id: true } });
    if (!service) {
      console.log("missing", slug);
      continue;
    }
    await prisma.serviceI18n.update({
      where: { serviceId_locale: { serviceId: service.id, locale: "en" } },
      data: {
        name: copy.nameEn,
        shortDescription: copy.shortEn,
        longDescription: copy.longEn,
        whoItIsFor: copy.whoEn,
        whatWeDo: copy.whatEn,
        whenProfessional: copy.whenEn,
        process: copy.processEn,
        pricingInfo: ELECTRICAL_PRICE_EN,
        professionalFallback: copy.safetyEn,
        safetyNotes: copy.safetyEn,
        seoTitle: `${copy.nameEn} | Al Najah Al Daem`.slice(0, 60),
        metaDescription: copy.shortEn.slice(0, 155),
        faq: faq("en", copy.nameEn),
      },
    });
    await prisma.serviceI18n.update({
      where: { serviceId_locale: { serviceId: service.id, locale: "ar" } },
      data: {
        name: copy.nameAr,
        shortDescription: copy.shortAr,
        longDescription: copy.longAr,
        whoItIsFor: copy.whoAr,
        whatWeDo: copy.whatAr,
        whenProfessional: copy.whenAr,
        process: copy.processAr,
        pricingInfo: ELECTRICAL_PRICE_AR,
        professionalFallback: copy.safetyAr,
        safetyNotes: copy.safetyAr,
        seoTitle: `${copy.nameAr} | النجاح الدائم`.slice(0, 60),
        metaDescription: copy.shortAr.slice(0, 155),
        faq: faq("ar", copy.nameAr),
      },
    });
    updated += 1;
  }
  console.log(JSON.stringify({ updated }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
