/**
 * Location hub FINAL ARTICLE GATE (≥800 EN + ≥800 AR rendered words).
 * Rejects thin content, swap-template fingerprints, unsafe DIY claims, and missing SEO/AEO.
 */
import { parseFaqJson } from "@/lib/faq";
import type { LocationHubPackage } from "@/lib/locations/hub-article";
import { renderedHubWords } from "@/lib/locations/hub-article";

export type LocationHubGateResult = {
  pass: boolean;
  failures: string[];
  checks: {
    enWords: number;
    arWords: number;
    enGe800: boolean;
    arGe800: boolean;
    faqEn: boolean;
    faqAr: boolean;
    imageWebp: boolean;
    altEn: boolean;
    altAr: boolean;
    seo: boolean;
    aeo: boolean;
    geo: boolean;
    claims: boolean;
    swapTemplate: boolean;
    safety: boolean;
  };
};

const CLAIM_RE =
  /\b(best|#1|number\s*one|cheapest|guaranteed|certified|licensed|24\s*\/\s*7|24-7|fastest|most\s+trusted|official)\b/i;
const DANGEROUS_DIY_RE =
  /\b(open the panel|rewire|bypass the breaker|mix bleach with|DIY gas|DIY electrical panel)\b/i;
const SWAP_RE =
  /LOCATION_NAME_HERE|EMIRATE_NAME_HERE|\{\{place\}\}|\{\{emirate\}\}|Exclusive editorial lexicon|مفردات تحريرية حصرية/i;

function hasAeo(body: string, locale: "en" | "ar") {
  if (locale === "ar") {
    return (
      /##\s+/.test(body) &&
      /(ما هذا|علامات|تجنّب|محترف|الخطوة التالية|إجابات مباشرة)/i.test(body)
    );
  }
  return (
    /##\s+/.test(body) &&
    /(what is this|common signs|what not to|when to call|direct answers|next step)/i.test(body)
  );
}

function hasGeo(slug: string, blob: string) {
  const hints = [
    "uae",
    "dubai",
    "sharjah",
    "abu dhabi",
    "ajman",
    "emirates",
    "الإمارات",
    "دبي",
    "الشارقة",
    "أبوظبي",
    "عجمان",
    "الفجيرة",
    "رأس الخيمة",
  ];
  const lower = `${slug} ${blob}`.toLowerCase();
  return hints.some((h) => lower.includes(h.toLowerCase()));
}

export function evaluateLocationHubGates(pkg: LocationHubPackage): LocationHubGateResult {
  const failures: string[] = [];
  const enWords = renderedHubWords(pkg.en);
  const arWords = renderedHubWords(pkg.ar);
  const enGe800 = enWords >= 800;
  const arGe800 = arWords >= 800;
  if (!enGe800) failures.push(`en_words_${enWords}<800`);
  if (!arGe800) failures.push(`ar_words_${arWords}<800`);

  const faqEnItems = parseFaqJson(pkg.en.faq);
  const faqArItems = parseFaqJson(pkg.ar.faq);
  const faqEn = faqEnItems.length >= 4 && faqEnItems.every((x) => x.q && x.a && x.a.trim().length > 20);
  const faqAr = faqArItems.length >= 4 && faqArItems.every((x) => x.q && x.a && x.a.trim().length > 20);
  if (!faqEn) failures.push("faq_en");
  if (!faqAr) failures.push("faq_ar");

  const imageWebp = /\.webp($|\?)/i.test(pkg.coverImage) && pkg.coverImage.startsWith("/media/");
  if (!imageWebp) failures.push("image_webp");

  const altEn = pkg.en.imageAlt.trim().length >= 8;
  const altAr = pkg.ar.imageAlt.trim().length >= 8 && /[\u0600-\u06FF]/.test(pkg.ar.imageAlt);
  if (!altEn) failures.push("alt_en");
  if (!altAr) failures.push("alt_ar");

  const seo =
    /Al Najah Al Daem · Fixpoint|Fixpoint/.test(pkg.en.seoTitle) &&
    /فكس بوينت|النجاح الدائم/.test(pkg.ar.seoTitle) &&
    pkg.en.metaDescription.trim().length >= 70 &&
    pkg.ar.metaDescription.trim().length >= 40 &&
    !/^best\b/i.test(pkg.en.seoTitle);
  if (!seo) failures.push("seo");

  const aeo = hasAeo(pkg.en.localServiceInfo, "en") && hasAeo(pkg.ar.localServiceInfo, "ar");
  if (!aeo) failures.push("aeo");

  const blob = `${pkg.en.localServiceInfo}\n${pkg.ar.localServiceInfo}\n${pkg.en.seoTitle}\n${pkg.ar.seoTitle}`;
  const geo = hasGeo(pkg.slug, blob) && blob.includes(pkg.en.name);
  if (!geo) failures.push("geo");

  if (/REVIEW_REQUIRED/i.test(`${pkg.ar.name}\n${pkg.ar.localServiceInfo}`)) failures.push("ar_review_required");
  if (!/[\u0600-\u06FF]/.test(pkg.ar.localServiceInfo)) failures.push("ar_body_not_arabic");

  const claims = !CLAIM_RE.test(blob);
  if (!claims) failures.push("unsupported_claims");

  const swapTemplate = !SWAP_RE.test(blob);
  if (!swapTemplate) failures.push("swap_template");

  const safety = !DANGEROUS_DIY_RE.test(blob);
  if (!safety) failures.push("dangerous_diy");

  // Duplicate-title fingerprint across EN/AR seo must still be unique per slug (checked in batch)
  if (!pkg.en.seoTitle.includes(pkg.en.name) && !pkg.en.seoTitle.toLowerCase().includes(pkg.slug.replace(/-/g, " "))) {
    failures.push("seo_missing_place");
  }

  return {
    pass: failures.length === 0,
    failures,
    checks: {
      enWords,
      arWords,
      enGe800,
      arGe800,
      faqEn,
      faqAr,
      imageWebp,
      altEn,
      altAr,
      seo,
      aeo,
      geo,
      claims,
      swapTemplate,
      safety,
    },
  };
}
