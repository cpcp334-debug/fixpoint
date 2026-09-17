/**
 * A4.1 — Service-location content foundation verification.
 * Synthetic/in-memory fixtures only for content rules.
 * Does not generate pages, publish pilots, or expand ServiceLocation.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { publicServiceLocationWhere } from "../src/lib/catalog";
import {
  assembleContentJson,
  buildAeoContent,
  buildDiyContentBlocks,
  buildExpertCta,
  buildGeoContent,
  buildMainContent,
} from "../src/lib/service-location/content-builders";
import { scanUnsupportedClaims } from "../src/lib/service-location/content-claims";
import { evaluateLocaleCompleteness, isLegacyCompatRow } from "../src/lib/service-location/content-completeness";
import { evaluateContentQuality } from "../src/lib/service-location/content-quality";
import { parseContentJson, validateContentJsonForPublication } from "../src/lib/service-location/content-parse";
import { scanDuplicateSimilarity, titlesUnique } from "../src/lib/service-location/content-similarity";
import { scanThinContent } from "../src/lib/service-location/content-thin";
import { emptyContentJson, type ServiceLocationContentJson } from "../src/lib/service-location/content-contract";
import {
  assertDiyMatrixCounts,
  findRiskMatrixMismatches,
  getDiyMatrixClass,
  loadDiyClassificationMatrix,
} from "../src/lib/service-location/diy-matrix";
import { diyLimitedGuidanceAllowed, diyProceduralAllowed, resolveDiyInheritance } from "../src/lib/service-location/diy";
import { evaluateServiceLocationGates, localeShouldIndex } from "../src/lib/service-location/gates";
import { resolveImageInheritance } from "../src/lib/service-location/images";
import {
  assertPopulationInvariants,
  measureServiceLocationPopulation,
} from "../src/lib/service-location/population";
import { workingCopySnapshot } from "../src/lib/service-location/revisions";
import { parseRevisionSnapshot } from "../src/lib/service-location/page-model";
import type { WorkingCopy } from "../src/lib/service-location/types";
import { a32PilotPairs } from "../prisma/data/service-location-a32-pilot";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function baseOps(over: Partial<Parameters<typeof evaluateContentQuality>[0]> = {}) {
  return {
    mode: "STRICT_NEW_CONTENT" as const,
    covered: true,
    coverageStatus: "published" as const,
    serviceExists: true,
    locationExists: true,
    serviceStatus: "active" as const,
    locationStatus: "active" as const,
    locationServes: true,
    serviceIndexable: true,
    locationIndexable: true,
    serviceSlug: "ac-filter-cleaning",
    locationSlug: "dubai-marina",
    serviceName: "AC Filter Cleaning",
    locationName: "Dubai Marina",
    serviceHeroImage: "/media/services/ac.jpg",
    heroImageOverride: null,
    arabicConfidence: "HIGH" as const,
    diySafetyClass: "GREEN" as const,
    diyGuideId: "guide-1",
    diyMatrixMapped: true,
    safetyReviewComplete: true,
    humanApproved: true,
    qualityScore: 80,
    qualityStatusStored: "ready_for_review" as const,
    ...over,
  };
}

function completeContent(over: Partial<ServiceLocationContentJson> = {}): ServiceLocationContentJson {
  const geo = buildGeoContent({
    chain: [
      { slug: "dubai", type: "emirate", name: "Dubai" },
      { slug: "dubai-marina", type: "community", name: "Dubai Marina" },
    ],
    localInfo: "Marina towers and waterfront apartments with typical AC access constraints.",
    approvedLocalContext: "Coverage applies to residential units listed as served.",
    covered: true,
    serviceName: "AC Filter Cleaning",
    locationName: "Dubai Marina",
    locale: "en",
  });
  const aeo = buildAeoContent({
    locale: "en",
    serviceName: "AC Filter Cleaning",
    locationName: "Dubai Marina",
    serviceShort: "Professional cleaning of AC filters for healthier indoor air and airflow.",
    whenProfessional: "Call a professional if units are sealed, electrical panels are involved, or mold is present.",
    diySafety: "GREEN",
    diyVisible: true,
    diyQuickAnswer: "You can inspect and gently clean accessible filters when power is off.",
    ops: {
      bookingEnabled: true,
      amcAvailable: false,
      emergencyAvailable: false,
      diyVisible: true,
      diyRestricted: false,
      riskLevel: "green",
    },
    covered: true,
  });
  const diy = buildDiyContentBlocks({
    safetyState: "GREEN",
    guideSlug: "how-to-clean-ac-filter",
    professionalFallback: "Request Al Najah Al Daem if the filter is inaccessible or the unit is unsafe.",
    safeSelfChecks: ["Power off before opening accessible filter slots."],
    tools: ["Soft brush", "Vacuum"],
    steps: ["Remove accessible filter", "Clean gently", "Refit securely"],
    stopConditions: ["Stop if wiring or sealed cabinets are involved."],
    whatNotToDo: ["Do not force panels or use water on electronics."],
    safetyNotes: ["Follow manufacturer guidance."],
  });
  const main = buildMainContent({
    serviceExplanation:
      "AC filter cleaning removes dust and debris from accessible filters to support airflow and indoor air quality.",
    problems: ["Reduced airflow", "Dust buildup"],
    symptomsUseCases: ["Musty smell", "Weak cooling"],
    process: ["Inspect access", "Clean or replace filter", "Confirm airflow"],
    propertyTypes: ["Apartment", "Villa"],
    professionalRecommendation: "Use a professional when access is restricted or contamination is severe.",
  });
  const expert = buildExpertCta({
    helpSummary: "Al Najah Al Daem can inspect access, clean filters safely, and advise on maintenance.",
    ops: {
      bookingEnabled: true,
      amcAvailable: false,
      emergencyAvailable: false,
      diyVisible: true,
      diyRestricted: false,
      riskLevel: "green",
    },
  });
  const assembled = assembleContentJson({
    main,
    aeo,
    geo,
    diy,
    faq: [
      {
        question: "How often should AC filters be cleaned?",
        answer: "Many homes benefit from seasonal checks; dusty environments may need more frequent cleaning.",
        locale: "en",
        approvalState: "approved",
        category: "service",
      },
      {
        question: "Can I book this in Dubai Marina?",
        answer: "Yes — submit a booking request when booking is enabled for this service.",
        locale: "en",
        approvalState: "approved",
        category: "booking",
      },
    ],
    expert,
  });
  return { ...assembled, ...over };
}

function completeEnCopy(content: ServiceLocationContentJson): WorkingCopy {
  return {
    locale: "en",
    intro:
      "AC Filter Cleaning in Dubai Marina helps restore airflow in apartments and villas with accessible indoor units.",
    localInfo: "Dubai Marina residences often have compact plant rooms and shared risers that affect access.",
    seoTitle: "Trusted AC Filter Cleaning in Dubai Marina | Al Najah Al Daem",
    metaDescription: "Request AC filter cleaning in Dubai Marina. Coverage by enquiry with Al Najah Al Daem.",
    faq: "[]",
    h1: "AC Filter Cleaning in Dubai Marina",
    body: "Service details follow approved content sections.",
    directAnswer: content.aeo.directAnswer,
    geoIntro: content.geo.coverageStatement,
    imageAlt: "AC filter cleaning in Dubai Marina",
    contentJson: content,
  };
}

async function main() {
  const populationBefore = await measureServiceLocationPopulation(prisma);
  assertPopulationInvariants(populationBefore);
  const beforeCount = populationBefore.serviceLocationTotal;

  // DIY matrix counts
  const matrixCounts = assertDiyMatrixCounts();
  assert(matrixCounts.ok, `DIY matrix counts drifted: ${JSON.stringify(matrixCounts)}`);
  loadDiyClassificationMatrix();
  assert(getDiyMatrixClass("ac-filter-cleaning"), "matrix maps ac-filter-cleaning");

  const services = await prisma.service.findMany({ select: { slug: true, riskLevel: true } });
  const mismatches = findRiskMatrixMismatches(services);
  // Report only — do not fail A4.1 on mismatches (matrix wins at eval time; Service.riskLevel untouched)
  console.log(JSON.stringify({ riskMatrixMismatchCount: mismatches.length, sample: mismatches.slice(0, 5) }));

  const content = completeContent();
  const en = completeEnCopy(content);
  const arIncomplete: WorkingCopy = {
    locale: "ar",
    intro: "",
    localInfo: "",
    seoTitle: "",
    metaDescription: "",
    faq: "[]",
  };

  // 1 complete EN → publishable EN
  const completeReport = evaluateContentQuality({
    ...baseOps(),
    en,
    ar: arIncomplete,
  });
  assert(completeReport.publishableEn, "1: complete EN must be publishableEn");
  assert(completeReport.indexableEn, "1: complete EN must be indexableEn");

  // 2 incomplete EN → not publishable
  const incompleteEn = evaluateContentQuality({
    ...baseOps(),
    en: { ...en, intro: "", contentJson: null },
    ar: arIncomplete,
  });
  assert(!incompleteEn.publishableEn, "2: incomplete EN not publishable");

  // 3 incomplete AR → EN may still publish
  assert(completeReport.publishableEn && !completeReport.arComplete, "3: EN publishable with incomplete AR");

  // 4 incomplete AR → AR cannot index
  assert(!completeReport.indexableAr, "4: incomplete AR cannot index");

  // 5 no Arabic fallback — AR gates use AR copy only
  const arGate = evaluateServiceLocationGates({
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
    qualityStatus: "ready_for_review",
    qualityScore: 80,
    serviceIndexable: true,
    locationIndexable: true,
    locationSlug: "dubai-marina",
    serviceSlug: "ac-filter-cleaning",
    serviceHeroImage: "/media/services/ac.jpg",
    heroImageOverride: null,
    en,
    ar: arIncomplete,
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
    contentMode: "STRICT_NEW_CONTENT",
  });
  assert(localeShouldIndex(arGate, "en"), "5a: EN indexes");
  assert(!localeShouldIndex(arGate, "ar"), "5b: AR does not index incomplete AR");

  // 6 duplicate title
  assert(!titlesUnique(en.seoTitle, [en.seoTitle]), "6: duplicate title detected");

  // 7 near-duplicate content
  const sim = scanDuplicateSimilarity(en.intro, [en.intro + " extra dust wording for marina towers"]);
  assert(sim.maxOverlap >= 0.5, "7: similarity detector runs");
  const near = scanDuplicateSimilarity(en.intro, [en.intro]);
  assert(!near.ok, "7b: identical content fails similarity");

  // 8 thin page
  const thin = scanThinContent({
    intro: "AC in Marina",
    localInfo: "x",
    serviceName: "AC Filter Cleaning",
    locationName: "Dubai Marina",
    content: emptyContentJson(),
  });
  assert(!thin.ok, "8: thin page fails");

  // 9–12 claims
  assert(!scanUnsupportedClaims("Best AC service in Dubai").ok, "9: Best claim fails");
  assert(!scanUnsupportedClaims("We are #1 in Dubai Marina").ok, "9b: #1 claim fails");
  assert(!scanUnsupportedClaims("Rated 4.9/5 from 200 reviews").ok, "10: fake rating/review fails");
  assert(!scanUnsupportedClaims("From AED 99 only").ok, "11: fake price fails");
  assert(!scanUnsupportedClaims("Our local office in Dubai Marina opens daily").ok, "12: fake office fails");

  // 13–17 DIY
  const green = resolveDiyInheritance({
    serviceRiskLevel: "green",
    serviceDiyAvailable: true,
    diyRestricted: false,
    matrixClass: "GREEN",
  });
  assert(diyProceduralAllowed(green.safetyClass), "13: GREEN allows procedural");
  const yellow = resolveDiyInheritance({
    serviceRiskLevel: "yellow",
    serviceDiyAvailable: true,
    diyRestricted: false,
    matrixClass: "YELLOW",
  });
  assert(diyLimitedGuidanceAllowed(yellow.safetyClass) && !diyProceduralAllowed(yellow.safetyClass), "14: YELLOW limited");
  const red = resolveDiyInheritance({
    serviceRiskLevel: "green",
    serviceDiyAvailable: true,
    diyRestricted: false,
    matrixClass: "RED",
    guide: { id: "g", slug: "weak-guide", riskLevel: "green", status: "published" },
  });
  assert(red.safetyClass === "RED" && !red.visible, "15: RED no procedural visibility");
  const rr = resolveDiyInheritance({
    serviceRiskLevel: "yellow",
    serviceDiyAvailable: true,
    diyRestricted: false,
    matrixClass: "REVIEW_REQUIRED",
  });
  assert(rr.safetyClass === "REVIEW_REQUIRED" && !rr.visible, "16: REVIEW_REQUIRED held");
  const weakenAttempt = resolveDiyInheritance({
    serviceRiskLevel: "red",
    serviceDiyAvailable: true,
    diyRestricted: false,
    matrixClass: "RED",
    guide: { id: "g2", slug: "green-guide", riskLevel: "green", status: "published" },
  });
  assert(weakenAttempt.safetyClass === "RED" && !weakenAttempt.visible, "17: cannot weaken RED via guide");

  const redBlocks = buildDiyContentBlocks({
    safetyState: "RED",
    guideSlug: null,
    professionalFallback: "Call a professional.",
    steps: ["should not remain"],
  });
  assert(redBlocks.steps.length === 0, "15b: RED builder strips steps");

  // 18–19 image
  const fallback = resolveImageInheritance({
    heroImageOverride: null,
    serviceHeroImage: null,
    serviceName: "AC",
    locationName: "Marina",
    locale: "en",
  });
  assert(fallback.source === "approved_fallback" && fallback.gatePass, "18: approved fallback passes");
  // Policy: approved_fallback gatePass=true; missing only if gatePass false (not current policy)
  assert(fallback.gatePass, "19: fallback policy allows gate pass");

  // 20–22 missing FAQ / AEO / GEO
  const noFaq = completeContent();
  noFaq.faq = [];
  const pubVal = validateContentJsonForPublication(noFaq);
  assert(!pubVal.ok && pubVal.issues.some((i) => i.code === "faq_missing"), "20: missing FAQ fails");
  const noAeo = completeContent();
  noAeo.aeo.directAnswer = "";
  assert(
    !evaluateLocaleCompleteness({
      copy: completeEnCopy(noAeo),
      mode: "STRICT_NEW_CONTENT",
      locale: "en",
    }).complete,
    "21: missing AEO direct answer fails completeness",
  );
  const noGeo = completeContent();
  noGeo.geo = {
    emirate: "",
    city: "",
    community: "",
    localInfo: "",
    approvedLocalContext: "",
    coverageStatement: "",
  };
  assert(
    !evaluateLocaleCompleteness({
      copy: completeEnCopy(noGeo),
      mode: "STRICT_NEW_CONTENT",
      locale: "en",
    }).complete,
    "22: missing GEO fails",
  );

  // contentJson parse round-trip + revision snapshot hybrid
  const snap = workingCopySnapshot(en);
  const parsedSnap = parseRevisionSnapshot(snap, "en");
  assert(parsedSnap?.contentJson, "snapshot retains contentJson");
  assert(parseContentJson(parsedSnap!.contentJson).ok, "contentJson validates from snapshot");

  // 23–26 DB regression
  const published = await prisma.serviceLocation.findMany({
    where: { covered: true, coverageStatus: "published", indexable: true },
  });
  assert(published.length === 49, `23: legacy 49 count, got ${published.length}`);
  for (const row of published) {
    assert(isLegacyCompatRow(row), `23b: ${row.id} must be LEGACY_COMPAT`);
    assert(row.qualityStatus === "indexable", `23c: ${row.id} quality indexable`);
  }

  // Original 50 pilots remain draft/uncovered/non-indexable (draft uncovered ≫ 50 after matrix expand)
  for (const pair of a32PilotPairs()) {
    const svc = await prisma.service.findUnique({ where: { slug: pair.serviceSlug } });
    const loc = await prisma.location.findUnique({ where: { slug: pair.locationSlug } });
    assert(svc && loc, `24: pilot catalog ${pair.serviceSlug}/${pair.locationSlug}`);
    const row = await prisma.serviceLocation.findUnique({
      where: { serviceId_locationId: { serviceId: svc.id, locationId: loc.id } },
    });
    assert(row, `24: pilot row ${pair.serviceSlug}/${pair.locationSlug}`);
    assert(row.coverageStatus === "draft" && row.covered === false, "24: pilot draft/uncovered");
    assert(!row.indexable && !row.indexableEn && !row.indexableAr, "24b: pilot noindex flags");
  }

  const populationAfter = await measureServiceLocationPopulation(prisma);
  assertPopulationInvariants(populationAfter);
  const afterCount = populationAfter.serviceLocationTotal;
  assert(
    beforeCount === afterCount,
    `25: ServiceLocation count must stay stable, before=${beforeCount} after=${afterCount}`,
  );
  assert(populationAfter.pilotsPreserved === 50, `24c: pilotsPreserved ${populationAfter.pilotsPreserved}`);

  const publicCount = await prisma.serviceLocation.count({ where: publicServiceLocationWhere });
  assert(publicCount === 49, `26: public URL set unchanged at 49, got ${publicCount}`);

  // 27 sitemap unchanged
  const sitemapSrc = readFileSync(join(process.cwd(), "src/app/sitemap.ts"), "utf8");
  assert(!sitemapSrc.includes("62200") && !sitemapSrc.includes("a41"), "27: sitemap not scaled");

  // 28 no page generation jobs
  const pkg = readFileSync(join(process.cwd(), "package.json"), "utf8");
  assert(!pkg.includes("generate:service-location-content"), "28: no bulk generation script");

  // Unknown fields ignored safely
  const withUnknown = parseContentJson({ version: 1, main: content.main, aeo: content.aeo, geo: content.geo, diy: content.diy, faq: content.faq, expert: content.expert, extraFuture: true });
  assert(withUnknown.ok && withUnknown.value, "unknown fields ignored safely");

  console.log(
    JSON.stringify(
      {
        ok: true,
        phase: "A4.1",
        serviceLocationBefore: beforeCount,
        serviceLocationAfter: afterCount,
        approvedMatrixRows: populationAfter.classification.approvedMatrixRows,
        legacyOutsideMatrixRows: populationAfter.classification.legacyOutsideMatrixRows,
        equation: populationAfter.equation,
        publishedLegacy: published.length,
        pilotsPreserved: populationAfter.pilotsPreserved,
        publicWhere: publicCount,
        diyMatrix: matrixCounts.expected,
        riskMatrixMismatchCount: mismatches.length,
        checks: 28,
      },
      null,
      2,
    ),
  );
  console.log("A4.1 service-location content foundation PASSED");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
