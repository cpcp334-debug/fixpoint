import type { FaqItem } from "@/lib/seo";
import type { DiyInheritance, EffectiveOps, GateResult, ImageInheritance, WorkingCopy } from "./types";

export type LocationBreadcrumb = {
  slug: string;
  type: string;
  name: string;
};

export type AeoBlock = {
  id: string;
  question: string;
  answer: string;
  source: "service" | "diy" | "coverage" | "ops";
};

export type RelatedLink = {
  href: string;
  label: string;
};

export type ServiceLocationPageContent = WorkingCopy & {
  h1: string;
  body: string;
  directAnswer: string;
  geoIntro: string;
  imageAlt: string;
  faqs: FaqItem[];
};

export type ServiceLocationPageModel = {
  mode: "public" | "preview";
  locale: "en" | "ar";
  serviceSlug: string;
  locationSlug: string;
  path: string;
  serviceId: string;
  locationId: string;
  serviceName: string;
  locationName: string;
  serviceLongDescription: string;
  serviceShortDescription: string;
  whenProfessional: string;
  content: ServiceLocationPageContent;
  revisionNumber: number | null;
  revisionStatus: string | null;
  breadcrumbs: LocationBreadcrumb[];
  hierarchyLabels: { emirate?: string; city?: string; community?: string };
  ops: EffectiveOps;
  diy: DiyInheritance & {
    title?: string;
    quickAnswer?: string;
    whenToStop?: string;
    guideHref?: string | null;
  };
  image: ImageInheritance & { width?: number; height?: number };
  gates: GateResult;
  localeIndexable: boolean;
  aeo: AeoBlock[];
  relatedServices: RelatedLink[];
  relatedLocations: RelatedLink[];
  hreflang: { en?: string; ar?: string };
  seoTitle: string;
  metaDescription: string;
};

export function parseRevisionSnapshot(snapshotJson: string, locale: string): ServiceLocationPageContent | null {
  try {
    const raw = JSON.parse(snapshotJson) as Record<string, unknown>;
    const intro = String(raw.intro ?? "");
    const localInfo = String(raw.localInfo ?? "");
    const seoTitle = String(raw.seoTitle ?? "");
    const metaDescription = String(raw.metaDescription ?? "");
    const faqRaw = raw.faq;
    const faqStr = typeof faqRaw === "string" ? faqRaw : JSON.stringify(faqRaw ?? []);
    let faqs: FaqItem[] = [];
    try {
      const parsed = JSON.parse(faqStr) as FaqItem[];
      if (Array.isArray(parsed)) faqs = parsed.filter((f) => f && typeof f.q === "string" && typeof f.a === "string");
    } catch {
      faqs = [];
    }
    return {
      locale,
      intro,
      localInfo,
      seoTitle,
      metaDescription,
      faq: faqStr,
      h1: String(raw.h1 ?? ""),
      body: String(raw.body ?? ""),
      directAnswer: String(raw.directAnswer ?? ""),
      geoIntro: String(raw.geoIntro ?? ""),
      imageAlt: String(raw.imageAlt ?? ""),
      faqs,
      contentJson: raw.contentJson,
    };
  } catch {
    return null;
  }
}

export function workingCopyFromContent(content: ServiceLocationPageContent): WorkingCopy {
  return {
    locale: content.locale,
    intro: content.intro,
    localInfo: content.localInfo,
    seoTitle: content.seoTitle,
    metaDescription: content.metaDescription,
    faq: content.faq,
    h1: content.h1,
    body: content.body,
    directAnswer: content.directAnswer,
    geoIntro: content.geoIntro,
    imageAlt: content.imageAlt,
    contentJson: content.contentJson,
  };
}

