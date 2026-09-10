/**
 * Deterministic Arabic canonical service content.
 * Never copies English into Arabic fields.
 * Hazardous / uncertain technical terminology → REVIEW_REQUIRED markers on specific fields.
 */
import { createHash } from "node:crypto";
import { getDiyMatrixClass } from "@/lib/service-location/diy-matrix";
import type { CanonicalServiceInput } from "./author-service-canonical";

export type CanonicalServiceArContent = {
  name: string;
  shortDescription: string;
  longDescription: string;
  whoItIsFor: string;
  whatWeDo: string;
  whenProfessional: string;
  process: string;
  pricingInfo: string;
  professionalFallback: string;
  safetyNotes: string;
  seoTitle: string;
  metaDescription: string;
  keywords: string;
  faq: string;
  contentHash: string;
  arabicReviewStatus: "ready" | "review_required";
  reviewReasons: string[];
};

const HAZARDOUS_CATEGORIES = new Set([
  "electrical",
  "refrigerator",
  "microwave",
  "washing-machine",
  "water-heater",
  "dishwasher",
  "oven",
  "burner-cooker",
]);

/** Simple category Arabic labels from catalog where available; fallbacks are MSA. */
const CATEGORY_AR: Record<string, string> = {
  cleaning: "خدمات التنظيف",
  "general-maintenance": "الصيانة العامة للمباني",
  plumbing: "صيانة السباكة",
  electrical: "صيانة الكهرباء",
  ac: "صيانة التكييف",
  painting: "خدمات الدهان",
  walls: "صيانة وإصلاح الجدران",
  "swimming-pool": "تنظيف وصيانة المسابح",
  sauna: "تنظيف وصيانة غرف الساونا",
  "water-tank": "تنظيف وصيانة خزانات المياه",
  refrigerator: "صيانة وإصلاح الثلاجات",
  microwave: "صيانة وإصلاح المايكروويف",
  "washing-machine": "صيانة وإصلاح الغسالات",
  "water-heater": "صيانة وإصلاح سخانات المياه",
  dishwasher: "صيانة وإصلاح غسالات الصحون",
  gym: "تنظيف وصيانة الصالات الرياضية",
  oven: "صيانة وإصلاح الأفران",
  "burner-cooker": "صيانة وإصلاح المواقد",
};

const WORD_AR: Record<string, string> = {
  apartment: "شقق",
  villa: "فلل",
  house: "منازل",
  office: "مكاتب",
  building: "مباني",
  residential: "سكني",
  commercial: "تجاري",
  deep: "عميق",
  regular: "دوري",
  recurring: "متكرر",
  cleaning: "تنظيف",
  maintenance: "صيانة",
  repair: "إصلاح",
  service: "خدمة",
  filter: "فلتر",
  faucet: "حنفيات",
  drain: "صرف",
  socket: "مقابس",
  switch: "مفاتيح",
  lighting: "إضاءة",
  ac: "تكييف",
  air: "هواء",
  conditioning: "تكييف",
  painting: "دهان",
  interior: "داخلي",
  exterior: "خارجي",
  wall: "جدران",
  crack: "شقوق",
  plaster: "لياسة",
  pool: "مسبح",
  swimming: "سباحة",
  sauna: "ساونا",
  water: "مياه",
  tank: "خزان",
  refrigerator: "ثلاجة",
  microwave: "مايكروويف",
  washing: "غسيل",
  machine: "آلة",
  heater: "سخان",
  dishwasher: "غسالة صحون",
  oven: "فرن",
  burner: "موقد",
  cooker: "طباخ",
  gas: "غاز",
  gym: "صالة رياضية",
  treadmill: "جهاز مشي",
  handyman: "أعمال يدوية عامة",
  preventive: "وقائية",
  corrective: "تصحيحية",
  emergency: "طوارئ",
  kitchen: "مطبخ",
  bathroom: "حمام",
  door: "أبواب",
  window: "نوافذ",
  flooring: "أرضيات",
  tiling: "بلاط",
  roof: "أسطح",
  waterproofing: "عزل مائي",
  move: "انتقال",
  in: "دخول",
  out: "خروج",
  post: "بعد",
  construction: "إنشاءات",
  renovation: "تجديد",
  common: "مشتركة",
  area: "مناطق",
  one: "مرة",
  time: "واحدة",
  pump: "مضخة",
  cooling: "تبريد",
  problem: "مشكلة",
  leak: "تسرب",
  unclogging: "تسليك",
  touch: "ترميم",
  up: "موضعي",
};

