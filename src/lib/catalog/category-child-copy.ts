type CardCopy = { name: string; description: string };

const generalMaintenanceNames: Record<string, { before: string; after: string; description?: { before: string; after: string } }> = {
  "preventive-building-maintenance": { before: "صيانة الوقائية المبنى", after: "الصيانة الوقائية للمباني", description: { before: "صيانة الوقائية المبنى يشمل العناية والفحص للعطل الظاهر.", after: "تُراجع متطلبات الصيانة الوقائية للمباني قبل تأكيد النطاق وعرض السعر." } },
  "minor-building-repairs": { before: "البسيطة المبنى", after: "إصلاحات بسيطة للمباني", description: { before: "البسيطة المبنى يقيّم الحالة ويوصي بالخطوة التالية.", after: "تُراجع متطلبات الإصلاحات البسيطة للمباني قبل تأكيد النطاق وعرض السعر." } },
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
  "drain-blockage-removal": { before: "إزالة الصرف", after: "إزالة انسداد الصرف" },
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
  "office-painting": { before: "المكتب الدهان", after: "دهان المكاتب" },
  "commercial-painting": { before: "التجاري الدهان", after: "الدهان التجاري" },
  "metal-painting": { before: "الدهان", after: "دهان المعادن" },
  "wood-painting": { before: "الدهان", after: "دهان الأخشاب" },
  "repainting": { before: "خدمة ضمن الدهان", after: "إعادة الدهان" },
  "touch-up-painting": { before: "الدهان", after: "رتوش الدهان" },
  "texture-painting": { before: "الدهان", after: "دهان ذو ملمس" },
  "decorative-painting": { before: "الدهان", after: "دهان زخرفي" },
};

const ovenNames: Record<string, { before: string; after: string; description?: { before: string; after: string } }> = {
  "oven-uneven-heating": { before: "الفرن", after: "عدم تساوي حرارة الفرن", description: { before: "الفرن يقيّم الحالة ويوصي بالخطوة التالية.", after: "اذكر مواضع تفاوت الحرارة داخل الفرن وما تلاحظه أثناء الاستخدام، ليُراجع الفريق الحالة قبل تأكيد النطاق وعرض السعر." } },
  "oven-temperature-problem": { before: "الفرن", after: "مشكلة درجة حرارة الفرن", description: { before: "الفرن يقيّم الحالة ويوصي بالخطوة التالية.", after: "اذكر ما تلاحظه من ارتفاع أو انخفاض أو عدم ثبات درجة حرارة الفرن، ليُراجع الفريق الحالة قبل تأكيد النطاق وعرض السعر." } },
};

const burnerCookerNames: Record<string, { before: string; after: string; description?: { before: string; after: string } }> = {
  "cooker-igniter-repair": { before: "إصلاح الموقد", after: "إصلاح قداحة الموقد", description: { before: "إصلاح الموقد يصلح العطل بعد تحديده.", after: "اذكر المشكلة التي تلاحظها في قداحة الموقد ونوع الجهاز، ليُراجع الفريق النطاق والتوفر قبل عرض السعر." } },
  "electric-cooker-repair": { before: "إصلاح الموقد", after: "إصلاح الموقد الكهربائي", description: { before: "إصلاح الموقد يصلح العطل بعد تحديده.", after: "اذكر العطل الذي تلاحظه في الموقد الكهربائي ونوع الجهاز، ليُراجع الفريق الحالة قبل تأكيد النطاق وعرض السعر." } },
};

const dishwasherNames: Record<string, { before: string; after: string; description?: { before: string; after: string } }> = {
  "dishwasher-not-cleaning-properly": { before: "تنظيف غسالة الصحون", after: "ضعف تنظيف غسالة الصحون", description: { before: "تنظيف غسالة الصحون ينظّف ما تذكره في الطلب.", after: "اذكر ما تلاحظه من ضعف تنظيف الصحون ليُراجع الفريق المشكلة قبل تأكيد النطاق وعرض السعر." } },
  "dishwasher-spray-arm-cleaning": { before: "تنظيف غسالة الصحون", after: "تنظيف أذرع الرش في غسالة الصحون", description: { before: "تنظيف غسالة الصحون ينظّف ما تذكره في الطلب.", after: "اذكر متطلبات تنظيف أذرع الرش في غسالة الصحون ليُراجع الفريق النطاق والتوفر قبل عرض السعر." } },
};

