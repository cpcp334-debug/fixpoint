/**
 * Visitor copy for catalog services.
 * Specific to the service name. No prices, coverage claims, or DIY steps for hazardous work.
 */
import { ELECTRICAL_SERVICE_COPY } from "../../../prisma/data/electrical-service-copy";

export type VisitorServiceCopy = {
  nameEn: string;
  nameAr: string;
  shortEn: string;
  shortAr: string;
  longEn: string;
  longAr: string;
  whoEn: string;
  whoAr: string;
  whatEn: string;
  whatAr: string;
  whenEn: string;
  whenAr: string;
  processEn: string;
  processAr: string;
  safetyEn: string;
  safetyAr: string;
  priceEn: string;
  priceAr: string;
};

const ACTIONS: Array<{ en: RegExp; kind: string; ar: string }> = [
  { en: /\binspection\b/i, kind: "inspection", ar: "فحص" },
  { en: /\bdiagnosis\b/i, kind: "diagnosis", ar: "تشخيص" },
  { en: /\bfault finding\b/i, kind: "diagnosis", ar: "تحديد" },
  { en: /\bdetection\b/i, kind: "diagnosis", ar: "كشف" },
  { en: /\breplacement\b/i, kind: "replacement", ar: "استبدال" },
  { en: /\binstallation\b/i, kind: "installation", ar: "تركيب" },
  { en: /\bremoval\b/i, kind: "removal", ar: "إزالة" },
  { en: /\bcleaning\b/i, kind: "cleaning", ar: "تنظيف" },
  { en: /\brepair\b/i, kind: "repair", ar: "إصلاح" },
  { en: /\bmaintenance\b/i, kind: "maintenance", ar: "صيانة" },
  { en: /\bservice\b/i, kind: "service", ar: "خدمة" },
];

const AR_WORD: Record<string, string> = {
  ac: "التكييف",
  air: "الهواء",
  apartment: "الشقق",
  bathroom: "الحمام",
  bathrooms: "الحمامات",
  boiler: "السخان",
  building: "المبنى",
  cabinet: "الخزائن",
  carpet: "السجاد",
  ceiling: "السقف",
  ceramic: "السيراميك",
  chair: "الكراسي",
  chandelier: "الثريا",
  clog: "الانسداد",
  commercial: "التجاري",
  common: "المشتركة",
  conditioner: "التكييف",
  conditioning: "التكييف",
  construction: "البناء",
  cooker: "الموقد",
  cooling: "التبريد",
  corrective: "التصحيحية",
  curtain: "الستائر",
  deep: "العميق",
  dish: "الصحون",
  dishwasher: "غسالة الصحون",
  door: "الباب",
  doors: "الأبواب",
  drain: "الصرف",
  drainage: "الصرف",
  dryer: "المجفف",
  duct: "مجرى الهواء",
  additional: "إضافي",
  appliance: "الجهاز",
  armoured: "المدرع",
  balcony: "الشرفة",
  blown: "المحترق",
  bonding: "الربط",
  breaker: "القاطع",
  burnt: "المحترق",
  cable: "الكابل",
  circuit: "الدائرة",
  compliance: "الامتثال",
  concealed: "المخفي",
  connection: "التوصيل",
  consumer: "الاستهلاكي",
  continuity: "الاستمرارية",
  dedicated: "المخصصة",
  dimmer: "خافت الضوء",
  distribution: "التوزيع",
  downlight: "السبوت",
  earth: "التأريض",
  earthing: "التأريض",
  electrical: "الكهرباء",
  emergency: "الطوارئ",
  exhaust: "الشفاط",
  fan: "المروحة",
  fault: "العطل",
  flickering: "الوامض",
  fuse: "الفيوز",
  garage: "المرآب",
  garden: "الحديقة",
  gate: "البوابة",
  ground: "الأرضي",
  insulation: "العزل",
  intermittent: "المتقطع",
  isolator: "العازل",
  junction: "الوصل",
  landscape: "الحديقة",
  led: "ليد",
  lighting: "الإنارة",
  load: "الحمل",
  loose: "المرتخي",
  mcb: "القاطع الصغير",
  mccb: "القاطع الصندوقي",
  motion: "الحركة",
  motor: "المحرك",
  occupancy: "الإشغال",
  outdoor: "الخارجي",
  overload: "الحمل الزائد",
  panel: "اللوحة",
  pendant: "المعلقة",
  phase: "الطور",
  photocell: "الخلية الضوئية",
  power: "الكهرباء",
  preventive: "الوقائية",
  quality: "الجودة",
  rcbo: "القاطع التفاضلي",
  rccb: "قاطع التسرب",
  regulator: "المنظم",
  relay: "الريليه",
  resistance: "المقاومة",
  routing: "التمديد",
  security: "الأمن",
  sensor: "المستشعر",
  sequence: "التتابع",
  shop: "المحل",
  smart: "الذكي",
  socket: "المقبس",
  sockets: "المقابس",
  sparking: "الشرر",
  spotlight: "الكشاف",
  surge: "الاندفاع",
  surface: "الظاهر",
  switch: "المفتاح",
  switches: "المفاتيح",
  testing: "الفحص",
  timer: "المؤقت",
  underground: "الأرضي",
  usb: "يو إس بي",
  voltage: "الجهد",
  weatherproof: "المقاوم للعوامل",
  wire: "السلك",
  wiring: "التمديدات",
  exterior: "الخارجي",
  faucet: "الحنفية",
  filter: "الفلتر",
  floor: "الأرضية",
  flooring: "الأرضيات",
  freezer: "الفريزر",
  fridge: "الثلاجة",
  furniture: "الأثاث",
  gas: "الغاز",
  general: "العامة",
  glass: "الزجاج",
  grease: "الدهون",
  gym: "الصالة الرياضية",
  handyman: "الأعمال اليدوية",
  heater: "السخان",
  home: "المنزل",
  house: "المنزل",
  inspection: "",
  interior: "الداخلي",
  kitchen: "المطبخ",
  kitchens: "المطابخ",
  leak: "التسرب",
  leakage: "التسرب",
  light: "الإنارة",
  lock: "القفل",
  machine: "الآلة",
  mattress: "المرتبة",
  microwave: "المايكروويف",
  minor: "البسيطة",
  move: "الانتقال",
  office: "المكتب",
  oven: "الفرن",
  paint: "الدهان",
  painting: "الدهان",
  pipe: "الأنبوب",
  pipes: "الأنابيب",
  plaster: "اللياسة",
  plumbing: "السباكة",
  pool: "المسبح",
  post: "بعد",
  property: "العقار",
  pump: "المضخة",
  refrigerator: "الثلاجة",
  regular: "الدوري",
  renovation: "التجديد",
  residential: "السكني",
  roof: "السطح",
  sauna: "الساونا",
  shower: "الدش",
  sink: "المغسلة",
  sofa: "الكنبة",
  split: "سبليت",
  tank: "الخزان",
  tap: "الحنفية",
  tile: "البلاط",
  tiling: "البلاط",
  toilet: "المرحاض",
  upholstery: "التنجيد",
  villa: "الفيلا",
  wall: "الجدار",
  walls: "الجدران",
  washer: "الغسالة",
  washing: "الغسيل",
  water: "المياه",
  window: "النافذة",
  windows: "النوافذ",
  wooden: "الخشبي",
};

