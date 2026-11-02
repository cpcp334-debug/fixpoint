type QuoteCopy = { title: string; body: string; quote: string };

// Preserve the established, published specialist enquiry wording.
const specialised: Record<string, { en: QuoteCopy; ar: QuoteCopy }> = {
  "plumbing": {
    "en": {
      "title": "Tell us about your plumbing job.",
      "body": "Share the property location, the plumbing issue and any access arrangements. The team reviews the request before confirming scope, availability and quotation.",
      "quote": "Request a plumbing quote"
    },
    "ar": {
      "title": "أخبرنا عن أعمال السباكة المطلوبة.",
      "body": "شارك موقع العقار ومشكلة السباكة وترتيبات الدخول. يراجع الفريق الطلب قبل تأكيد النطاق والتوفر وعرض السعر.",
      "quote": "اطلب عرض سعر للسباكة"
    }
  },
  "ac": {
    "en": {
      "title": "Tell us about your AC job.",
      "body": "Share the property location, the AC issue, available unit details and any access arrangements. The team reviews the request before confirming scope, availability and quotation.",
      "quote": "Request an AC quote"
    },
    "ar": {
      "title": "أخبرنا عن أعمال التكييف المطلوبة.",
      "body": "شارك موقع العقار ومشكلة التكييف وتفاصيل الجهاز إن توفرت وترتيبات الدخول. يراجع الفريق الطلب قبل تأكيد النطاق والتوفر وعرض السعر.",
      "quote": "اطلب عرض سعر للتكييف"
    }
  }
};

/** Copy for existing service/category enquiries; no availability or capability assertion. */
export function serviceQuotationCopy(categorySlug: string, locale: string, name: string): QuoteCopy | null {
  // Electrical pages continue to use their existing translated Home strings.
  if (categorySlug === "electrical") return null;
  const language = locale === "ar" ? "ar" : "en";
  const established = specialised[categorySlug]?.[language];
  if (established) return established;
  return language === "ar"
    ? {
        title: "أخبرنا عن متطلباتك.",
        body: `بخصوص ${name}، شارك موقع العقار والأعمال المطلوبة وترتيبات الدخول. يراجع الفريق الطلب قبل تأكيد النطاق والتوفر وعرض السعر.`,
        quote: "اطلب عرض سعر",
      }
    : {
        title: "Tell us about your requirements.",
        body: `For ${name}, share the property location, work required and access arrangements. The team reviews the request before confirming scope, availability and quotation.`,
        quote: "Request a quote",
      };
}