const washingMachineNames: Record<string, { before: string; after: string; description?: { before: string; after: string } }> = {
  "washing-machine-not-starting": { before: "الغسيل الآلة", after: "مشكلة عدم تشغيل الغسالة", description: { before: "الغسيل الآلة يقيّم الحالة ويوصي بالخطوة التالية.", after: "اذكر ما يحدث عند محاولة تشغيل الغسالة ليُراجع الفريق الحالة قبل تأكيد النطاق وعرض السعر." } },
  "washing-machine-not-spinning": { before: "الغسيل الآلة", after: "مشكلة عدم عصر الغسالة", description: { before: "الغسيل الآلة يقيّم الحالة ويوصي بالخطوة التالية.", after: "اذكر ما يحدث أثناء مرحلة العصر في الغسالة ليُراجع الفريق الحالة قبل تأكيد النطاق وعرض السعر." } },
};

const refrigeratorNames: Record<string, { before: string; after: string; description?: { before: string; after: string } }> = {
  "refrigerator-freezing-problem": { before: "الثلاجة", after: "مشكلة تجميد الثلاجة", description: { before: "الثلاجة يقيّم الحالة ويوصي بالخطوة التالية.", after: "اذكر مشكلة التجميد التي تلاحظها في الثلاجة ليُراجع الفريق الحالة قبل تأكيد النطاق وعرض السعر." } },
  "refrigerator-ice-formation-problem": { before: "الثلاجة", after: "مشكلة تكوّن الثلج في الثلاجة", description: { before: "الثلاجة يقيّم الحالة ويوصي بالخطوة التالية.", after: "اذكر موضع تكوّن الثلج في الثلاجة وما تلاحظه ليُراجع الفريق الحالة قبل تأكيد النطاق وعرض السعر." } },
};