const HAZARD = new Set([
  "electrical",
  "refrigerator",
  "microwave",
  "washing-machine",
  "water-heater",
  "dishwasher",
  "oven",
  "burner-cooker",
  "ac",
]);

function objectPhrase(nameEn: string) {
  let text = nameEn;
  for (const action of ACTIONS) text = text.replace(action.en, " ");
  return text.replace(/[/&]+/g, " ").replace(/\s+/g, " ").trim() || nameEn;
}

function actionOf(nameEn: string) {
  return ACTIONS.find((action) => action.en.test(nameEn)) ?? { kind: "service", ar: "خدمة" };
}

function arabicObject(nameEn: string) {
  const raw = objectPhrase(nameEn)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !["and", "or", "of", "the", "a", "an"].includes(word));
  const mapped = raw.map((word) => AR_WORD[word]).filter(Boolean);
  if (mapped.length) return mapped.join(" ");
  return "";
}

function arabicName(nameEn: string, categoryAr: string) {
  const action = actionOf(nameEn);
  const object = arabicObject(nameEn);
  if (object && action.ar !== "خدمة") return `${action.ar} ${object}`;
  if (object) return object;
  return `خدمة ضمن ${categoryAr}`;
}

function safety(categorySlug: string, locale: "en" | "ar") {
  if (HAZARD.has(categorySlug)) {
    return locale === "ar"
      ? "توقف إذا ظهرت سخونة أو شرر أو رائحة احتراق أو تسرب غاز أو ماء على جهاز كهربائي. لا تفكك وحدة مغلقة ولا تعمل على كهرباء موصولة."
      : "Stop if you see heat, sparks, a burning smell, or water on an electrical appliance. Do not open a sealed unit or work on a live supply.";
  }
  return locale === "ar"
    ? "توقف إذا ظهر خطر كهربائي أو تسرب لا يمكنك عزله أو تلف إنشائي. اذكر ذلك في الطلب بدل محاولة إصلاحه."
    : "Stop if you find an electrical hazard, a leak you cannot isolate, or structural damage. Name it on the request instead of trying to repair it.";
}

