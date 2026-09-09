import { PrismaClient, RiskLevel, QuoteMethod, ServiceStatus, ContentStatus, LocationStatus, LocationType } from "@prisma/client";
import { categories, services } from "./data/services";
import { locationTree } from "./data/locations";
import { diyCategories, diyGuides } from "./data/diy";
import { faq, list } from "./data/shared";
import {
  appLocationType,
  loadLocationMaster,
  resolveParentCityName,
  validateLocationMaster,
  type MasterLocation,
} from "./data/location-master";
import { hashPassword } from "../src/lib/admin/crypto";
import { workingCopySnapshot } from "../src/lib/service-location/revisions";
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

function a2LocationIntro(loc: MasterLocation, locale: "en" | "ar") {
  if (locale === "en") {
    return `${loc.nameEn} is a catalog location record for ALNAJAH ALDAEM service planning. This entry does not claim service coverage, licensing, or booking availability.`;
  }
  return `${loc.nameAr === "REVIEW_REQUIRED" ? loc.nameEn : loc.nameAr} سجل موقع في كتالوج النجاح الدائم للتخطيط. هذا السجل لا يدّعي تغطية الخدمة أو الترخيص أو توفر الحجز.`;
}

/** Seed Phase A2 cities/communities from master JSON. Never creates ServiceLocation rows. */
async function seedA2CitiesAndCommunities(uaeId: string, locationIds: Map<string, string>) {
  const master = loadLocationMaster();
  const validation = validateLocationMaster(master);
  if (!validation.ok) {
    throw new Error(`A2 location master invalid: ${validation.errors.join("; ")}`);
  }

  const cities = master.locations.filter((l) => l.type === "city");
  for (const city of cities) {
    const emirateId = locationIds.get(city.emirateSlug!);
    if (!emirateId) throw new Error(`A2 missing emirate for city ${city.slug}`);
    const row = await prisma.location.create({
      data: {
        slug: city.slug,
        type: LocationType.city,
        parentId: emirateId,
        status: LocationStatus.draft,
        serves: false,
        indexable: false,
        sortOrder: city.id,
        translations: {
          create: [
            {
              locale: "en",
              name: city.nameEn,
              intro: a2LocationIntro(city, "en"),
              seoTitle: seoTitle(city.nameEn, ""),
              metaDescription: meta(a2LocationIntro(city, "en")),
            },
            {
              locale: "ar",
              name: city.nameAr,
              intro: a2LocationIntro(city, "ar"),
              seoTitle: `${city.nameAr === "REVIEW_REQUIRED" ? city.nameEn : city.nameAr} | النجاح الدائم`.slice(0, 60),
              metaDescription: meta(a2LocationIntro(city, "ar")),
            },
          ],
        },
      },
    });
    locationIds.set(city.slug, row.id);
  }

  const cityByEmName = new Map(cities.map((c) => [`${c.emirateSlug}|${c.nameEn}`, c.slug]));
  const communities = master.locations.filter((l) => l.type === "community" || l.type === "area");
  for (const community of communities) {
    const parentName = resolveParentCityName(community.parentCityMunicipality);
    const parentSlug = cityByEmName.get(`${community.emirateSlug}|${parentName}`);
    const parentId = parentSlug ? locationIds.get(parentSlug) : undefined;
    if (!parentId) {
      throw new Error(`A2 missing parent city for ${community.slug} (${community.emirateSlug}|${parentName})`);
    }
    const row = await prisma.location.create({
      data: {
        slug: community.slug,
        type: LocationType[appLocationType(community.type)],
        parentId,
        status: LocationStatus.draft,
        serves: false,
        indexable: false,
        sortOrder: community.id,
        translations: {
          create: [
            {
              locale: "en",
              name: community.nameEn,
              intro: a2LocationIntro(community, "en"),
              seoTitle: seoTitle(community.nameEn, ""),
              metaDescription: meta(a2LocationIntro(community, "en")),
            },
            {
              locale: "ar",
              name: community.nameAr,
              intro: a2LocationIntro(community, "ar"),
              seoTitle: `${community.nameAr === "REVIEW_REQUIRED" ? community.nameEn : community.nameAr} | النجاح الدائم`.slice(0, 60),
              metaDescription: meta(a2LocationIntro(community, "ar")),
            },
          ],
        },
      },
    });
    locationIds.set(community.slug, row.id);
  }
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
  await prisma.serviceLocationRevision.deleteMany();
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
  console.log(
    "Seed complete: Phase A1 catalog (18 approved categories + 293 draft children), Phase A2 locations (200 total: UAE + 7 emirates + cities/communities draft), 7 active anchors, legacy drafts/orphans preserved, 2 published DIY guides, 4 draft DIY stubs, ServiceLocation remains 7×7=49.",
  );
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
        status: cat.approved ? ContentStatus.published : ContentStatus.draft,
        translations: {
          create: [
            { locale: "en", name: cat.name.en, description: cat.description.en },
            { locale: "ar", name: cat.name.ar, description: cat.description.ar },
          ],
        },
      },
    });
    categoryIds.set(cat.slug, row.id);
  }

  const serviceIds = new Map<string, string>();
  for (const svc of services) {
    const categoryId = categoryIds.get(svc.categorySlug);
    if (!categoryId) {
      throw new Error(`Seed missing category for service ${svc.slug} (categorySlug=${svc.categorySlug})`);
    }
    const status = svc.active ? ServiceStatus.active : ServiceStatus.draft;
    const row = await prisma.service.create({
      data: {
        categoryId,
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
        schemaData: JSON.stringify(svc.schemaData || {}),
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

  // Phase A2 — additive city/community catalog (draft, non-serving, non-indexable).
  // Does not expand ServiceLocation (still active services × emirates only).
  await seedA2CitiesAndCommunities(uae.id, locationIds);

  const activeServices = services.filter((s) => s.active);
  for (const svc of activeServices) {
    for (const em of locationTree.emirates) {
      const sl = await prisma.serviceLocation.create({
        data: {
          serviceId: serviceIds.get(svc.slug)!,
          locationId: locationIds.get(em.slug)!,
          indexable: true,
          qualityScore: 80,
          covered: true,
          coverageStatus: "published",
          qualityStatus: "indexable",
          indexableEn: true,
          indexableAr: true,
          approvedBy: "seed",
          approvedAt: new Date(),
          publishedAt: new Date(),
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
        include: { translations: true },
      });
      for (const copy of sl.translations) {
        await prisma.serviceLocationRevision.create({
          data: {
            serviceLocationId: sl.id,
            locale: copy.locale,
            revisionNumber: 1,
            snapshotJson: workingCopySnapshot(copy),
            generatedBy: "seed",
            approvedBy: "seed",
            approvedAt: new Date(),
            changeReason: "Initial published working copy",
            status: "published",
          },
        });
      }
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
