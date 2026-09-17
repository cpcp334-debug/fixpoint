import { parseFaqJson } from "@/lib/faq";

export type BlogLocaleFields = {
  title: string;
  excerpt: string;
  body: string;
  diySection: string;
  faq: string;
  imageAlt: string;
  seoTitle: string;
  metaDescription: string;
};

export type BlogGateInput = {
  slug: string;
  status: string;
  indexable: boolean;
  heroImage: string | null;
  en: BlogLocaleFields;
  ar: BlogLocaleFields;
};

export type BlogGateResult = {
  pass: boolean;
  failures: string[];
  checks: {
    enWords: number;
    arWords: number;
    enGe1000: boolean;
    arGe1000: boolean;
    faqEn: boolean;
    faqAr: boolean;
    imageWebp: boolean;
    altEn: boolean;
    altAr: boolean;
    seo: boolean;
    aeo: boolean;
    geo: boolean;
    claims: boolean;
    filler: boolean;
  };
};

const CLAIM_RE =
  /\b(best|#1|number\s*one|cheapest|guaranteed|certified|licensed|24\s*\/\s*7|24-7|fastest|most\s+trusted|official)\b/i;
const FILLER_RE =
  /Exclusive editorial lexicon|مفردات تحريرية حصرية|Extra field note \d+|ملاحظة ميدانية إضافية/i;

function wordCount(text: string) {
  return text.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

function faqAnswerText(raw: string) {
  return parseFaqJson(raw)
    .map((x) => x.a)
    .join(" ");
}

function renderedWords(locale: BlogLocaleFields) {
  return wordCount(`${locale.body}\n${locale.diySection}\n${faqAnswerText(locale.faq)}`);
}

function hasAeoSignals(body: string, locale: "en" | "ar") {
  if (locale === "ar") {
    return (
      /##\s+/.test(body) &&
      /(ما هو|علامات|أسباب|بنفسك|محترف|الخطوة التالية|الأسئلة)/i.test(body)
    );
  }
  return (
    /##\s+/.test(body) &&
    /(what (is|this)|common (signs|problems|causes)|what not to|when to (call|stop)|how (the )?service|prepar|next step|direct answer)/i.test(
      body,
    )
  );
}

function hasGeoSignals(slug: string, body: string, seoTitle: string) {
  const placeHints = [
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
  ];
  const blob = `${slug} ${body} ${seoTitle}`.toLowerCase();
  return placeHints.some((h) => blob.includes(h));
}

export function evaluateBlogPublicationGates(input: BlogGateInput): BlogGateResult {
  const failures: string[] = [];
  const enWords = renderedWords(input.en);
  const arWords = renderedWords(input.ar);
  const enGe1000 = enWords >= 1000;
  const arGe1000 = arWords >= 1000;
  if (!enGe1000) failures.push(`en_words_${enWords}<1000`);
  if (!arGe1000) failures.push(`ar_words_${arWords}<1000`);

  const faqEnItems = parseFaqJson(input.en.faq);
  const faqArItems = parseFaqJson(input.ar.faq);
  const faqEn = faqEnItems.length >= 4 && faqEnItems.every((x) => x.q && x.a && x.a.trim().length > 20);
  const faqAr = faqArItems.length >= 4 && faqArItems.every((x) => x.q && x.a && x.a.trim().length > 20);
  if (!faqEn) failures.push("faq_en");
  if (!faqAr) failures.push("faq_ar");

  const image = (input.heroImage || "").trim();
  const imageWebp = /\.webp($|\?)/i.test(image) && image.startsWith("/media/");
  if (!imageWebp) failures.push("image_webp");

  const altEn = (input.en.imageAlt || "").trim().length >= 8;
  const altAr = (input.ar.imageAlt || "").trim().length >= 8;
  if (!altEn) failures.push("alt_en");
  if (!altAr) failures.push("alt_ar");

  const seo =
    (/Al Najah Al Daem · Fixpoint|ALNAJAH ALDAEM|Fixpoint/.test(input.en.seoTitle) ||
      input.en.seoTitle.includes("النجاح الدائم · Fixpoint")) &&
    input.ar.seoTitle.trim().length >= 20 &&
    input.en.metaDescription.trim().length >= 70 &&
    input.ar.metaDescription.trim().length >= 40 &&
    !/^best\b/i.test(input.en.seoTitle);
  if (!seo) failures.push("seo");

  const aeo = hasAeoSignals(input.en.body, "en") && hasAeoSignals(input.ar.body, "ar");
  if (!aeo) failures.push("aeo");

  const geo = hasGeoSignals(input.slug, input.en.body, input.en.seoTitle);
  if (!geo) failures.push("geo");

  const claimBlob = [
    input.en.title,
    input.en.body,
    input.en.diySection,
    input.en.seoTitle,
    input.en.metaDescription,
    input.ar.title,
    input.ar.body,
    input.ar.diySection,
    input.ar.seoTitle,
    input.ar.metaDescription,
  ].join("\n");
  const claims = !CLAIM_RE.test(claimBlob);
  if (!claims) failures.push("unsupported_claims");

  const filler = !FILLER_RE.test(`${input.en.body}\n${input.ar.body}`);
  if (!filler) failures.push("ai_filler");

  return {
    pass: failures.length === 0,
    failures,
    checks: {
      enWords,
      arWords,
      enGe1000,
      arGe1000,
      faqEn,
      faqAr,
      imageWebp,
      altEn,
      altAr,
      seo,
      aeo,
      geo,
      claims,
      filler,
    },
  };
}