/**
 * Build Arabic display name from slug tokens + category.
 * Pure Arabic output; mark review when mapping is incomplete.
 */
function arabicServiceName(slug: string, categorySlug: string): { name: string; incomplete: boolean } {
  const cat = CATEGORY_AR[categorySlug] || "خدمات الصيانة";
  const parts = slug.split("-").filter(Boolean);
  const mapped = parts.map((p) => WORD_AR[p]);
  const incomplete = mapped.some((m) => !m);
  if (!incomplete) {
    return { name: mapped.join(" "), incomplete: false };
  }
  const known = mapped.filter(Boolean);
  if (known.length >= 2) {
    return { name: `${known.join(" ")} — ${cat}`, incomplete: true };
  }
  return { name: `خدمة ضمن ${cat}`, incomplete: true };
}

export function buildCanonicalServiceAr(
  input: CanonicalServiceInput,
  nameArOverride?: string,
): CanonicalServiceArContent {
  const safety = getDiyMatrixClass(input.slug) || "REVIEW_REQUIRED";
  const categoryAr = CATEGORY_AR[input.categorySlug] || "خدمات الصيانة";
  const nameBuilt = arabicServiceName(input.slug, input.categorySlug);
  const name =
    nameArOverride && /[\u0600-\u06FF]/.test(nameArOverride) && nameArOverride !== "REVIEW_REQUIRED"
      ? nameArOverride
      : nameBuilt.name;

  const reviewReasons: string[] = [];
  const hazardous = HAZARDOUS_CATEGORIES.has(input.categorySlug) || safety === "RED" || safety === "REVIEW_REQUIRED";
  if (hazardous) {
    reviewReasons.push("hazardous_or_technical_terminology");
  }
  if (!nameArOverride || nameArOverride === "REVIEW_REQUIRED" || nameBuilt.incomplete) {
    reviewReasons.push("service_name_needs_human_arabic_review");
  }

  const shortDescription = `${name} ضمن ${categoryAr}. نساعد في تقييم المشكلة واقتراح المسار المهني المناسب دون اختلاق أسعار أو تغطية غير مؤكدة.`;
  const longDescription = [
    `${name} جزء من كتالوج النجاح الدائم تحت فئة ${categoryAr}.`,
    `تهدف الخدمة إلى توضيح المشكلة، وتحديد ما إذا كانت المعاينة مطلوبة، وتقديم توصية مهنية واضحة.`,
    safety === "RED" || safety === "REVIEW_REQUIRED"
      ? `نظرًا لتصنيف السلامة، لا نقدّم إجراءات إصلاح ذاتي خطرة؛ يُفضَّل التعامل المهني.`
      : safety === "YELLOW"
        ? `يُسمح فقط بفحوصات محدودة وآمنة عند توفر دليل معتمد.`
        : `قد يتوفر دليل DIY معتمد للفحوصات منخفضة المخاطر فقط.`,
  ].join(" ");

  const whoItIsFor = `مناسب لأصحاب المنازل والمستأجرين (بإذن) ومسؤولي المرافق الذين يواجهون احتياجات متعلقة بـ ${name}.`;
  const whatWeDo = `نستمع إلى وصف المشكلة، ونطلب صورًا عند الأمان، ونؤكد الحاجة للمعاينة، ثم يُعدّ عرض السعر بواسطة شخص مختص.`;
  const whenProfessional = `اطلب فنيًا عند استمرار الأعراض، أو عند وجود خطر، أو عند الحاجة لأدوات متخصصة، أو عند الشك في السبب.`;
  const process = `1) أخبرنا بالمشكلة والموقع. 2) أرسل صورًا إن كان ذلك آمنًا. 3) نؤكد إن كانت المعاينة لازمة. 4) يُعدّ عرض السعر. 5) يُنفَّذ العمل وفق النطاق المتفق عليه.`;
  const pricingInfo = input.inspectionRequired
    ? `يعتمد السعر على نتائج المعاينة ونطاق العمل. لا ننشر أسعارًا ثابتة مخترعة.`
    : `يعتمد السعر على النطاق وظروف الموقع. اطلب عرض سعر.`;
  const professionalFallback = `هل تحتاج مساعدة بخصوص ${name}؟ يمكن لفريق النجاح الدائم فحص المشكلة واقتراح الصيانة أو الإصلاح المناسب.`;
  const safetyNotes = hazardous
    ? `REVIEW_REQUIRED`
    : `التزم بشروط التوقف في أي دليل معتمد. لا تتعامل مع الكهرباء الحية أو الغاز أو أنظمة التبريد المغلقة بنفسك.`;

  const seoTitle = `${name} | النجاح الدائم`;
  const metaDescription = `${name} ضمن ${categoryAr}. اطلب تقييمًا وعرض سعر من النجاح الدائم دون ادعاءات غير مؤكدة.`;
  const keywords = [name, categoryAr, "صيانة الإمارات", "النجاح الدائم"].join("، ");

  const faq = JSON.stringify([
    {
      question: `ما هي ${name}؟`,
      answer: `${name} خدمة ضمن ${categoryAr} لتقييم المشكلات ذات الصلة واقتراح الحل المهني المناسب.`,
    },
    {
      question: `هل يمكنني تنفيذ الإصلاح بنفسي؟`,
      answer:
        safety === "GREEN"
          ? `قد تتوفر فحوصات محدودة عند وجود دليل معتمد. توقّف واطلب فنيًا عند أي خطر.`
          : `لا يُنصح بالإصلاح الذاتي لهذه الفئة. اطلب تقييمًا مهنيًا.`,
    },
    {
      question: `متى أتواصل مع النجاح الدائم؟`,
      answer: `عند استمرار الأعراض أو الحاجة لأدوات متخصصة أو الشك في السبب.`,
    },
    {
      question: `هل الحجز متاح؟`,
      answer: input.bookingEnabled
        ? `يمكن إرسال طلب حجز، ويتم التأكيد من الفريق.`
        : `الحجز غير مفعّل حاليًا لهذه الخدمة. يمكن طلب عرض سعر.`,
    },
    {
      question: `هل تتوفر خدمة الطوارئ؟`,
      answer: input.emergencyAvailable
        ? `الطوارئ مفعّلة وفق إعدادات الخدمة الحالية.`
        : `الطوارئ غير مؤكدة لهذه الخدمة في الإعدادات الحالية.`,
    },
    {
      question: `هل يتوفر عقد صيانة (AMC)؟`,
      answer: input.amcAvailable
        ? `قد يتوفر AMC وفق الإعدادات الحالية. اسأل أثناء عرض السعر.`
        : `AMC غير مفعّل لهذه الخدمة في الإعدادات الحالية.`,
    },
  ]);

  const arabicReviewStatus = reviewReasons.length ? "review_required" : "ready";
  const contentHash = createHash("sha256")
    .update(JSON.stringify({ v: 1, slug: input.slug, name, longDescription, faq, arabicReviewStatus }))
    .digest("hex");

  return {
    name,
    shortDescription,
    longDescription,
    whoItIsFor,
    whatWeDo,
    whenProfessional,
    process,
    pricingInfo,
    professionalFallback,
    safetyNotes,
    seoTitle,
    metaDescription,
    keywords,
    faq,
    contentHash,
    arabicReviewStatus,
    reviewReasons: [...new Set(reviewReasons)],
  };
}
