/**
 * Phase 1b — fix ServiceCategory / DiyCategory AR names still REVIEW_REQUIRED or Latin.
 */
import "./load-env-mysql";
import { prisma } from "../src/server/db";

const AR = /[\u0600-\u06FF]/;

const CATEGORY_AR: Record<string, string> = {
  ac: "التكييف",
  appliances: "الأجهزة",
  "bath-kitchen": "الحمامات والمطابخ",
  "burner-cooker": "مواقد وأفران الغاز",
  carpentry: "النجارة",
  cleaning: "التنظيف",
  dishwasher: "غسالة الصحون",
  electrical: "الكهرباء",
  flooring: "الأرضيات والبلاط",
  "general-maintenance": "الصيانة العامة للمباني",
  gym: "الصالات الرياضية",
  microwave: "المايكروويف",
  openings: "الأبواب والنوافذ",
  oven: "الأفران",
  painting: "الدهان",
  plumbing: "السباكة",
  preventive: "الوقائية والطوارئ",
  refrigerator: "الثلاجات",
  "roof-exterior": "الأسطح والواجهات",
  sauna: "الساونا",
  specialist: "منشآت متخصصة",
  "swimming-pool": "المسابح",
  walls: "الجدران",
  "washing-machine": "غسالات الملابس",
  "water-heater": "سخانات المياه",
  "water-tank": "خزانات المياه",
  waterproofing: "العزل المائي",
};

function needs(name: string | null | undefined) {
  if (!name) return true;
  if (name === "REVIEW_REQUIRED" || name.startsWith("REVIEW_REQUIRED")) return true;
  return !AR.test(name);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  let svcCat = 0;
  let diyCat = 0;
  const samples: Array<{ kind: string; slug: string; to: string }> = [];

  const serviceCats = await prisma.serviceCategory.findMany({
    include: { translations: true },
  });
  for (const row of serviceCats) {
    const ar = row.translations.find((t) => t.locale === "ar");
    const nameAr = CATEGORY_AR[row.slug];
    if (!nameAr || !needs(ar?.name)) continue;
    samples.push({ kind: "serviceCategory", slug: row.slug, to: nameAr });
    if (!dryRun) {
      if (ar) {
        await prisma.serviceCategoryI18n.update({
          where: { categoryId_locale: { categoryId: row.id, locale: "ar" } },
          data: { name: nameAr, description: ar.description?.includes("REVIEW") ? "" : ar.description },
        });
      } else {
        await prisma.serviceCategoryI18n.create({
          data: { categoryId: row.id, locale: "ar", name: nameAr, description: "" },
        });
      }
    }
    svcCat += 1;
  }

  const diyCats = await prisma.diyCategory.findMany({ include: { translations: true } });
  for (const row of diyCats) {
    const ar = row.translations.find((t) => t.locale === "ar");
    const nameAr = CATEGORY_AR[row.slug];
    if (!nameAr || !needs(ar?.name)) continue;
    samples.push({ kind: "diyCategory", slug: row.slug, to: nameAr });
    if (!dryRun) {
      if (ar) {
        await prisma.diyCategoryI18n.update({
          where: { categoryId_locale: { categoryId: row.id, locale: "ar" } },
          data: { name: nameAr },
        });
      } else {
        await prisma.diyCategoryI18n.create({
          data: { categoryId: row.id, locale: "ar", name: nameAr },
        });
      }
    }
    diyCat += 1;
  }

  console.log(JSON.stringify({ dryRun, svcCat, diyCat, samples }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
