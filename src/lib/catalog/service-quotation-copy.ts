type QuoteCopy = { title: string; body: string; quote: string };

// Preserve the established, published specialist enquiry wording.
const specialised: Record<string, { en: QuoteCopy; ar: QuoteCopy }> = {
  "cleaning": {
    "en": {
      "title": "Plan your cleaning quotation.",
      "body": "Share the property location and type, approximate area, rooms to include, visit frequency and access arrangements. Ask the team to confirm the task list, exclusions and who provides cleaning products and equipment in the written quotation. Scope and availability are confirmed after review.",
      "quote": "Request a cleaning quote"
    },
    "ar": {
      "title": "حدّد متطلبات عرض سعر التنظيف.",
      "body": "شارك موقع العقار ونوعه والمساحة التقريبية والغرف المشمولة وتكرار الزيارات وترتيبات الدخول. اطلب من الفريق توضيح قائمة المهام والاستثناءات ومن يوفّر مواد التنظيف والمعدات في عرض السعر المكتوب. يُؤكَّد النطاق والتوفر بعد المراجعة.",
      "quote": "اطلب عرض سعر للتنظيف"
    }
  },
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

/** Enquiry wording for related content; unresolved services use the general Contact prompt. */
export function relatedServiceQuotationCopy(
  service: { category: { slug: string }; t: { name: string } } | null,
  locale: string,
): QuoteCopy | null {
  if (service) return serviceQuotationCopy(service.category.slug, locale, service.t.name);
  return locale === "ar"
    ? {
        title: "أخبرنا عن الأعمال التي تحتاجها.",
        body: "شارك موقع العقار والخدمة المطلوبة. يراجع الفريق طلبك ويؤكد الخطوة التالية.",
        quote: "اطلب عرض سعر",
      }
    : {
        title: "Tell us about the work you need.",
        body: "Share the property location and service required. The team reviews your request and confirms the next step.",
        quote: "Request a quote",
      };
}