export function buildVisitorServiceCopy(input: {
  slug: string;
  nameEn: string;
  categorySlug: string;
  categoryNameEn: string;
  categoryNameAr: string;
}): VisitorServiceCopy {
  const handwritten = ELECTRICAL_SERVICE_COPY[input.slug];
  if (handwritten) {
    return {
      nameEn: handwritten.nameEn,
      nameAr: handwritten.nameAr,
      shortEn: handwritten.shortEn,
      shortAr: handwritten.shortAr,
      longEn: handwritten.longEn,
      longAr: handwritten.longAr,
      whoEn: handwritten.whoEn,
      whoAr: handwritten.whoAr,
      whatEn: handwritten.whatEn,
      whatAr: handwritten.whatAr,
      whenEn: handwritten.whenEn,
      whenAr: handwritten.whenAr,
      processEn: handwritten.processEn,
      processAr: handwritten.processAr,
      safetyEn: handwritten.safetyEn,
      safetyAr: handwritten.safetyAr,
      priceEn: "A quote follows the assessment. This page does not publish a price.",
      priceAr: "يُعرض السعر بعد التقييم. هذه الصفحة لا تنشر سعراً.",
    };
  }

  const object = objectPhrase(input.nameEn);
  const action = actionOf(input.nameEn);
  const nameAr = arabicName(input.nameEn, input.categoryNameAr);
  const safeEn = safety(input.categorySlug, "en");
  const safeAr = safety(input.categorySlug, "ar");

  const shortEn: Record<string, string> = {
    inspection: `${input.nameEn} checks ${object} and records the next professional step.`,
    diagnosis: `${input.nameEn} finds why ${object} is failing when the cause is not obvious.`,
    repair: `${input.nameEn} repairs ${object} after the fault is identified.`,
    replacement: `${input.nameEn} replaces ${object} when inspection shows repair is not enough.`,
    installation: `${input.nameEn} fits ${object} after the existing point or area is checked.`,
    removal: `${input.nameEn} removes ${object} that inspection has already identified.`,
    cleaning: `${input.nameEn} cleans ${object} for the property you name on the request.`,
    maintenance: `${input.nameEn} covers scheduled care and fault checks for ${object}.`,
    service: `${input.nameEn} assesses ${object} and recommends the next step.`,
  };
  const shortAr: Record<string, string> = {
    inspection: `${nameAr} يفحص الحالة ويسجّل الخطوة المهنية التالية.`,
    diagnosis: `${nameAr} يبيّن السبب عندما لا يكون واضحاً.`,
    repair: `${nameAr} يصلح العطل بعد تحديده.`,
    replacement: `${nameAr} يستبدل القطعة عندما لا يكفي الإصلاح.`,
    installation: `${nameAr} يركّب على نقطة أو مساحة قائمة بعد فحصها.`,
    removal: `${nameAr} يزيل ما حدده الفحص.`,
    cleaning: `${nameAr} ينظّف ما تذكره في الطلب.`,
    maintenance: `${nameAr} يشمل العناية والفحص للعطل الظاهر.`,
    service: `${nameAr} يقيّم الحالة ويوصي بالخطوة التالية.`,
  };

  return {
    nameEn: input.nameEn,
    nameAr,
    shortEn: shortEn[action.kind] || shortEn.service,
    shortAr: shortAr[action.kind] || shortAr.service,
    longEn: `${input.nameEn} is a ${input.categoryNameEn} offering. It starts with the problem you can describe, then a technician says whether inspection, repair, replacement, or a later visit is the right next step. Listing this service does not mean it is already available in every area.`,
    longAr: `${nameAr} ضمن ${input.categoryNameAr}. يبدأ من المشكلة التي تصفها، ثم يبيّن الفني إن كانت الخطوة التالية فحصاً أو إصلاحاً أو استبدالاً. ذكر الخدمة لا يعني أنها متاحة في كل منطقة.`,
    whoEn: `Homes, villas, apartments, and small workplaces that need ${object.toLowerCase()} looked at.`,
    whoAr: `المنازل والفلل والشقق وأماكن العمل الصغيرة التي تحتاج إلى النظر في هذه الخدمة.`,
    whatEn: `Assess ${object.toLowerCase()}, name the finding, and recommend the next professional step.`,
    whatAr: `تقييم الحالة، وتسمية النتيجة، والتوصية بالخطوة المهنية التالية.`,
    whenEn: `When ${object.toLowerCase()} has failed, returned after a first attempt, or you are unsure of the cause.`,
    whenAr: `عندما تتوقف الحالة أو تعود بعد محاولة أولى، أو عندما لا يكون السبب واضحاً.`,
    processEn: "Name the problem and the area of the property. We confirm the request, then a technician assesses it before any wider work is recommended.",
    processAr: "اذكر المشكلة ومكانها في العقار. نؤكد الطلب، ثم يقيّم الفني قبل التوصية بعمل أوسع.",
    safetyEn: safeEn,
    safetyAr: safeAr,
    priceEn: "A quote follows the assessment. This page does not publish a price or a visit-time promise.",
    priceAr: "يُعرض السعر بعد التقييم. هذه الصفحة لا تنشر سعراً ولا وعداً بوقت الزيارة.",
  };
}

export function isTemplateServiceCopy(shortDescription: string | null | undefined) {
  const text = shortDescription || "";
  return (
    text.includes("helps property owners address") ||
    text.includes("خدمة ضمن") ||
    text.includes("non-working outlets")
  );
}
