export const locales = ["en", "ar"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "en";

export const siteConfig = {
  brand: "ALNAJAH ALDAEM",
  brandAr: "النجاح الدائم",
  positioning: {
    en: "Cleaning & Building Maintenance Services",
    ar: "خدمات التنظيف وصيانة المباني",
  },
  phoneDisplay: "+971 54 344 7959",
  phoneE164: "+971543447959",
  whatsappE164: "971543447959",
  email: "alnajahaldaem42@gmail.com",
  country: "United Arab Emirates",
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
  return process.env.SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
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