export function buildAeoBlocks(args: {
  locale: "en" | "ar";
  serviceName: string;
  locationName: string;
  serviceShort: string;
  whenProfessional: string;
  diy: DiyInheritance & { quickAnswer?: string; whenToStop?: string };
  ops: EffectiveOps;
  coveredPublished: boolean;
}): AeoBlock[] {
  const isAr = args.locale === "ar";
  const available = args.coveredPublished
    ? isAr
      ? `نعم، يمكن طلب ${args.serviceName} في ${args.locationName} حسب التغطية المعتمدة.`
      : `Yes — ${args.serviceName} is listed as covered in ${args.locationName}. Coverage is by enquiry.`
    : isAr
      ? `التغطية في ${args.locationName} غير مؤكدة لهذه الخدمة.`
      : `Coverage in ${args.locationName} is not confirmed for this service.`;

  const diyAnswer = !args.diy.visible
    ? isAr
      ? args.diy.safetyClass === "RED" || args.diy.safetyClass === "REVIEW_REQUIRED"
        ? "لا يُنصح بالإصلاح الذاتي لهذه الخدمة. اطلب فنيًا."
        : "دليل DIY غير متاح لهذه الخدمة حاليًا."
      : args.diy.safetyClass === "RED" || args.diy.safetyClass === "REVIEW_REQUIRED"
        ? "Do-it-yourself repair is not recommended for this service. Request a professional."
        : "A DIY guide is not available for this service right now."
    : args.diy.quickAnswer ||
      (isAr ? "اتبع دليل DIY المعتمد بحذر وتوقف عند أي خطر." : "Follow the approved DIY guide carefully and stop if unsafe.");

  const whenPro =
    args.whenProfessional.trim() ||
    args.diy.whenToStop ||
    (isAr ? "اطلب فنيًا عند الشك أو عند وجود خطر." : "Call a professional when unsure or when there is a safety risk.");

  const book = args.ops.bookingEnabled
    ? isAr
      ? "نعم، يمكن إرسال طلب حجز لهذه الخدمة."
      : "Yes — you can submit a booking request for this service."
    : isAr
      ? "الحجز غير مفعّل لهذه الخدمة حاليًا. اطلب عرض سعر."
      : "Booking is not enabled for this service right now. Request a quote.";

  const emergency = args.ops.emergencyAvailable
    ? isAr
      ? "خدمة الطوارئ متاحة حسب الإشارات التشغيلية لهذه الخدمة."
      : "Emergency service is available according to this service’s operational flags."
    : isAr
      ? "خدمة الطوارئ غير مؤكدة لهذه الخدمة."
      : "Emergency service is not confirmed for this service.";

  const amc = args.ops.amcAvailable
    ? isAr
      ? "عقود الصيانة الدورية (AMC) متاحة حسب إعدادات الخدمة."
      : "AMC (maintenance contracts) are available according to this service’s settings."
    : isAr
      ? "AMC غير متاح لهذه الخدمة حاليًا."
      : "AMC is not available for this service right now.";

  return [
    {
      id: "what",
      question: isAr ? `ما هي خدمة ${args.serviceName}؟` : `What is ${args.serviceName}?`,
      answer: args.serviceShort.trim() || (isAr ? "وصف الخدمة غير مكتمل." : "Service description is incomplete."),
      source: "service",
    },
    {
      id: "diy",
      question: isAr ? "هل يمكنني الإصلاح بنفسي؟" : "Can I fix it myself?",
      answer: diyAnswer,
      source: "diy",
    },
    {
      id: "pro",
      question: isAr ? "متى يجب استدعاء فني؟" : "When should I call a professional?",
      answer: whenPro,
      source: "service",
    },
    {
      id: "available",
      question: isAr
        ? `هل الخدمة متاحة في ${args.locationName}؟`
        : `Is ${args.serviceName} available in ${args.locationName}?`,
      answer: available,
      source: "coverage",
    },
    {
      id: "book",
      question: isAr ? "هل يمكن الحجز؟" : "Can I book it?",
      answer: book,
      source: "ops",
    },
    {
      id: "emergency",
      question: isAr ? "هل تتوفر خدمة طوارئ؟" : "Is emergency service available?",
      answer: emergency,
      source: "ops",
    },
    {
      id: "amc",
      question: isAr ? "هل يتوفر AMC؟" : "Is AMC available?",
      answer: amc,
      source: "ops",
    },
  ];
}
