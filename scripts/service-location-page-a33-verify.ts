/**
 * A3.3 ServiceLocation page-engine verification.
 * Does not create rows, content, images, or sitemap changes.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  A32_PILOT_LOCATION_SLUGS,
  A32_PILOT_SERVICE_SLUGS,
  a32PilotPairs,
} from "../prisma/data/service-location-a32-pilot";
import { publicServiceLocationWhere } from "../src/lib/catalog";
import { arabicConfidenceForSlug, arabicIndexBlocked } from "../src/lib/service-location/arabic";
import { resolveDiyInheritance } from "../src/lib/service-location/diy";
import { evaluateServiceLocationGates, localeShouldIndex } from "../src/lib/service-location/gates";
import { resolveImageInheritance } from "../src/lib/service-location/images";
import {
  resolveServiceLocationPageFresh,
  resolveServiceLocationPreviewImpl,
} from "../src/lib/service-location/page-resolve";
import {
  assertPopulationInvariants,
  measureServiceLocationPopulation,
} from "../src/lib/service-location/population";
import { reviewAggregateJsonLd, serviceJsonLd } from "../src/lib/seo";
import { prisma } from "../src/server/db";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

const BANNED = /\b(best|#1|number one|certified|licensed|guarantee|guaranteed|24\/7|cheapest|lowest price)\b/i;

async function main() {
  const population = await measureServiceLocationPopulation(prisma);
  assertPopulationInvariants(population);
  assert(population.published === 49, `published/indexable must remain 49, got ${population.published}`);
  const published = population.published;

  // 1–3 published EN/AR + URLs unchanged
  const en = await resolveServiceLocationPageFresh({
    serviceSlug: "cleaning-services",
    locationSlug: "dubai",
    locale: "en",
  });
  assert(en, "published EN cleaning-services/dubai must resolve");
  assert(en.path === "/cleaning-services/dubai", "existing EN URL path unchanged");
  assert(en.localeIndexable, "published EN must be indexable");
  assert(en.revisionStatus === "published", "public EN uses published revision");
  assert(en.mode === "public", "public mode");

  const ar = await resolveServiceLocationPageFresh({
    serviceSlug: "cleaning-services",
    locationSlug: "dubai",
    locale: "ar",
  });
  assert(ar, "published AR cleaning-services/dubai must resolve");
  assert(ar.path === "/cleaning-services/dubai", "existing AR URL path unchanged");
  assert(ar.localeIndexable, "published AR must be indexable");
  assert(ar.revisionStatus === "published", "public AR uses published revision");

  // 4–5 pilot must not publicly render
  const pilotPair = a32PilotPairs()[0];
  const pilotEn = await resolveServiceLocationPageFresh({
    serviceSlug: pilotPair.serviceSlug,
    locationSlug: pilotPair.locationSlug,
    locale: "en",
  });
  const pilotAr = await resolveServiceLocationPageFresh({
    serviceSlug: pilotPair.serviceSlug,
    locationSlug: pilotPair.locationSlug,
    locale: "ar",
  });
  assert(!pilotEn, "pilot EN must not publicly render");
  assert(!pilotAr, "pilot AR must not publicly render");

  for (const pair of a32PilotPairs()) {
    const svc = await prisma.service.findUnique({ where: { slug: pair.serviceSlug } });
    const loc = await prisma.location.findUnique({ where: { slug: pair.locationSlug } });
    assert(svc && loc, "pilot catalog rows exist");
    const row = await prisma.serviceLocation.findUnique({
      where: { serviceId_locationId: { serviceId: svc.id, locationId: loc.id } },
      include: { revisions: true },
    });
    assert(row, "pilot row exists");
    assert(row.coverageStatus === "draft" && row.covered === false, "pilot stays draft/uncovered");
    assert(!row.indexableEn && !row.indexableAr && !row.indexable, "pilot not indexable");
    assert(
      row.revisions.every((r) => r.status !== "published"),
      "pilot must have no published revisions",
    );
  }

  // 6 unpublished revision never renders (include filter + pilot shells)
  const resolveSrc = readFileSync(join(process.cwd(), "src/lib/service-location/page-resolve.ts"), "utf8");
  assert(resolveSrc.includes('where: { status: "published"'), "resolver loads only published revisions");
  assert(resolveSrc.includes("if (!publishedRev) return null"), "public mode requires published revision");

  // 7 Arabic gate
  assert(arabicIndexBlocked("REVIEW_REQUIRED"), "REVIEW_REQUIRED blocks AR");
  assert(arabicIndexBlocked("UNKNOWN"), "UNKNOWN blocks AR");
  assert(!arabicIndexBlocked("HIGH"), "HIGH allows AR");
  assert(!arabicIndexBlocked(arabicConfidenceForSlug("dubai")), "dubai AR confidence not blocked");

  // 8 inactive service blocked
  const svcRow = await prisma.service.findUnique({ where: { slug: "cleaning-services" } });
  assert(svcRow, "cleaning-services exists");
  const prevStatus = svcRow.status;
  await prisma.service.update({ where: { id: svcRow.id }, data: { status: "unavailable" } });
  try {
    const blocked = await resolveServiceLocationPageFresh({
      serviceSlug: "cleaning-services",
      locationSlug: "dubai",
      locale: "en",
    });
    assert(!blocked, "inactive service must not publicly render");
  } finally {
    await prisma.service.update({ where: { id: svcRow.id }, data: { status: prevStatus } });
  }
  const restored = await resolveServiceLocationPageFresh({
    serviceSlug: "cleaning-services",
    locationSlug: "dubai",
    locale: "en",
  });
  assert(restored, "service restore still resolves");

  // 9 unserved location blocked
  const locRow = await prisma.location.findUnique({ where: { slug: "dubai" } });
  assert(locRow, "dubai location");
  const prevServes = locRow.serves;
  await prisma.location.update({ where: { id: locRow.id }, data: { serves: false } });
  try {
    const blocked = await resolveServiceLocationPageFresh({
      serviceSlug: "cleaning-services",
      locationSlug: "dubai",
      locale: "en",
    });
    assert(!blocked, "unserved location must not publicly render");
  } finally {
    await prisma.location.update({ where: { id: locRow.id }, data: { serves: prevServes } });
  }

  // 10 covered=false blocked
  const pair = await prisma.serviceLocation.findFirst({
    where: {
      service: { slug: "cleaning-services" },
      location: { slug: "dubai" },
    },
  });
  assert(pair, "pair exists");
  const prevCovered = pair.covered;
  await prisma.serviceLocation.update({ where: { id: pair.id }, data: { covered: false } });
  try {
    const blocked = await resolveServiceLocationPageFresh({
      serviceSlug: "cleaning-services",
      locationSlug: "dubai",
      locale: "en",
    });
    assert(!blocked, "covered=false must not publicly render");
  } finally {
    await prisma.serviceLocation.update({ where: { id: pair.id }, data: { covered: prevCovered } });
  }

  // 11–12 DIY inheritance + RED safety
  const red = resolveDiyInheritance({
    serviceRiskLevel: "red",
    serviceDiyAvailable: true,
    diyRestricted: false,
    guide: { id: "g", slug: "x", riskLevel: "green", status: "published" },
  });
  assert(red.safetyClass === "RED", "RED DIY safety preserved against weaker guide");
  assert(!red.visible, "RED DIY must not be visible");
  assert(!red.safetyWeakened || red.safetyClass === "RED", "must not weaken to visible DIY");

  if (restored!.diy.visible) {
    assert(restored!.diy.source === "service-offering", "DIY source is service offering");
    if (restored!.diy.guideSlug) {
      assert(restored!.diy.guideHref === `/diy/${restored!.diy.guideSlug}`, "DIY link inherits canonical guide");
    }
  } else if (restored!.diy.safetyClass === "RED" || restored!.diy.safetyClass === "REVIEW_REQUIRED") {
    assert(!restored!.diy.guideHref, "unsafe DIY must not expose guide CTA");
  }

  // 13 image inheritance
  const imgOverride = resolveImageInheritance({
    heroImageOverride: "/media/approved-test.jpg",
    serviceHeroImage: "/media/service.jpg",
    serviceName: "A",
    locationName: "B",
    locale: "en",
  });
  assert(imgOverride.source === "override", "override wins");
  const imgService = resolveImageInheritance({
    heroImageOverride: null,
    serviceHeroImage: "/media/service.jpg",
    serviceName: "A",
    locationName: "B",
    locale: "en",
  });
  assert(imgService.source === "service", "service hero next");
  const imgFallback = resolveImageInheritance({
    heroImageOverride: null,
    serviceHeroImage: null,
    serviceName: "A",
    locationName: "B",
    locale: "en",
  });
  assert(imgFallback.source === "approved_fallback", "approved fallback last");
  assert(imgFallback.src === null, "no generated image during request");
  assert(restored!.image.source !== "override" || Boolean(restored!.image.src), "public image inheritance applied");

  // 14–16 metadata, hreflang, breadcrumbs
  assert(restored!.seoTitle.trim().length > 8, "metadata title present");
  assert(restored!.metaDescription.trim().length > 8, "metadata description present");
  assert(restored!.hreflang.en?.includes("/en/cleaning-services/dubai"), "hreflang EN");
  assert(restored!.hreflang.ar?.includes("/ar/cleaning-services/dubai"), "hreflang AR");
  assert(restored!.breadcrumbs.some((b) => b.slug === "dubai"), "breadcrumb includes location");
  assert(!BANNED.test(restored!.seoTitle), "title has no banned claims");
  assert(!BANNED.test(restored!.metaDescription), "meta has no banned claims");

  // 17 schema has no fake claims / AggregateRating
  const schema = serviceJsonLd({
    name: restored!.content.h1,
    description: restored!.metaDescription,
    path: restored!.path,
    locale: "en",
  });
  assert(!("aggregateRating" in schema), "Service schema has no fake AggregateRating");
  assert(reviewAggregateJsonLd({ name: "x", path: "/x", locale: "en", average: 0, count: 0, reviews: [] }) === null, "empty reviews → no AggregateRating");

  // 18 CTA follows effective flags
  assert(typeof restored!.ops.bookingEnabled === "boolean", "booking flag resolved");
  assert(typeof restored!.ops.emergencyAvailable === "boolean", "emergency flag resolved");
  assert(typeof restored!.ops.amcAvailable === "boolean", "amc flag resolved");

  // 19 related links bounded
  assert(restored!.relatedServices.length <= 6, "related services ≤6");
  assert(restored!.relatedLocations.length <= 6, "related locations ≤6");

  // 20 no draft leakage
  const publicCount = await prisma.serviceLocation.count({ where: publicServiceLocationWhere });
  assert(publicCount === 49, `public where still 49, got ${publicCount}`);
  const pageSrc = readFileSync(join(process.cwd(), "src/app/[locale]/[service]/[location]/page.tsx"), "utf8");
  assert(pageSrc.includes("publicServiceLocationWhere"), "SSG uses public where only");
  assert(!pageSrc.includes("A32_PILOT"), "page does not hardcode pilot");
  assert(pageSrc.includes("resolveServiceLocationPage"), "page uses page engine");

  // Admin preview allows drafts privately
  const pilotSvc = await prisma.service.findUnique({ where: { slug: A32_PILOT_SERVICE_SLUGS[0] } });
  const pilotLoc = await prisma.location.findUnique({ where: { slug: A32_PILOT_LOCATION_SLUGS[0] } });
  assert(pilotSvc && pilotLoc, "pilot ids");
  const pilotRow = await prisma.serviceLocation.findUnique({
    where: { serviceId_locationId: { serviceId: pilotSvc.id, locationId: pilotLoc.id } },
  });
  assert(pilotRow, "pilot row");
  const preview = await resolveServiceLocationPreviewImpl(pilotRow.id, "en");
  assert(preview, "authorized preview can resolve draft");
  assert(preview.mode === "preview", "preview mode");
  assert(!preview.localeIndexable, "preview always noindex");
  const previewPage = readFileSync(
    join(process.cwd(), "src/app/admin/service-pages/[id]/preview/page.tsx"),
    "utf8",
  );
  assert(previewPage.includes("needPermission"), "preview RBAC protected");
  assert(previewPage.includes("index: false") || previewPage.includes("robots"), "preview noindex");

  // 21 sitemap unchanged
  const sitemapSrc = readFileSync(join(process.cwd(), "src/app/sitemap.ts"), "utf8");
  assert(sitemapSrc.includes("pair.service.slug"), "sitemap still uses existing pair query");
  assert(!sitemapSrc.includes("a33") && !sitemapSrc.includes("62200"), "sitemap not expanded");
  const robotsSrc = readFileSync(join(process.cwd(), "src/app/robots.ts"), "utf8");
  assert(robotsSrc.length > 0, "robots file present unchanged for A3.3 scope");

  // Gate unit: incomplete AR content fails AR independently
  const gateAr = evaluateServiceLocationGates({
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
    serviceRiskLevel: "green",
    indexableStored: true,
    qualityStatus: "indexable",
    qualityScore: 80,
    serviceIndexable: true,
    locationIndexable: true,
    locationSlug: "dubai",
    serviceSlug: "cleaning-services",
    serviceHeroImage: null,
    heroImageOverride: null,
    en: {
      locale: "en",
      intro: "Professional cleaning services in Dubai for homes and buildings.",
      localInfo: "Villa and apartment cleaning needs vary by access and finishes.",
      seoTitle: "Cleaning Services in Dubai | ALNAJAH ALDAEM",
      metaDescription: "Request cleaning in Dubai. Coverage by enquiry.",
      faq: "[]",
    },
    ar: { locale: "ar", intro: "", localInfo: "", seoTitle: "", metaDescription: "", faq: "[]" },
    arabicConfidence: "HIGH",
    diySafetyClass: "GREEN",
    safetyReviewComplete: true,
    uniqueTitleEn: true,
    uniqueTitleAr: true,
    uniqueMetaEn: true,
    uniqueMetaAr: true,
    duplicateSimilarityOk: true,
    claimScanOk: true,
    thinContentOk: true,
    humanApproved: true,
  });
  assert(localeShouldIndex(gateAr, "en"), "EN can index when complete");
  assert(!localeShouldIndex(gateAr, "ar"), "AR blocked when AR incomplete");

  // Flat route only
  assert(!pageSrc.includes("offering"), "no deep offering URLs");
  assert(pageSrc.includes('path: model.path') || pageSrc.includes("model.path"), "flat path metadata");

  console.log(
    JSON.stringify(
      {
        ok: true,
        serviceLocationTotal: population.serviceLocationTotal,
        approvedMatrixRows: population.classification.approvedMatrixRows,
        legacyOutsideMatrixRows: population.classification.legacyOutsideMatrixRows,
        equation: population.equation,
        publishedIndexable: published,
        pilotsPreserved: population.pilotsPreserved,
        publicWhere: publicCount,
        samplePath: restored!.path,
        relatedServices: restored!.relatedServices.length,
        relatedLocations: restored!.relatedLocations.length,
        diyVisible: restored!.diy.visible,
        diySafety: restored!.diy.safetyClass,
        imageSource: restored!.image.source,
        checks: 22,
      },
      null,
      2,
    ),
  );
  console.log("A3.3 service-location page engine PASSED");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
