import { PrismaClient, RiskLevel, QuoteMethod, ServiceStatus, ContentStatus, LocationStatus, LocationType } from "@prisma/client";
import { categories, services } from "./data/services";
import { locationTree } from "./data/locations";
import { diyCategories, diyGuides } from "./data/diy";
import { faq, list } from "./data/shared";
import { hashPassword } from "../src/lib/admin/crypto";
import { upsertDisabledExampleRules } from "../src/lib/automation/catalog";
import { upsertTemplateSops } from "../src/lib/knowledge/sops";
import { resolveSeedMode, destructiveSeedRefusalMessage } from "./seed-safety";

const prisma = new PrismaClient();

function seoTitle(name: string, extra: string) {
  const base = `${name} | ALNAJAH ALDAEM`;
  const full = extra ? `${name} in ${extra} | ALNAJAH ALDAEM` : base;
  return full.slice(0, 60);
}

function meta(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= 155 ? clean : `${clean.slice(0, 152)}...`;
}

function pairIntro(
  serviceName: string,
  emirateName: string,
  serviceShort: string,
  climate: string,
  licenseLine: string,
) {
  return `${serviceName} in ${emirateName}: ${serviceShort} ${climate} ${licenseLine} Request a quote if you need a technician; use ALNAJAH AI if you are not sure which trade applies.`;
}

async function runSafeBootstrap() {
  console.log("Running production-safe / staff bootstrap seed (no operational data deletion).");
  await bootstrapStaff();
  await upsertDisabledExampleRules(prisma);
  await upsertTemplateSops(prisma);
  console.log("Safe bootstrap complete.");
}

async function wipeOperationalAndCatalogData() {
  await prisma.automationRun.deleteMany();
  await prisma.opsTask.deleteMany();
  await prisma.adminNotification.deleteMany();
  await prisma.automationJob.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.diyVote.deleteMany();
  await prisma.reviewVote.deleteMany();
  await prisma.reviewInsight.deleteMany();
  await prisma.contentReport.deleteMany();
  await prisma.review.deleteMany();
  await prisma.question.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.leadScoreHistory.deleteMany();
  await prisma.leadScore.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.exportLog.deleteMany();
  await prisma.amcContract.deleteMany();
  await prisma.property.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.serviceLocationI18n.deleteMany();
  await prisma.serviceLocation.deleteMany();
  await prisma.diyGuideI18n.deleteMany();
  await prisma.diyGuide.deleteMany();
  await prisma.diyCategoryI18n.deleteMany();
  await prisma.diyCategory.deleteMany();
  await prisma.faqI18n.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.serviceI18n.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategoryI18n.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.locationI18n.deleteMany();
  await prisma.location.deleteMany();
}

async function main() {
  const decided = resolveSeedMode();
  console.log(`Seed mode: ${decided.mode} (${decided.reason})`);

  if (decided.mode === "safe-bootstrap") {
    if (decided.refusedDestructive) {
      console.error(destructiveSeedRefusalMessage());
    }
    await runSafeBootstrap();
    return;
  }

  await wipeOperationalAndCatalogData();
  await seedCatalogAndContent();
  console.log("Seed complete: 7 active services, 2 published DIY guides, 4 draft DIY stubs, 7 emirate hubs.");
  await runSafeBootstrap();
}

