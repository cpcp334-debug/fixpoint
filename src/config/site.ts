export const locales = ["en", "ar"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "en";

/** Production public origin (Fixpoint). Override locally with SITE_URL. */
export const productionSiteUrl = "https://fixpoint.ae";

export const siteConfig = {
  brand: "Al Najah Al Daem",
  brandAr: "النجاح الدائم",
  domainBrand: "Fixpoint",
  /** Public display: company + Fixpoint together. */
  brandDisplayEn: "Al Najah Al Daem · Fixpoint",
  brandDisplayAr: "النجاح الدائم · Fixpoint",
  positioning: {
    en: "Cleaning & Building Maintenance Services",
    ar: "خدمات التنظيف وصيانة المباني",
  },
  phoneDisplay: "+971 54 344 7959",
  phoneE164: "+971543447959",
  whatsappE164: "971543447959",
  email: "alnajahaldaem42@gmail.com",
  country: "United Arab Emirates",
  mapsUrl: "https://share.google/6IKOdhxe7qHvLWWcJ",
  social: {
    youtube: "https://www.youtube.com/@ALNAJAHALDAEM",
    instagram: "https://www.instagram.com/alnajahaldaem42/",
    facebook: "https://www.facebook.com/people/Alnajah-Aldaem-Building-Maintenance/61593961962088/",
    tiktok: "https://www.tiktok.com/@alnajah.aldaem.bu",
  },
  licenses: [
    {
      emirate: "Sharjah",
      emirateAr: "الشارقة",
      legalName: "ALNAJAH ALDAEM BUILDING CLEANING SERVICES",
      activity: "Internal Building Cleaning Services",
      licenseNo: "925212",
    },
    {
      emirate: "Ajman",
      emirateAr: "عجمان",
      legalName: "ALNAJAH ALDAEM BUILDING MAINTENANCE",
      activity: "Building Maintenance",
      licenseNo: "132954",
    },
  ],
  disclaimers: {
    ai: {
      en: "AI-assisted information is preliminary and does not replace professional inspection when required.",
      ar: "المعلومات المدعومة بالذكاء الاصطناعي أولية ولا تغني عن المعاينة المهنية عند الحاجة.",
    },
    diy: {
      en: "DIY information is educational and should only be attempted when safe and appropriate.",
      ar: "معلومات الأعمال اليدوية تعليمية ويجب تنفيذها فقط عندما يكون ذلك آمناً ومناسباً.",
    },
    quote: {
      en: "Final quotations are subject to service requirements and human review.",
      ar: "العروض النهائية تخضع لمتطلبات الخدمة ومراجعة فريقنا.",
    },
  },
} as const;

export function getSiteUrl() {
  const fromEnv = process.env.SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") return productionSiteUrl;
  return "http://localhost:3000";
}

/** Locale-aware public brand: company · Fixpoint. */
export function brandName(locale?: string) {
  return locale === "ar" ? siteConfig.brandDisplayAr : siteConfig.brandDisplayEn;
}

/** Company-only name (licenses, legal body copy). */
export function companyName(locale?: string) {
  return locale === "ar" ? siteConfig.brandAr : siteConfig.brand;
}

export function whatsappUrl(prefill?: string) {
  const base = `https://wa.me/${siteConfig.whatsappE164}`;
  if (!prefill) return base;
  return `${base}?text=${encodeURIComponent(prefill)}`;
}

export function telUrl() {
  return `tel:${siteConfig.phoneE164}`;
}

export function mailUrl() {
  return `mailto:${siteConfig.email}`;
}
