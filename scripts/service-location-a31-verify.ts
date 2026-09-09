/**
 * A3.1 ServiceLocation foundation verification.
 * Does not create ServiceLocation rows or page content.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { getServiceLocation } from "../src/lib/catalog";
import { isCoveredOps, isPubliclyEligible, coverageLifecycleAllowed } from "../src/lib/service-location/coverage";
import { resolveEffectiveOps, wouldWeakenSafety } from "../src/lib/service-location/overrides";
import { resolveDiyInheritance } from "../src/lib/service-location/diy";
import { evaluateServiceLocationGates, localeContentComplete } from "../src/lib/service-location/gates";
import { buildServiceLocationTitle } from "../src/lib/service-location/seo-title";
import { arabicConfidenceForSlug, arabicIndexBlocked } from "../src/lib/service-location/arabic";
import { resolveImageInheritance } from "../src/lib/service-location/images";
import type { GateInput } from "../src/lib/service-location/types";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function baseGate(over: Partial<GateInput> = {}): GateInput {
  const en = {
    locale: "en",
    intro: "Professional AC maintenance in Dubai for homes and buildings.",
    localInfo: "Villa and apartment cooling loads are high in summer humidity.",
    seoTitle: "AC Maintenance in Dubai | ALNAJAH ALDAEM",
    metaDescription: "Request AC maintenance in Dubai. Coverage by enquiry. Licenses listed publicly.",
    faq: "[]",
  };
  const ar = {
    locale: "ar",
    intro: "صيانة تكييف في دبي للمنازل والمباني مع طلب معاينة عند الحاجة.",
    localInfo: "أحمال التبريد في الفلل والشقق مرتفعة خلال الصيف.",
    seoTitle: "صيانة تكييف في دبي | النجاح الدائم",
    metaDescription: "اطلب صيانة تكييف في دبي. التغطية حسب الطلب. الرخص المعروضة معلنة.",
    faq: "[]",
  };
  return {
    covered: true,
    coverageStatus: "published",
    serviceStatus: "active",
    locationStatus: "active",
    locationServes: true,
    bookingEnabledOverride: null,
    amcAvailableOverride: null,
    emergencyAvailableOverride: null,
    diyRestricted: false,
    serviceBookingEnabled: true,
    serviceAmcAvailable: false,
    serviceEmergencyAvailable: false,
    serviceDiyAvailable: true,
    serviceRiskLevel: "yellow",
    indexableStored: true,
    qualityStatus: "indexable",
    qualityScore: 80,
    serviceIndexable: true,
    locationIndexable: true,
    locationSlug: "dubai",
    serviceSlug: "ac-maintenance",
    serviceHeroImage: null,
    heroImageOverride: null,
    en,
    ar,
    arabicConfidence: "HIGH",
    diySafetyClass: "YELLOW",
    safetyReviewComplete: true,
    uniqueTitleEn: true,
    uniqueTitleAr: true,
    uniqueMetaEn: true,
    uniqueMetaAr: true,
    duplicateSimilarityOk: true,
    claimScanOk: true,
    thinContentOk: true,
    humanApproved: true,
    ...over,
  };
}

async function main() {
  const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
  assert(schema.includes("enum ServiceLocationLifecycle"), "lifecycle enum in schema");
  assert(schema.includes("model ServiceLocationRevision"), "revision model in schema");
  const revBlock = schema.slice(schema.indexOf("model ServiceLocationRevision"), schema.indexOf("model DiyCategory"));
  assert(!revBlock.includes("@updatedAt"), "revision model has no updatedAt");
  assert(schema.includes("heroImageOverride"), "image override column");
  assert(schema.includes("bookingEnabledOverride"), "booking override column");

  const allCount = await prisma.serviceLocation.count();
  assert(allCount >= 49, `ServiceLocation total must be at least 49, got ${allCount}`);

  const rows = await prisma.serviceLocation.findMany({
    where: { coverageStatus: "published", covered: true, indexable: true },
    include: { translations: true, revisions: true, service: true, location: true },
    orderBy: { id: "asc" },
  });
  assert(rows.length === 49, `grandfathered published ServiceLocation rows must remain 49, got ${rows.length}`);
  const beforeIds = rows.map((r) => r.id);
  for (const row of rows) {
    assert(row.covered, `${row.id} must stay covered`);
    assert(row.coverageStatus === "published", `${row.id} must stay published`);
    assert(row.qualityStatus === "indexable", `${row.id} quality grandfathered indexable`);
    assert(row.indexable, `${row.id} remains indexable`);
    assert(row.translations.some((t) => t.locale === "en") && row.translations.some((t) => t.locale === "ar"), `${row.id} EN/AR working copy`);
    assert(row.revisions.filter((r) => r.locale === "en").length >= 1, `${row.id} EN revision`);
    assert(row.revisions.filter((r) => r.locale === "ar").length >= 1, `${row.id} AR revision`);
  }

  assert(isCoveredOps({ covered: true, coverageStatus: "approved", serviceStatus: "active", locationStatus: "active", locationServes: true }), "approved is covered ops");
  assert(!isPubliclyEligible({ covered: true, coverageStatus: "approved", serviceStatus: "active", locationStatus: "active", locationServes: true }), "approved is not public");
  assert(isPubliclyEligible({ covered: true, coverageStatus: "published", serviceStatus: "active", locationStatus: "active", locationServes: true }), "published eligible");
  assert(coverageLifecycleAllowed("draft", "review"), "draft→review");
  assert(coverageLifecycleAllowed("review", "approved"), "review→approved");
  assert(coverageLifecycleAllowed("approved", "published"), "approved→published");
  assert(!coverageLifecycleAllowed("draft", "published"), "cannot skip to published");

  const inherited = resolveEffectiveOps({
    bookingEnabledOverride: null,
    amcAvailableOverride: null,
    emergencyAvailableOverride: true,
    diyRestricted: false,
    serviceBookingEnabled: true,
    serviceAmcAvailable: false,
    serviceEmergencyAvailable: false,
    serviceDiyAvailable: true,
    serviceRiskLevel: "yellow",
  });
  assert(inherited.bookingEnabled === true, "booking inherits");
  assert(inherited.amcAvailable === false, "amc inherits false");
  assert(inherited.emergencyAvailable === true, "emergency override on");
  const restricted = resolveEffectiveOps({
    bookingEnabledOverride: false,
    amcAvailableOverride: null,
    emergencyAvailableOverride: null,
    diyRestricted: true,
    serviceBookingEnabled: true,
    serviceAmcAvailable: true,
    serviceEmergencyAvailable: true,
    serviceDiyAvailable: true,
    serviceRiskLevel: "green",
  });
  assert(restricted.bookingEnabled === false, "booking override off");
  assert(restricted.diyVisible === false, "diyRestricted hides DIY");
  assert(!wouldWeakenSafety({ serviceRiskLevel: "red", attemptedDiyAvailable: false }), "restricting red DIY is ok");
  assert(wouldWeakenSafety({ serviceRiskLevel: "red", attemptedDiyAvailable: true }), "cannot enable DIY on red");
  assert(wouldWeakenSafety({ serviceRiskLevel: "red", attemptedRiskLevel: "green" }), "cannot weaken red→green");
  const diy = resolveDiyInheritance({
    serviceRiskLevel: "red",
    serviceDiyAvailable: true,
    diyRestricted: false,
    matrixClass: "GREEN",
  });
  assert(diy.visible === false, "red service cannot show DIY even if matrix says GREEN");
  assert(diy.safetyClass === "RED" || diy.safetyClass === "REVIEW_REQUIRED", "safety class not weakened");
  assert(diy.safetyWeakened === false, "inheritance does not weaken safety");

  const passing = evaluateServiceLocationGates(baseGate());
  assert(passing.indexableEn, "complete published pair indexes EN");
  assert(passing.indexableAr, "HIGH Arabic indexes AR");
  const incomplete = evaluateServiceLocationGates(baseGate({ en: { ...baseGate().en!, intro: "" } }));
  assert(!incomplete.indexableEn, "incomplete EN remains noindex");
  const arBlock = evaluateServiceLocationGates(baseGate({ arabicConfidence: "REVIEW_REQUIRED" }));
  assert(arBlock.indexableEn, "REVIEW_REQUIRED still allows EN");
  assert(!arBlock.indexableAr, "REVIEW_REQUIRED blocks AR indexing");
  assert(arabicIndexBlocked("REVIEW_REQUIRED"), "helper blocks REVIEW_REQUIRED");
  const inactive = evaluateServiceLocationGates(baseGate({ locationStatus: "archived", locationServes: false }));
  assert(!inactive.indexableEn && !inactive.indexableAr, "inactive/unserved auto noindex");
  const unserved = evaluateServiceLocationGates(baseGate({ locationServes: false }));
  assert(!unserved.pairIndexable, "unserved noindex");
  const qualityFail = evaluateServiceLocationGates(baseGate({ qualityStatus: "failed_quality", qualityScore: 10 }));
  assert(!qualityFail.indexableEn && !qualityFail.indexableAr, "quality failures noindex");
  assert(localeContentComplete(baseGate().en), "EN complete helper");

  const img = resolveImageInheritance({
    serviceName: "AC",
    locationName: "Dubai",
    locale: "en",
  });
  assert(img.source === "approved_fallback" && img.gatePass, "missing image uses approved fallback");

  const title = buildServiceLocationTitle({
    serviceName: "Socket Repair",
    locationName: "Al Majaz",
    parentName: "Sharjah",
    locale: "en",
    serviceId: "svc1",
    locationId: "loc1",
  });
  assert(title.lengthOk, "title length ok");
  assert(!title.banned, "title has no banned claims");
  assert(title.title.includes("ALNAJAH ALDAEM"), "brand suffix");
  const same = buildServiceLocationTitle({
    serviceName: "Socket Repair",
    locationName: "Al Majaz",
    parentName: "Sharjah",
    locale: "en",
    serviceId: "svc1",
    locationId: "loc1",
  });
  assert(title.title === same.title, "title helper is deterministic");

  const sample = rows[0]!;
  const serviceSlug = sample.service.slug;
  const locationSlug = sample.location.slug;
  const publicEn = await getServiceLocation(serviceSlug, locationSlug, "en");
  const publicAr = await getServiceLocation(serviceSlug, locationSlug, "ar");
  assert(publicEn, `existing page still resolves /en/${serviceSlug}/${locationSlug}`);
  assert(publicAr, `existing page still resolves /ar/${serviceSlug}/${locationSlug}`);
  assert(publicEn.localeIndexable, "existing EN remains indexable");
  assert(publicAr.localeIndexable, "existing AR remains indexable for emirates");
  assert(arabicConfidenceForSlug(locationSlug) !== "REVIEW_REQUIRED", "49 emirates are not REVIEW_REQUIRED");

  const publishedRev = sample.revisions.find((r) => r.status === "published");
  assert(publishedRev, "published revision exists");
  const triggerRows = await prisma.$queryRaw<Array<{ tgname: string }>>`
    SELECT tgname FROM pg_trigger WHERE tgname = 'service_location_revision_immutable_trg'
  `;
  assert(triggerRows.length === 1, "immutable snapshot trigger exists");
  const fnSrc = readFileSync(join(process.cwd(), "src/lib/service-location/revisions.ts"), "utf8");
  assert(fnSrc.includes('data: { status: "superseded"'), "publishRevision only supersedes status on prior row");
  const updateBlock = fnSrc.slice(fnSrc.indexOf("serviceLocationRevision.update"), fnSrc.indexOf("serviceLocationRevision.create"));
  assert(updateBlock.includes("superseded"), "prior revision status becomes superseded");
  assert(!updateBlock.includes("snapshotJson"), "existing revision snapshots are never updated in code");

  const afterPublished = await prisma.serviceLocation.findMany({
    where: { coverageStatus: "published", covered: true, indexable: true },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  assert(afterPublished.length === 49, `published ServiceLocation after verify must stay 49, got ${afterPublished.length}`);
  assert(
    afterPublished.map((r) => r.id).join(",") === beforeIds.join(","),
    "existing 49 published IDs unchanged",
  );

  const sitemapSrc = readFileSync(join(process.cwd(), "src/app/sitemap.ts"), "utf8");
  assert(sitemapSrc.includes("pair.service.slug"), "sitemap still uses existing pair URLs");

  console.log(
    JSON.stringify(
      {
        serviceLocationTotal: allCount,
        publishedGrandfathered: afterPublished.length,
        idsUnchanged: true,
        revisions: rows.reduce((n, r) => n + r.revisions.length, 0),
        published: rows.filter((r) => r.coverageStatus === "published").length,
        samplePublicPath: `/${serviceSlug}/${locationSlug}`,
      },
      null,
      2,
    ),
  );
  console.log("A3.1 ServiceLocation foundation verification PASSED");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
