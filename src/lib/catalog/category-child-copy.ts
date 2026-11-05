type CardCopy = { name: string; description: string };

const generalMaintenanceNames: Record<string, { before: string; after: string }> = {
  "door-repair-and-adjustment": { before: "إصلاح الباب", after: "إصلاح الأبواب وضبطها" },
  "door-hardware-replacement": { before: "استبدال الباب", after: "استبدال ملحقات الأبواب" },
};

const cleaningNames: Record<string, { before: string; after: string }> = {
  "residential-cleaning": { before: "تنظيف السكني", after: "تنظيف العقارات السكنية" },
  "commercial-cleaning": { before: "تنظيف التجاري", after: "التنظيف التجاري" },
  "building-common-area-cleaning": { before: "تنظيف المبنى المشتركة", after: "تنظيف المناطق المشتركة في المباني" },
  "one-time-cleaning": { before: "خدمة ضمن التنظيف", after: "تنظيف لمرة واحدة" },
  "recurring-cleaning": { before: "خدمة ضمن التنظيف", after: "تنظيف متكرر" },
  "move-in-cleaning": { before: "تنظيف الانتقال", after: "تنظيف قبل الانتقال" },
  "move-out-cleaning": { before: "تنظيف الانتقال", after: "تنظيف عند المغادرة" },
};

const plumbingNames: Record<string, { before: string; after: string }> = {
  "water-leakage-detection": { before: "كشف المياه التسرب", after: "كشف تسرب المياه" },
  "water-leakage-repair": { before: "إصلاح المياه التسرب", after: "إصلاح تسرب المياه" },
  "water-pressure-problem-diagnosis": { before: "تشخيص المياه", after: "تشخيص مشاكل ضغط المياه" },
  "running-toilet-repair": { before: "إصلاح المرحاض", after: "إصلاح تدفق مياه المرحاض المستمر" },
};

const acNames: Record<string, { before: string; after: string }> = {
  "ac-noise-problem-diagnosis": { before: "تشخيص التكييف", after: "تشخيص ضوضاء التكييف" },
  "ac-gas-check": { before: "التكييف الغاز", after: "فحص غاز التكييف" },
  "ac-gas-recharge": { before: "التكييف الغاز", after: "إعادة شحن غاز التكييف" },
  "central-ac-maintenance": { before: "صيانة التكييف", after: "صيانة التكييف المركزي" },
  "ducted-ac-maintenance": { before: "صيانة التكييف", after: "صيانة التكييف عبر مجاري الهواء" },
  "package-ac-maintenance": { before: "صيانة التكييف", after: "صيانة وحدات التكييف المجمعة" },
};

const paintingNames: Record<string, { before: string; after: string }> = {
  "metal-painting": { before: "الدهان", after: "دهان المعادن" },
  "wood-painting": { before: "الدهان", after: "دهان الأخشاب" },
  "repainting": { before: "خدمة ضمن الدهان", after: "إعادة الدهان" },
  "touch-up-painting": { before: "الدهان", after: "رتوش الدهان" },
  "texture-painting": { before: "الدهان", after: "دهان ذو ملمس" },
  "decorative-painting": { before: "الدهان", after: "دهان زخرفي" },
};

const waterHeaterNames: Record<string, { before: string; after: string }> = {
  "water-heater-heating-element-replacement": { before: "استبدال المياه السخان", after: "استبدال عنصر تسخين سخان المياه" },
  "water-heater-valve-replacement": { before: "استبدال المياه السخان", after: "استبدال صمام سخان المياه" },
};

const microwaveNames: Record<string, { before: string; after: string }> = {
  "microwave-fan-problem": { before: "المايكروويف المروحة", after: "مشكلة مروحة المايكروويف" },
  "microwave-internal-cleaning": { before: "تنظيف المايكروويف", after: "تنظيف المايكروويف من الداخل" },
  "microwave-door-problem": { before: "المايكروويف الباب", after: "مشكلة باب المايكروويف" },
  "microwave-no-power-diagnosis": { before: "تشخيص المايكروويف الكهرباء", after: "تشخيص عدم تشغيل المايكروويف" },
  "microwave-display-problem": { before: "المايكروويف", after: "مشكلة شاشة المايكروويف" },
  "microwave-electrical-diagnosis": { before: "تشخيص المايكروويف الكهرباء", after: "تشخيص أعطال المايكروويف الكهربائية" },
  "microwave-heating-problem": { before: "المايكروويف", after: "مشكلة تسخين المايكروويف" },
  "microwave-spark-problem": { before: "المايكروويف", after: "ظهور شرر في المايكروويف" },
  "microwave-turntable-problem": { before: "المايكروويف", after: "مشكلة دوران طبق المايكروويف" },
};

/** Correct known ambiguous category previews without replacing reviewed content or URLs. */
export function categoryChildCopy(category: string, locale: string, masterSlug: string, copy: CardCopy): CardCopy {
  if (locale !== "ar") return copy;
  const replacement = category === "cleaning" ? cleaningNames[masterSlug]
    : category === "general-maintenance" ? generalMaintenanceNames[masterSlug]
    : category === "plumbing" ? plumbingNames[masterSlug]
    : category === "ac" ? acNames[masterSlug]
    : category === "painting" ? paintingNames[masterSlug]
    : category === "water-heater" ? waterHeaterNames[masterSlug]
    : category === "microwave" ? microwaveNames[masterSlug] : undefined;
  if (!replacement || copy.name !== replacement.before) return copy;
  return {
    name: replacement.after,
    description: copy.description.startsWith(`${replacement.before} `)
      ? replacement.after + copy.description.slice(replacement.before.length)
      : copy.description,
  };
}
