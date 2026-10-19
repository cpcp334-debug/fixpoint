import { buildVisitorServiceCopy } from "@/lib/catalog/service-visitor-copy";
import { APPROVED_CATEGORIES } from "../../../prisma/data/catalog-a1";

const AR = /[\u0600-\u06FF]/;

/** True when a CMS field is empty or still a REVIEW_REQUIRED placeholder. */
export function isReviewRequiredText(value?: string | null): boolean {
  if (value == null) return true;
  const t = value.trim();
  if (!t) return true;
  return t === "REVIEW_REQUIRED" || t.startsWith("REVIEW_REQUIRED");
}

/** Prefer a real string; never return REVIEW_REQUIRED to public UI. */
export function publicText(preferred?: string | null, fallback?: string | null, empty = ""): string {
  if (!isReviewRequiredText(preferred)) return preferred!.trim();
  if (!isReviewRequiredText(fallback)) return fallback!.trim();
  return empty;
}

type ServiceI18nLike = {
  locale: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  whoItIsFor?: string;
  whatWeDo?: string;
  whenProfessional?: string;
  process?: string;
  pricingInfo?: string;
  professionalFallback?: string;
  safetyNotes?: string;
  seoTitle?: string;
  metaDescription?: string;
};

type ServiceRowLike = {
  status?: string;
  slug: string;
  translations: ServiceI18nLike[];
  category?: {
    slug?: string | null;
    translations?: Array<{ locale: string; name: string }>;
  } | null;
};

/**
 * Sanitize service i18n for public pages.
 * AR: replace REVIEW_REQUIRED body fields with generated MSA copy (or EN as last resort).
 * EN: strip REVIEW_REQUIRED placeholders.
 */
export function sanitizePublicServiceI18n<T extends ServiceI18nLike>(
  row: ServiceRowLike,
  locale: string,
  t: T,
): T {
  const en = row.translations.find((x) => x.locale === "en");
  const categorySlug = row.category?.slug || "general-maintenance";
  const category = APPROVED_CATEGORIES.find((cat) => cat.slug === categorySlug);
  const catArFromDb = row.category?.translations?.find((x) => x.locale === "ar")?.name;
  const categoryNameAr =
    catArFromDb && AR.test(catArFromDb) && !isReviewRequiredText(catArFromDb)
      ? catArFromDb
      : category?.nameAr && !isReviewRequiredText(category.nameAr)
        ? category.nameAr
        : "الصيانة";

  const copy = buildVisitorServiceCopy({
    slug: row.slug,
    nameEn: en?.name || row.slug,
    categorySlug,
    categoryNameEn: category?.nameEn || "Maintenance",
    categoryNameAr,
  });

  // Activated legacy records can still hold authoring-only seed text. Keep the
  // stored record and SEO fields intact; present the existing visitor copy.
  if (row.status === 'active') {
    const stale = (value?: string) => /draft catalog|not publicly offered|not offered publicly|not active\.|Phase A1 master catalog|draft\/non-indexable|require human review before public activation|مسودة|قاعدة البيانات|غير قابلة للفهرسة/i.test(value || '');
    t = {...t};
    const fallback = locale === 'ar'
      ? {shortDescription:copy.shortAr,longDescription:copy.longAr,whoItIsFor:copy.whoAr,whatWeDo:copy.whatAr,whenProfessional:copy.whenAr,process:copy.processAr,pricingInfo:copy.priceAr,professionalFallback:copy.safetyAr,safetyNotes:copy.safetyAr}
      : {shortDescription:copy.shortEn,longDescription:copy.longEn,whoItIsFor:copy.whoEn,whatWeDo:copy.whatEn,whenProfessional:copy.whenEn,process:copy.processEn,pricingInfo:copy.priceEn,professionalFallback:copy.safetyEn,safetyNotes:copy.safetyEn};
    for (const key of Object.keys(fallback) as Array<keyof typeof fallback>) {
      if(stale(t[key])) (t as ServiceI18nLike)[key] = fallback[key];
    }
  }

  if (locale === "ar") {
    const name = !isReviewRequiredText(t.name) && AR.test(t.name) ? t.name : copy.nameAr;
    return {
      ...t,
      name,
      shortDescription: !isReviewRequiredText(t.shortDescription)
        ? t.shortDescription
        : copy.shortAr || publicText(en?.shortDescription),
      longDescription: !isReviewRequiredText(t.longDescription)
        ? t.longDescription
        : copy.longAr || publicText(en?.longDescription),
      whoItIsFor: !isReviewRequiredText(t.whoItIsFor) ? t.whoItIsFor! : copy.whoAr || publicText(en?.whoItIsFor),
      whatWeDo: !isReviewRequiredText(t.whatWeDo) ? t.whatWeDo! : copy.whatAr || publicText(en?.whatWeDo),
      whenProfessional: !isReviewRequiredText(t.whenProfessional)
        ? t.whenProfessional!
        : copy.whenAr || publicText(en?.whenProfessional),
      process: !isReviewRequiredText(t.process) ? t.process! : copy.processAr || publicText(en?.process),
      pricingInfo: !isReviewRequiredText(t.pricingInfo) ? t.pricingInfo! : copy.priceAr || publicText(en?.pricingInfo),
      professionalFallback: !isReviewRequiredText(t.professionalFallback)
        ? t.professionalFallback!
        : copy.safetyAr || publicText(en?.professionalFallback),
      safetyNotes: !isReviewRequiredText(t.safetyNotes) ? t.safetyNotes! : copy.safetyAr || publicText(en?.safetyNotes),
      seoTitle: !isReviewRequiredText(t.seoTitle) ? t.seoTitle! : `${name} | النجاح الدائم · فكس بوينت`.slice(0, 60),
      metaDescription: !isReviewRequiredText(t.metaDescription)
        ? t.metaDescription!
        : (copy.shortAr || publicText(en?.metaDescription)).slice(0, 155),
    };
  }

  return {
    ...t,
    name: publicText(t.name, en?.name, row.slug),
    shortDescription: publicText(t.shortDescription, en?.shortDescription),
    longDescription: publicText(t.longDescription, en?.longDescription),
    whoItIsFor: publicText(t.whoItIsFor, en?.whoItIsFor),
    whatWeDo: publicText(t.whatWeDo, en?.whatWeDo),
    whenProfessional: publicText(t.whenProfessional, en?.whenProfessional),
    process: publicText(t.process, en?.process),
    pricingInfo: publicText(t.pricingInfo, en?.pricingInfo),
    professionalFallback: publicText(t.professionalFallback, en?.professionalFallback),
    safetyNotes: publicText(t.safetyNotes, en?.safetyNotes),
    seoTitle: publicText(t.seoTitle, en?.seoTitle),
    metaDescription: publicText(t.metaDescription, en?.metaDescription),
  };
}