async function seedCatalogAndContent() {
  const categoryIds = new Map<string, string>();
  for (const cat of categories) {
    const row = await prisma.serviceCategory.create({
      data: {
        slug: cat.slug,
        sopCode: cat.sopCode,
        sortOrder: cat.sortOrder,
        status: ContentStatus.published,
        translations: {
          create: [
            { locale: "en", name: cat.name.en },
            { locale: "ar", name: cat.name.ar },
          ],
        },
      },
    });
    categoryIds.set(cat.slug, row.id);
  }

  const serviceIds = new Map<string, string>();
  for (const svc of services) {
    const status = svc.active ? ServiceStatus.active : ServiceStatus.draft;
    const row = await prisma.service.create({
      data: {
        categoryId: categoryIds.get(svc.categorySlug)!,
        slug: svc.slug,
        serviceType: svc.serviceType,
        status,
        riskLevel: svc.riskLevel as RiskLevel,
        diyAvailable: svc.diyAvailable,
        quoteMethod: svc.quoteMethod as QuoteMethod,
        inspectionRequired: svc.inspectionRequired,
        bookingEnabled: svc.bookingEnabled,
        emergencyAvailable: svc.emergencyAvailable,
        amcAvailable: svc.amcAvailable,
        indexable: svc.active,
        relatedServiceSlugs: JSON.stringify(svc.related),
        aiIntakeQuestions: JSON.stringify(svc.questions),
        sopCode: svc.sopCode,
        translations: {
          create: (["en", "ar"] as const).map((locale) => ({
            locale,
            name: svc.name[locale],
            shortDescription: svc.short[locale],
            longDescription: svc.long[locale],
            whoItIsFor: svc.who[locale],
            whatWeDo: svc.what[locale],
            whenProfessional: svc.whenPro[locale],
            process: svc.process[locale],
            pricingInfo: svc.pricing[locale],
            professionalFallback: svc.fallback[locale],
            safetyNotes: svc.safety[locale],
            seoTitle: seoTitle(svc.name[locale], ""),
            metaDescription: meta(svc.short[locale]),
            keywords: svc.name[locale],
            faq: faq(svc.faqs, locale),
          })),
        },
      },
    });
    serviceIds.set(svc.slug, row.id);
  }

  const uae = await prisma.location.create({
    data: {
      slug: locationTree.uae.slug,
      type: LocationType.country,
      status: LocationStatus.active,
      serves: true,
      indexable: false,
      sortOrder: 0,
      translations: {
        create: [
          {
            locale: "en",
            name: locationTree.uae.name.en,
            intro: "ALNAJAH ALDAEM serves cleaning and building maintenance enquiries across the UAE. Dedicated pages are published per emirate when content is useful.",
            seoTitle: "Locations | ALNAJAH ALDAEM",
            metaDescription: "Cleaning and building maintenance enquiry coverage across the United Arab Emirates.",
          },
          {
            locale: "ar",
            name: locationTree.uae.name.ar,
            intro: "تستقبل النجاح الدائم طلبات التنظيف وصيانة المباني في الإمارات. تُنشر صفحات مستقلة لكل إمارة عندما يكون المحتوى مفيداً.",
            seoTitle: "المناطق | النجاح الدائم",
            metaDescription: "تغطية طلبات التنظيف وصيانة المباني في دولة الإمارات العربية المتحدة.",
          },
        ],
      },
    },
  });

  const locationIds = new Map<string, string>();
  for (const em of locationTree.emirates) {
    const row = await prisma.location.create({
      data: {
        slug: em.slug,
        type: LocationType.emirate,
        parentId: uae.id,
        status: LocationStatus.active,
        serves: true,
        indexable: true,
        sortOrder: em.sortOrder,
        translations: {
          create: [
            {
              locale: "en",
              name: em.name.en,
              intro: `${em.name.en} service area for ALNAJAH ALDAEM. ${em.local}`,
              localServiceInfo: em.local,
              propertyTypes: em.properties,
              nearbyAreas: em.nearby,
              seoTitle: seoTitle(`Cleaning and maintenance`, em.name.en),
              metaDescription: meta(em.local),
              faq: JSON.stringify([
                {
                  q: `Do you serve ${em.name.en}?`,
                  a: `We accept enquiries for ${em.name.en} for active services. Public licenses listed on this site are Sharjah cleaning 925212 and Ajman maintenance 132954. We do not claim a trade license in every emirate.`,
                },
              ]),
            },
            {
              locale: "ar",
              name: em.name.ar,
              intro: `منطقة خدمة ${em.name.ar} للنجاح الدائم. ${em.localAr}`,
              localServiceInfo: em.localAr,
              propertyTypes: em.propertiesAr,
              nearbyAreas: em.nearbyAr,
              seoTitle: `تنظيف وصيانة في ${em.name.ar} | النجاح الدائم`,
              metaDescription: meta(em.localAr),
              faq: JSON.stringify([
                {
                  q: `هل تخدمون ${em.name.ar}؟`,
                  a: `نستقبل طلبات ${em.name.ar} للخدمات المفعّلة. الرخص المعروضة هي تنظيف الشارقة 925212 وصيانة عجمان 132954. لا ندّعي رخصة في كل إمارة.`,
                },
              ]),
            },
          ],
        },
      },
    });
    locationIds.set(em.slug, row.id);
  }

  const activeServices = services.filter((s) => s.active);
  for (const svc of activeServices) {
    for (const em of locationTree.emirates) {
      const sl = await prisma.serviceLocation.create({
        data: {
          serviceId: serviceIds.get(svc.slug)!,
          locationId: locationIds.get(em.slug)!,
          indexable: true,
          qualityScore: 80,
          translations: {
            create: [
              {
                locale: "en",
                intro: pairIntro(svc.name.en, em.name.en, svc.short.en, em.climate, em.local),
                localInfo: `${em.properties} ${svc.whenPro.en}`,
                seoTitle: seoTitle(svc.name.en, em.name.en),
                metaDescription: meta(`${svc.short.en} Serving ${em.name.en}. ${em.local}`),
                faq: JSON.stringify([
                  {
                    q: `Do you offer ${svc.name.en} in ${em.name.en}?`,
                    a: `You can request ${svc.name.en} in ${em.name.en}. Coverage is by enquiry. Public licenses listed are Sharjah 925212 (cleaning) and Ajman 132954 (maintenance).`,
                  },
                  {
                    q: `Is a site inspection required in ${em.name.en}?`,
                    a: svc.inspectionRequired
                      ? `Often yes for ${svc.name.en}, because access and the fault change the scope. Request an inspection or a quote.`
                      : `Not always. Share photos and the property type; we will say if a visit is needed.`,
                  },
                ]),
              },
              {
                locale: "ar",
                intro: pairIntro(svc.name.ar, em.name.ar, svc.short.ar, em.climateAr, em.localAr),
                localInfo: `${em.propertiesAr} ${svc.whenPro.ar}`,
                seoTitle: `${svc.name.ar} في ${em.name.ar} | النجاح الدائم`,
                metaDescription: meta(`${svc.short.ar} ${em.name.ar}. ${em.localAr}`),
                faq: JSON.stringify([
                  {
                    q: `هل تقدمون ${svc.name.ar} في ${em.name.ar}؟`,
                    a: `يمكن طلب ${svc.name.ar} في ${em.name.ar}. التغطية حسب الطلب. الرخص المعروضة هي الشارقة 925212 (تنظيف) وعجمان 132954 (صيانة).`,
                  },
                  {
                    q: `هل تلزم معاينة في ${em.name.ar}؟`,
                    a: svc.inspectionRequired
                      ? `غالباً نعم لـ ${svc.name.ar} لأن الوصول والعطل يغيّران النطاق. اطلب معاينة أو عرض سعر.`
                      : `ليس دائماً. أرسل صوراً ونوع العقار وسنوضح إن كانت الزيارة لازمة.`,
                  },
                ]),
              },
            ],
          },
        },
      });
      void sl;
    }
  }

  const diyCategoryIds = new Map<string, string>();
  for (const cat of diyCategories) {
    const published = cat.status === "published";
    const row = await prisma.diyCategory.create({
      data: {
        slug: cat.slug,
        status: published ? ContentStatus.published : ContentStatus.draft,
        indexable: published,
        sortOrder: cat.sortOrder,
        translations: {
          create: (["en", "ar"] as const).map((locale) => ({
            locale,
            name: cat.name[locale],
            description: cat.description[locale],
            seoTitle: seoTitle(cat.name[locale], locale === "en" ? "DIY" : ""),
            metaDescription: meta(cat.description[locale]),
          })),
        },
      },
    });
    diyCategoryIds.set(cat.slug, row.id);
  }

  for (const guide of diyGuides) {
    const published = guide.status === "published";
    await prisma.diyGuide.create({
      data: {
        slug: guide.slug,
        categoryId: diyCategoryIds.get(guide.categorySlug)!,
        categorySlug: guide.categorySlug,
        serviceId: serviceIds.get(guide.serviceSlug),
        difficulty: guide.difficulty.en,
        estimatedTime: guide.estimatedTime.en,
        riskLevel: guide.riskLevel as RiskLevel,
        schemaType: guide.schemaType,
        status: published ? ContentStatus.published : ContentStatus.draft,
        indexable: published,
        relatedSlugs: JSON.stringify(guide.related),
        relatedServiceSlugs: JSON.stringify(guide.relatedServices),
        locationSlugs: JSON.stringify(guide.locationSlugs),
        publishedAt: published ? new Date() : null,
        translations: {
          create: (["en", "ar"] as const).map((locale) => ({
            locale,
            title: guide.title[locale],
            problem: guide.problem[locale],
            quickAnswer: guide.quickAnswer[locale],
            difficulty: guide.difficulty[locale],
            estimatedTime: guide.estimatedTime[locale],
            tools: list(guide.tools, locale),
            materials: list(guide.materials, locale),
            safety: guide.safety[locale],
            steps: list(guide.steps, locale),
            checkWork: guide.checkWork[locale],
            whenToStop: guide.whenToStop[locale],
            professionalFallback: guide.fallback[locale],
            seoTitle: seoTitle(guide.title[locale], ""),
            metaDescription: meta(guide.quickAnswer[locale]),
            faq: faq(guide.faqs, locale),
          })),
        },
      },
    });
  }

  const globalFaqs = [
    {
      q: {
        en: "Do you serve all seven emirates?",
        ar: "هل تخدمون الإمارات السبع؟",
      },
      a: {
        en: "We accept enquiries from all seven emirates for active services. Community pages are not published yet. Public licenses listed are Sharjah 925212 and Ajman 132954.",
        ar: "نستقبل طلبات من الإمارات السبع للخدمات المفعّلة. صفحات الأحياء غير منشورة بعد. الرخص المعروضة هي الشارقة 925212 وعجمان 132954.",
      },
    },
    {
      q: {
        en: "Does ALNAJAH AI replace a technician?",
        ar: "هل يغني ذكاء النجاح عن الفني؟",
      },
      a: {
        en: "No. It helps classify the problem and may suggest DIY when safe. Inspection is required when the cause is unclear or the work is hazardous.",
        ar: "لا. يساعد على تصنيف المشكلة وقد يقترح أعمالاً منزلية عندما تكون آمنة. المعاينة لازمة عندما يكون السبب غير واضح أو العمل خطراً.",
      },
    },
    {
      q: {
        en: "Will I get an instant price?",
        ar: "هل أحصل على سعر فوري؟",
      },
      a: {
        en: "No. AI cannot authorise prices. A person reviews quotations.",
        ar: "لا. لا يعتمد الذكاء الاصطناعي أسعاراً. يراجع شخص عروض الأسعار.",
      },
    },
  ];

  for (const [i, item] of globalFaqs.entries()) {
    await prisma.faq.create({
      data: {
        sortOrder: i,
        status: ContentStatus.published,
        translations: {
          create: [
            { locale: "en", question: item.q.en, answer: item.a.en },
            { locale: "ar", question: item.q.ar, answer: item.a.ar },
          ],
        },
      },
    });
  }
}

async function bootstrapStaff() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("Staff login not seeded. Set ADMIN_EMAIL and ADMIN_PASSWORD (min 12 characters) to create a super_admin.");
    return;
  }
  if (password.length < 12) {
    console.log("ADMIN_PASSWORD is shorter than 12 characters; staff user not created.");
    return;
  }
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Administrator",
      passwordHash: hashPassword(password),
      role: "super_admin",
      active: true,
    },
    update: {
      passwordHash: hashPassword(password),
      role: "super_admin",
      active: true,
    },
  });
  console.log(`Staff super_admin ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