const waterTankNames: Record<string, { before: string; after: string; description?: { before: string; after: string } }> = {
  "water-tank-cover-repair": { before: "إصلاح المياه الخزان", after: "إصلاح غطاء خزان المياه", description: { before: "إصلاح المياه الخزان يصلح العطل بعد تحديده.", after: "تُراجع مشكلة غطاء خزان المياه قبل تأكيد النطاق وعرض السعر." } },
  "water-tank-valve-repair": { before: "إصلاح المياه الخزان", after: "إصلاح صمام خزان المياه", description: { before: "إصلاح المياه الخزان يصلح العطل بعد تحديده.", after: "تُراجع مشكلة صمام خزان المياه قبل تأكيد النطاق وعرض السعر." } },
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

const saunaHeaterCopy: Record<string, { before: CardCopy; after: CardCopy }> = {
  "sauna-heater-inspection": {
    before: { name: "فحص الساونا السخان", description: "فحص الساونا السخان يفحص الحالة ويسجّل الخطوة المهنية التالية." },
    after: { name: "فحص سخان الساونا", description: "اذكر طراز سخان الساونا إن كان معروفاً، وما لاحظته ووقت ظهوره، ليُراجع الفريق نطاق الفحص قبل إعداد عرض السعر." },
  },
  "sauna-heater-maintenance": {
    before: { name: "صيانة الساونا السخان", description: "صيانة الساونا السخان يشمل العناية والفحص للعطل الظاهر." },
    after: { name: "صيانة سخان الساونا", description: "اذكر طراز سخان الساونا وسجل الصيانة المتاح والوقت المناسب للدخول، ليُراجع الفريق نطاق الصيانة والتوفر قبل إعداد عرض السعر." },
  },
};

const gymDescriptions: Record<string, { name: string; before: string; after: string }> = {
  "en:gym-deep-cleaning": { name: "Gym Deep Cleaning", before: "Gym Deep Cleaning cleans Gym Deep for the property you name on the request.", after: "Planning a gym deep clean? Share the areas, current condition and access window so the team can review the cleaning scope and quotation." },
  "en:gym-regular-cleaning": { name: "Gym Regular Cleaning", before: "Gym Regular Cleaning cleans Gym Regular for the property you name on the request.", after: "Planning regular gym cleaning? Share the areas, preferred frequency and operating hours so the team can review the schedule, scope and quotation." },
  "ar:gym-deep-cleaning": { name: "تنظيف الصالة الرياضية العميق", before: "تنظيف الصالة الرياضية العميق ينظّف ما تذكره في الطلب.", after: "هل تخطط لتنظيف عميق لصالة رياضية؟ اذكر المساحات وحالتها الحالية ووقت الدخول المتاح ليُراجع الفريق نطاق التنظيف وعرض السعر." },
  "ar:gym-regular-cleaning": { name: "تنظيف الصالة الرياضية الدوري", before: "تنظيف الصالة الرياضية الدوري ينظّف ما تذكره في الطلب.", after: "هل تخطط لتنظيف دوري لصالة رياضية؟ اذكر المساحات والتكرار المطلوب وساعات التشغيل ليُراجع الفريق الجدول والنطاق وعرض السعر." },
};

const poolSurfaceAndWaterCopy: Record<string, CardCopy> = {
  "pool-skimming": {
    name: "إزالة الشوائب من سطح المسبح",
    description: "اذكر نوع الشوائب الظاهرة على سطح الماء وحجم المسبح التقريبي وترتيبات الدخول، ليُراجع الفريق نطاق العمل قبل إعداد عرض السعر.",
  },
  "pool-chemical-balancing": {
    name: "موازنة كيمياء مياه المسبح",
    description: "شارك نتائج فحص المياه الأخيرة إن توفرت، وما لاحظته وأي معالجة سابقة، ليُراجع الفريق نطاق الخدمة قبل إعداد عرض السعر.",
  },
};

/** Correct known ambiguous category previews without replacing reviewed content or URLs. */
export function categoryChildCopy(category: string, locale: string, masterSlug: string, copy: CardCopy): CardCopy {
  if (category === "swimming-pool" && masterSlug === "pool-vacuum-cleaning") {
    if (locale === "ar" && copy.name === "تنظيف المسبح") {
      return {
        name: "تنظيف المسبح بالمكنسة",
        description: copy.description === "تنظيف المسبح ينظّف ما تذكره في الطلب."
          ? "اذكر الرواسب أو المناطق المطلوب تنظيفها بالمكنسة وترتيبات الوصول إلى المسبح، ليُراجع الفريق نطاق العمل قبل إعداد عرض السعر."
          : copy.description,
      };
    }
    if (locale === "en" && copy.name === "Pool Vacuum Cleaning"
        && copy.description === "Pool Vacuum Cleaning cleans Pool Vacuum for the property you name on the request.") {
      return { ...copy, description: "Describe the debris or areas you want vacuumed and the available pool access so the team can review the scope before quoting." };
    }
  }
  const gymDescription = category === "gym" ? gymDescriptions[`${locale}:${masterSlug}`] : undefined;
  if (gymDescription && copy.name === gymDescription.name && copy.description === gymDescription.before) {
    return { ...copy, description: gymDescription.after };
  }
  if (category === "dishwasher" && locale === "en" && masterSlug === "dishwasher-not-cleaning-properly"
      && copy.name === "Dishwasher Not Cleaning Properly"
      && copy.description === "Dishwasher Not Cleaning Properly cleans Dishwasher Not Properly for the property you name on the request.") {
    return { ...copy, description: "Describe the poor wash results so the team can review the problem before confirming the scope and quotation." };
  }
  if (locale !== "ar") return copy;
  const poolCopy = category === "swimming-pool" ? poolSurfaceAndWaterCopy[masterSlug] : undefined;
  if (poolCopy?.name && copy.name === "المسبح") {
    return {
      name: poolCopy.name,
      description: copy.description === "المسبح يقيّم الحالة ويوصي بالخطوة التالية." ? poolCopy.description : copy.description,
    };
  }
  const saunaHeater = category === "sauna" ? saunaHeaterCopy[masterSlug] : undefined;
  if (saunaHeater?.before && copy.name === saunaHeater.before.name) {
    return {
      name: saunaHeater.after.name,
      description: copy.description === saunaHeater.before.description ? saunaHeater.after.description : copy.description,
    };
  }
  const replacement = category === "cleaning" ? cleaningNames[masterSlug]
    : category === "general-maintenance" ? generalMaintenanceNames[masterSlug]
    : category === "plumbing" ? plumbingNames[masterSlug]
    : category === "ac" ? acNames[masterSlug]
    : category === "painting" ? paintingNames[masterSlug]
    : category === "oven" ? ovenNames[masterSlug]
    : category === "burner-cooker" ? burnerCookerNames[masterSlug]
    : category === "dishwasher" ? dishwasherNames[masterSlug]
    : category === "washing-machine" ? washingMachineNames[masterSlug]
    : category === "refrigerator" ? refrigeratorNames[masterSlug]
    : category === "water-tank" ? waterTankNames[masterSlug]
    : category === "water-heater" ? waterHeaterNames[masterSlug]
    : category === "microwave" ? microwaveNames[masterSlug] : undefined;
  if (!replacement || copy.name !== replacement.before) return copy;
  const description = category === "general-maintenance" ? generalMaintenanceNames[masterSlug]?.description
    : category === "oven" ? ovenNames[masterSlug]?.description
    : category === "burner-cooker" ? burnerCookerNames[masterSlug]?.description
    : category === "dishwasher" ? dishwasherNames[masterSlug]?.description
    : category === "washing-machine" ? washingMachineNames[masterSlug]?.description
    : category === "refrigerator" ? refrigeratorNames[masterSlug]?.description
    : category === "water-tank" ? waterTankNames[masterSlug]?.description : undefined;
  return {
    name: replacement.after,
    description: description && copy.description === description.before ? description.after : category === "oven" ? copy.description : copy.description.startsWith(`${replacement.before} `)
      ? replacement.after + copy.description.slice(replacement.before.length)
      : copy.description,
  };
}
