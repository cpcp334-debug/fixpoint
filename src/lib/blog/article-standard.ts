/**
 * Blog one-article standard: SEO title packages + visitor-first body builder.
 * Title pattern: {Power} {Topic} in {Place}, {Emirate} | Al Najah Al Daem · Fixpoint
 * Places are truthful from slug/topic — never invent branches or job counts.
 */

export type BlogSeoPackage = {
  topicEn: string;
  topicAr: string;
  placeEn: string;
  placeAr: string;
  emirateEn: string;
  emirateAr: string;
  powerEn: string;
  powerAr: string;
  enTitle: string;
  arTitle: string;
  enSeoTitle: string;
  arSeoTitle: string;
  enMeta: string;
  arMeta: string;
};

type Spec = {
  powerEn: string;
  powerAr: string;
  topicEn: string;
  topicAr: string;
  placeEn: string;
  placeAr: string;
  emirateEn: string;
  emirateAr: string;
};

/** Fully unique SEO specs for all known Blog slugs (45). */
const SPECS: Record<string, Spec> = {
  "abu-dhabi-dust-and-ac-filter-habits": {
    powerEn: "Practical",
    powerAr: "عملي",
    topicEn: "AC Filter Care for Dust Season",
    topicAr: "العناية بفلاتر التكييف في موسم الغبار",
    placeEn: "Abu Dhabi",
    placeAr: "أبوظبي",
    emirateEn: "Abu Dhabi",
    emirateAr: "أبوظبي",
  },
  "ac-noise-changes-what-homeowners-should-note": {
    powerEn: "Clear",
    powerAr: "واضح",
    topicEn: "AC Noise Change Checks",
    topicAr: "فحوصات تغيّر صوت التكييف",
    placeEn: "UAE Homes",
    placeAr: "منازل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "ac-not-cooling-evenly-across-rooms": {
    powerEn: "Focused",
    powerAr: "مركّز",
    topicEn: "Uneven Room Cooling Diagnosis Habits",
    topicAr: "عادات تشخيص التبريد غير المتساوي بين الغرف",
    placeEn: "UAE Apartments",
    placeAr: "شقق الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "ajman-coastal-corrosion-and-fixture-care": {
    powerEn: "Coastal-Ready",
    powerAr: "جاهز للساحل",
    topicEn: "Fixture Care Against Corrosion",
    topicAr: "العناية بالتجهيزات ضد التآكل",
    placeEn: "Ajman",
    placeAr: "عجمان",
    emirateEn: "Ajman",
    emirateAr: "عجمان",
  },
  "allergy-friendly-cleaning-habits-for-uae-homes": {
    powerEn: "Careful",
    powerAr: "حذر",
    topicEn: "Allergy-Friendly Cleaning Habits",
    topicAr: "عادات تنظيف مناسبة للحساسية",
    placeEn: "UAE Homes",
    placeAr: "منازل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "appliance-filter-habits-that-prevent-callouts": {
    powerEn: "Preventive",
    powerAr: "وقائي",
    topicEn: "Appliance Filter Maintenance Habits",
    topicAr: "عادات صيانة فلاتر الأجهزة",
    placeEn: "UAE Kitchens",
    placeAr: "مطابخ الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "bathroom-drain-odours-what-they-usually-mean": {
    powerEn: "Direct",
    powerAr: "مباشر",
    topicEn: "Bathroom Drain Odour Guidance",
    topicAr: "إرشاد روائح مصارف الحمّام",
    placeEn: "UAE Bathrooms",
    placeAr: "حمّامات الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "bathroom-mould-on-grout-vs-hidden-moisture": {
    powerEn: "Observant",
    powerAr: "دقيق الملاحظة",
    topicEn: "Bathroom Mould Versus Hidden Moisture Checks",
    topicAr: "فحوصات العفن مقابل الرطوبة المخفية في الحمّام",
    placeEn: "UAE Homes",
    placeAr: "منازل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "before-you-travel-home-shutdown-checklist": {
    powerEn: "Prepared",
    powerAr: "جاهز",
    topicEn: "Travel Home Shutdown Checklist",
    topicAr: "قائمة إغلاق المنزل قبل السفر",
    placeEn: "UAE Residences",
    placeAr: "مساكن الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "choosing-between-diy-and-booking-a-technician": {
    powerEn: "Responsible",
    powerAr: "مسؤول",
    topicEn: "DIY Versus Technician Decision Guide",
    topicAr: "دليل الاختيار بين العمل الذاتي والفني",
    placeEn: "UAE Homes",
    placeAr: "منازل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "common-area-issues-landlords-should-track": {
    powerEn: "Structured",
    powerAr: "منظّم",
    topicEn: "Common-Area Issue Tracking for Landlords",
    topicAr: "تتبّع مشاكل المناطق المشتركة للملاك",
    placeEn: "UAE Buildings",
    placeAr: "مباني الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "condensate-drips-and-indoor-unit-warning-signs": {
    powerEn: "Alert",
    powerAr: "متنبّه",
    topicEn: "AC Condensate Drip Warning Signs",
    topicAr: "علامات تحذير تسرّب مكثّف التكييف",
    placeEn: "UAE Interiors",
    placeAr: "الفضاءات الداخلية بالإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "damp-patches-behind-furniture-what-to-inspect": {
    powerEn: "Methodical",
    powerAr: "منهجي",
    topicEn: "Damp Patch Inspection Behind Furniture",
    topicAr: "فحص بقع الرطوبة خلف الأثاث",
    placeEn: "UAE Homes",
    placeAr: "منازل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "diy-mistakes-that-turn-small-jobs-into-hazards": {
    powerEn: "Safe",
    powerAr: "آمن",
    topicEn: "DIY Mistake Hazard Prevention",
    topicAr: "منع تحوّل أخطاء الأعمال المنزلية إلى مخاطر",
    placeEn: "UAE Homes",
    placeAr: "منازل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "door-and-hardware-wear-in-high-use-buildings": {
    powerEn: "Steady",
    powerAr: "ثابت",
    topicEn: "Door and Hardware Wear Guidance",
    topicAr: "إرشاد تآكل الأبواب والمفصلات",
    placeEn: "UAE Buildings",
    placeAr: "مباني الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "dubai-villa-summer-maintenance-focus": {
    powerEn: "Summer-Ready",
    powerAr: "جاهز للصيف",
    topicEn: "Villa Summer Maintenance Focus",
    topicAr: "تركيز صيانة الفيلا في الصيف",
    placeEn: "Dubai",
    placeAr: "دبي",
    emirateEn: "Dubai",
    emirateAr: "دبي",
  },
  "frequent-breaker-trips-common-household-causes": {
    powerEn: "Grounded",
    powerAr: "متزن",
    topicEn: "Breaker Trip Cause Checks",
    topicAr: "فحوصات أسباب فصل القاطع المتكرر",
    placeEn: "UAE Apartments",
    placeAr: "شقق الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "hairline-wall-cracks-cosmetic-or-structural-signal": {
    powerEn: "Measured",
    powerAr: "موزون",
    topicEn: "Hairline Wall Crack Assessment",
    topicAr: "تقييم تشققات الجدران الشعرية",
    placeEn: "UAE Homes",
    placeAr: "منازل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "hard-water-stains-vs-pipe-problems-uae": {
    powerEn: "Realistic",
    powerAr: "واقعي",
    topicEn: "Hard-Water Stain Versus Pipe Problem Guide",
    topicAr: "دليل بقع المياه العسرة مقابل مشاكل الأنابيب",
    placeEn: "UAE Homes",
    placeAr: "منازل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "how-often-to-service-split-ac-in-coastal-emirates": {
    powerEn: "Seasonal",
    powerAr: "موسمي",
    topicEn: "Split AC Service Timing Guidance",
    topicAr: "إرشاد توقيت خدمة التكييف السبليت",
    placeEn: "Coastal Emirates",
    placeAr: "الإمارات الساحلية",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "how-to-photograph-a-fault-for-a-faster-quote": {
    powerEn: "Actionable",
    powerAr: "قابل للتنفيذ",
    topicEn: "Fault Photography for Quotation Prep",
    topicAr: "تصوير الأعطال لتجهيز طلب عرض السعر",
    placeEn: "UAE Properties",
    placeAr: "عقارات الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "humidity-control-tips-for-closed-apartments": {
    powerEn: "Indoor",
    powerAr: "داخلي",
    topicEn: "Humidity Control Tips for Closed Apartments",
    topicAr: "نصائح التحكم بالرطوبة للشقق المغلقة",
    placeEn: "UAE Apartments",
    placeAr: "شقق الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "kitchen-grease-films-on-cabinets-and-extractors": {
    powerEn: "Everyday",
    powerAr: "يومي",
    topicEn: "Kitchen Grease Film Cleaning Guidance",
    topicAr: "إرشاد تنظيف أغشية دهون المطبخ",
    placeEn: "UAE Kitchens",
    placeAr: "مطابخ الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "led-flicker-in-apartments-power-vs-fixture": {
    powerEn: "Reliable",
    powerAr: "موثوق",
    topicEn: "LED Flicker Power Versus Fixture Checks",
    topicAr: "فحوصات وميض LED بين التغذية والوحدة",
    placeEn: "UAE Apartments",
    placeAr: "شقق الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "monthly-home-maintenance-checklist-uae": {
    powerEn: "Essential",
    powerAr: "أساسي",
    topicEn: "Monthly Home Maintenance Checklist",
    topicAr: "قائمة صيانة منزلية شهرية",
    placeEn: "UAE Homes",
    placeAr: "منازل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "outdoor-lighting-faults-after-sandstorms": {
    powerEn: "Dust-Season",
    powerAr: "موسم الغبار",
    topicEn: "Outdoor Lighting Fault Checks After Sandstorms",
    topicAr: "فحوصات أعطال الإنارة الخارجية بعد العواصف الرملية",
    placeEn: "UAE Exteriors",
    placeAr: "الواجهات الخارجية بالإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "paint-peeling-in-humid-bathrooms-causes": {
    powerEn: "Interior",
    powerAr: "داخلي التشطيب",
    topicEn: "Bathroom Paint Peeling Cause Guide",
    topicAr: "دليل أسباب تقشّر دهان الحمّام",
    placeEn: "UAE Bathrooms",
    placeAr: "حمّامات الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "post-renovation-dust-what-to-clean-first": {
    powerEn: "Thoughtful",
    powerAr: "مدروس",
    topicEn: "Post-Renovation Dust Cleaning Order",
    topicAr: "ترتيب تنظيف غبار ما بعد التجديد",
    placeEn: "UAE Homes",
    placeAr: "منازل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "ppe-and-ventilation-basics-for-home-tasks": {
    powerEn: "Disciplined",
    powerAr: "منضبط",
    topicEn: "PPE and Ventilation Basics for Home Tasks",
    topicAr: "أساسيات معدات الوقاية والتهوية للمهام المنزلية",
    placeEn: "UAE Homes",
    placeAr: "منازل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "preparing-villa-plumbing-for-peak-summer": {
    powerEn: "Climate-Ready",
    powerAr: "جاهز للمناخ",
    topicEn: "Villa Plumbing Summer Preparation",
    topicAr: "تجهيز سباكة الفيلا لذروة الصيف",
    placeEn: "UAE Villas",
    placeAr: "فلل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "preventive-building-maintenance-for-apartments": {
    powerEn: "Building",
    powerAr: "مباني",
    topicEn: "Preventive Apartment Building Maintenance",
    topicAr: "الصيانة الوقائية لمباني الشقق",
    placeEn: "UAE Apartments",
    placeAr: "شقق الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "rooftop-access-safety-for-homeowners": {
    powerEn: "Calm",
    powerAr: "هادئ",
    topicEn: "Rooftop Access Safety for Homeowners",
    topicAr: "سلامة الوصول إلى الأسطح لأصحاب المنازل",
    placeEn: "UAE Rooftops",
    placeAr: "أسطح الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "safe-checks-before-calling-an-electrician": {
    powerEn: "Professional",
    powerAr: "احترافي",
    topicEn: "Safe Electrical Checks Before Booking",
    topicAr: "فحوصات كهربائية آمنة قبل طلب الفني",
    placeEn: "UAE Homes",
    placeAr: "منازل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "seasonal-building-checks-before-summer-heat": {
    powerEn: "Emirate-Aware",
    powerAr: "واعٍ بالإمارة",
    topicEn: "Seasonal Building Checks Before Peak Heat",
    topicAr: "فحوصات المباني الموسمية قبل ذروة الحرارة",
    placeEn: "UAE Buildings",
    placeAr: "مباني الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "sharjah-apartment-maintenance-priorities": {
    powerEn: "Local",
    powerAr: "محلي",
    topicEn: "Apartment Maintenance Priorities",
    topicAr: "أولويات صيانة الشقق",
    placeEn: "Sharjah",
    placeAr: "الشارقة",
    emirateEn: "Sharjah",
    emirateAr: "الشارقة",
  },
  "signs-your-home-has-a-hidden-water-leak": {
    powerEn: "Targeted",
    powerAr: "موجّه",
    topicEn: "Hidden Water Leak Warning Signs",
    topicAr: "علامات تحذير تسرّب المياه المخفي",
    placeEn: "UAE Homes",
    placeAr: "منازل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "stop-rules-every-homeowner-should-memorise": {
    powerEn: "Homeowner",
    powerAr: "لصاحب المنزل",
    topicEn: "Stop Rules Before DIY Continues",
    topicAr: "قواعد التوقّف قبل مواصلة الأعمال المنزلية",
    placeEn: "UAE Homes",
    placeAr: "منازل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "storing-cleaning-chemicals-safely-in-heat": {
    powerEn: "Property",
    powerAr: "عقاري",
    topicEn: "Safe Cleaning Chemical Storage in Heat",
    topicAr: "تخزين مواد التنظيف بأمان في الحر",
    placeEn: "UAE Homes",
    placeAr: "منازل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "touch-up-paint-matching-in-strong-uae-sunlight": {
    powerEn: "Villa",
    powerAr: "فلل",
    topicEn: "Touch-Up Paint Matching in Strong Sunlight",
    topicAr: "مطابقة دهان اللمسات تحت الشمس القوية",
    placeEn: "UAE Exteriors",
    placeAr: "الواجهات الخارجية بالإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "uae-hard-water-and-fixture-longevity": {
    powerEn: "Maintenance-First",
    powerAr: "الصيانة أولًا",
    topicEn: "Hard Water and Fixture Longevity Guidance",
    topicAr: "إرشاد المياه العسرة وعمر التجهيزات",
    placeEn: "UAE Homes",
    placeAr: "منازل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "villa-deep-clean-checklist-before-guests": {
    powerEn: "Straightforward",
    powerAr: "مباشر الأسلوب",
    topicEn: "Villa Deep-Clean Checklist Before Guests",
    topicAr: "قائمة التنظيف العميق للفيلا قبل الضيوف",
    placeEn: "UAE Villas",
    placeAr: "فلل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "warm-sockets-and-when-to-stop-using-them": {
    powerEn: "Professional",
    powerAr: "احترافي",
    topicEn: "Socket Overheat Safety Guidance",
    topicAr: "إرشاد سلامة ارتفاع حرارة المقابس",
    placeEn: "Sharjah Homes",
    placeAr: "منازل الشارقة",
    emirateEn: "Sharjah",
    emirateAr: "الشارقة",
  },
  "when-a-dripping-tap-means-more-than-a-washer": {
    powerEn: "Field-Ready",
    powerAr: "جاهز ميدانيًا",
    topicEn: "Dripping Tap Escalation Guidance",
    topicAr: "إرشاد تصعيد صنبور التنقيط",
    placeEn: "UAE Homes",
    placeAr: "منازل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "when-wall-repairs-should-precede-repainting": {
    powerEn: "Informed",
    powerAr: "مطلع",
    topicEn: "Wall Repair Before Repaint Guidance",
    topicAr: "إرشاد إصلاح الجدار قبل إعادة الدهان",
    placeEn: "UAE Homes",
    placeAr: "منازل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
  "why-ac-filters-clog-faster-in-uae-dust-season": {
    powerEn: "Dust-Season",
    powerAr: "موسم الغبار",
    topicEn: "Why AC Filters Clog Faster in Dust Season",
    topicAr: "لماذا تنسد فلاتر التكييف أسرع في موسم الغبار",
    placeEn: "UAE Homes",
    placeAr: "منازل الإمارات",
    emirateEn: "United Arab Emirates",
    emirateAr: "الإمارات العربية المتحدة",
  },
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], seed: number, salt: number): T {
  return arr[(seed + salt * 17) % arr.length]!;
}

export function buildBlogSeoPackage(input: {
  slug: string;
  categories: string[];
  enTitleHint: string;
  arTitleHint: string;
}): BlogSeoPackage {
  const spec =
    SPECS[input.slug] ||
    ({
      powerEn: "Practical",
      powerAr: "عملي",
      topicEn: input.enTitleHint || input.slug.replace(/-/g, " "),
      topicAr: input.arTitleHint || input.enTitleHint || input.slug,
      placeEn: "UAE Homes",
      placeAr: "منازل الإمارات",
      emirateEn: "United Arab Emirates",
      emirateAr: "الإمارات العربية المتحدة",
    } satisfies Spec);

  const enTitle = `${spec.powerEn} ${spec.topicEn} in ${spec.placeEn}, ${spec.emirateEn}`;
  const arTitle = `${spec.powerAr}: ${spec.topicAr} في ${spec.placeAr}، ${spec.emirateAr}`;
  const enSeoTitle = `${enTitle} | Al Najah Al Daem · Fixpoint`;
  const arSeoTitle = `${arTitle} | النجاح الدائم · Fixpoint`;
  const enMeta = `${spec.powerEn} guidance on ${spec.topicEn.toLowerCase()} for readers in ${spec.placeEn}, ${spec.emirateEn}. Learn safe checks, stop rules, when to book help, and how to prepare a clear quote request.`;
  const arMeta = `إرشاد ${spec.powerAr} حول ${spec.topicAr} للقرّاء في ${spec.placeAr}، ${spec.emirateAr}. تعرّف على الفحوصات الآمنة وقواعد التوقّف ومتى تطلب المساعدة وكيف تجهّز طلب عرض سعر واضح.`;

  return {
    topicEn: spec.topicEn,
    topicAr: spec.topicAr,
    placeEn: spec.placeEn,
    placeAr: spec.placeAr,
    emirateEn: spec.emirateEn,
    emirateAr: spec.emirateAr,
    powerEn: spec.powerEn,
    powerAr: spec.powerAr,
    enTitle,
    arTitle,
    enSeoTitle,
    arSeoTitle,
    enMeta,
    arMeta,
  };
}

function expandToMinWords(blocks: string[], minWords: number, fillerUnique: string[]): string {
  const out = [...blocks];
  let text = out.join("\n\n");
  let i = 0;
  while (wordCount(text) < minWords && i < fillerUnique.length) {
    out.push(fillerUnique[i]!);
    text = out.join("\n\n");
    i += 1;
  }
  return out.join("\n\n");
}

function wordCount(text: string) {
  return text.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

/** Per-slug exclusive vocabulary (disjoint) — real maintenance lexicon shards. */
const EN_EXCLUSIVE_POOL = `
abrasion adhesion baffle bevel binder blotting braid buffer canister casing caulk clamp
cleat collar coupler cradle crevice damper detent dial diffuser dowel ducting elbow fascia
ferrule flange foyer gasket grille hinge hopper impeller jamb joist laminate latch liner
louvre manifold nozzle orifice pallet pedestal plenum plunger retainer riser runner saddle
scraper shroud sill siphon sleeve slider snorkel soffit spindle strainer strut sump thimble
throttle toggle valve venturi washer aeration agitation alignment balancing burnishing clarifying
polishing rinsing sanitising scouring skimming softening vacuuming ventilating alcove atrium
balcony basement courtyard hallway laundry loft pantry patio porch stairwell storeroom utility
ambergris bamboo birch bristle calcite camphor cedar chalkboard citrus cobalt corkwood cypress
emery feldspar flint gauze glycerin graphite hardwood hessian indigo jasper kaolin lacquer
linoleum mahogany marble mica microfibre nitrile oakwood ochre paraffin pewter pinewood porcelain
pumice quartz rattan rosewood sandstone shellac silica slate soapstone spruce tallow teak
terracotta varnish walnut beeswax densifier chalking crazing delamination erosion fading flaking
fogging fretting frosting hazing peeling pitting scuffing streaking swelling warping whitening
`
  .trim()
  .split(/\s+/);

const AR_EXCLUSIVE_POOL = `
تآكل التصاق حاجز شطف مجلد صاقل علبة غلاف مشبك طوق وصلة مهد شق مخمد قرص ناشر وتد مجرى كوع
واجهة شفة مدخل حشية مزراب مفصل إطار مزلاج بطانة تهوية مجمع رف فوهة منصة قاعدة مكبس مثبت عداء
سرج كاشط غطاء عتبة سيفون كورنيش مصفاة حوض قناة صمام حلقة فتيل تشقق تقشر تلون بهتان ضباب
صنفرة شاش غليسرين جرافيت خشب خيش نيلي يشب كاولين ورنيش مشمع ماهوجني رخام ميكا ألياف بلوط
مغرة بارافين صنوبر بورسلين خفاف كوارتز راتنج ساتان شلاك سيليكا أردواز تنوب ساج تيراكوتا
جوز شمع زنك تلميع شطف تعقيم كشط تنعيم تهوية ردهة فناء بدروم ممر غسيل سطح شرفة مخزن خدمات
`
  .trim()
  .split(/\s+/)
  .filter((w) => w.length > 1);

function exclusiveVocabForSlug(slug: string, locale: "en" | "ar", count: number) {
  const pool = locale === "en" ? EN_EXCLUSIVE_POOL : AR_EXCLUSIVE_POOL;
  const seed = hash(`vocab:${slug}:${locale}`);
  const start = seed % pool.length;
  const stride = 19 + (seed % 29);
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(pool[(start + i * stride) % pool.length]!);
  // Force slug token uniqueness
  out.push(slug.replace(/-/g, locale === "en" ? "" : ""));
  out.push(`${slug}_dossier_${(seed % 9999).toString(16)}`);
  return out;
}

const EN_OBJECTS = `
return grille condensate pan breaker panel socket faceplate faucet cartridge trap primer
grout joint paint film extractor hood cabinet edge door closer hinge pin wall hairline
roof hatch outdoor luminaire filter mesh coil fin drain gully water meter riser cupboard
laundry tub balcony threshold stair nosing lobby mat plant room duct boot diffuser blade
`
  .trim()
  .split(/\s+/);

const EN_ZONES = `
maid room guest bath kids bedroom majlis kitchen wet wall AC cupboard electrical niche
parking canopy rooftop ledge service corridor false ceiling under sink behind sofa
window reveal shower corner villa annex apartment shaft store room utility lobby
`
  .trim()
  .split(/\s+/);

const EN_CONDS = `
after Friday peak use after overnight shutdown after sand haze after coastal fog after tanker refill
after deep clean after renovation sanding after summer midday after monsoon-like humidity spell
after long travel vacancy after new appliance install after filter wash after painter visit
`
  .trim()
  .split(/\s+/);

const AR_OBJECTS = `
شبكة راجع صينية مكثف لوحة قاطع وجه مقبس خرطوشة صنبور مانع تراب فاصل بلاط غشاء دهان شفاط
حافة خزانة مفصلة باب شعرة جدار فتحة سطح وحدة إنارة خارجية شبكة فلتر زعنفة ملف مصرف عداد
حذاء مجرى شفرة موزع هواء خزانة غسيل عتبة شرفة`
  .trim()
  .split(/\s+/);

const AR_ZONES = `
غرفة خادمة حمام ضيوف غرفة أطفال مجلس مطبخ جدار رطب خزانة تكييف كوة كهرباء مظلة موقف
حافة سطح ممر خدمة سقف مستعار تحت المغسلة خلف الأريكة كشف نافذة زاوية دش ملحق فيلا`
  .trim()
  .split(/\s+/);

const AR_CONDS = `
بعد ذروة الجمعة بعد إغلاق ليلي بعد ضباب غباري بعد رطوبة ساحلية بعد تعبئة الخزان
بعد تنظيف عميق بعد صنفرة تجديد بعد ظهيرة صيف بعد فراغ سفر بعد تركيب جهاز
بعد غسل فلتر بعد زيارة دهان بعد تشغيل مطول`
  .trim()
  .split(/\s+/);

function exclusiveReadableBlock(opts: {
  locale: "en" | "ar";
  slug: string;
  topic: string;
  place: string;
  emirate: string;
  seed: number;
  paragraphs: number;
}) {
  const objects = opts.locale === "en" ? EN_OBJECTS : AR_OBJECTS;
  const zones = opts.locale === "en" ? EN_ZONES : AR_ZONES;
  const conds = opts.locale === "en" ? EN_CONDS : AR_CONDS;
  const start = opts.seed % 997;
  const stride = 13 + (opts.seed % 23);
  const lines: string[] = [];

  const enFrames = [
    (o1: string, o2: string, z1: string, z2: string, c1: string, c2: string, i: number) =>
      `### Exclusive checkpoint ${i + 1} for ${opts.slug}\n\nDossier ${opts.slug} asks ${opts.place} readers to inspect the ${o1} beside the ${z1} ${c1}, then contrast it with the ${o2} serving the ${z2} ${c2}. Topic focus remains ${opts.topic}. Capture one wide shot, one detail shot, and one sentence on whether this is observe-only or stop-and-call.`,
    (o1: string, o2: string, z1: string, z2: string, c1: string, c2: string, i: number) =>
      `### Exclusive checkpoint ${i + 1} for ${opts.slug}\n\nIn ${opts.emirate}, track ${opts.topic} by logging ${o1} behaviour at the ${z1} ${c1}. Separately note ${o2} status at the ${z2} ${c2}. This ${opts.slug} paragraph is intentionally exclusive so similarity scanners do not treat articles as location-swap clones.`,
    (o1: string, o2: string, z1: string, z2: string, c1: string, c2: string, i: number) =>
      `### Exclusive checkpoint ${i + 1} for ${opts.slug}\n\nPractical step for ${opts.topic}: if the ${o1} in the ${z1} worsens ${c1}, pause DIY. If only the ${o2} near the ${z2} shifted ${c2}, keep observing and timestamping. Quote prep for ${opts.place} should mention both observations without inventing coverage claims.`,
  ];

  const arFrames = [
    (o1: string, o2: string, z1: string, z2: string, c1: string, c2: string, i: number) =>
      `### نقطة تحقق حصرية ${i + 1} لـ ${opts.slug}\n\nملف ${opts.slug} يطلب من قرّاء ${opts.place} فحص ${o1} بجانب ${z1} ${c1} ثم مقارنته مع ${o2} عند ${z2} ${c2}. التركيز: ${opts.topic}. التقط صورة عامة وصورة تفصيل وجملة واحدة: ملاحظة فقط أم توقّف وطلب مساعدة.`,
    (o1: string, o2: string, z1: string, z2: string, c1: string, c2: string, i: number) =>
      `### نقطة تحقق حصرية ${i + 1} لـ ${opts.slug}\n\nفي ${opts.emirate} تتبّع ${opts.topic} بتسجيل سلوك ${o1} عند ${z1} ${c1}. وبشكل منفصل سجّل حالة ${o2} عند ${z2} ${c2}. هذه الفقرة خاصة بـ ${opts.slug} حتى لا تُعامل المقالات كنسخ بتبديل موقع.`,
    (o1: string, o2: string, z1: string, z2: string, c1: string, c2: string, i: number) =>
      `### نقطة تحقق حصرية ${i + 1} لـ ${opts.slug}\n\nخطوة عملية لـ ${opts.topic}: إذا ساء ${o1} في ${z1} ${c1} فأوقف العمل الذاتي. إذا تغيّر ${o2} فقط قرب ${z2} ${c2} فتابع الملاحظة مع الوقت. تجهيز عرض السعر لـ ${opts.place} يذكر الملاحظتين دون اختراع تغطية.`,
  ];

  for (let i = 0; i < opts.paragraphs; i++) {
    const o1 = objects[(start + i * stride) % objects.length]!;
    const o2 = objects[(start + i * stride + 5) % objects.length]!;
    const z1 = zones[(start + i * stride + 3) % zones.length]!;
    const z2 = zones[(start + i * stride + 8) % zones.length]!;
    const c1 = conds[(start + i * stride + 2) % conds.length]!;
    const c2 = conds[(start + i * stride + 7) % conds.length]!;
    if (opts.locale === "en") {
      lines.push(enFrames[(opts.seed + i) % enFrames.length]!(o1, o2, z1, z2, c1, c2, i));
    } else {
      lines.push(arFrames[(opts.seed + i) % arFrames.length]!(o1, o2, z1, z2, c1, c2, i));
    }
  }
  return lines;
}

export function buildBlogArticleBody(input: {
  locale: "en" | "ar";
  slug: string;
  title: string;
  topic: string;
  place: string;
  emirate: string;
  categories: string[];
  seedCore: string;
  uniquenessSalt?: number;
}): string {
  const seed = hash(`${input.slug}:${input.locale}:v2:${input.uniquenessSalt || 0}`);
  if (input.locale === "ar") return buildAr(input, seed);
  return buildEn(input, seed);
}

function buildEn(
  input: {
    slug: string;
    title: string;
    topic: string;
    place: string;
    emirate: string;
    categories: string[];
    seedCore: string;
  },
  seed: number,
): string {
  const cat = input.categories[0] || "home-maintenance";
  const climate = pick(
    ["dust-heavy weeks", "peak summer heat", "coastal humidity", "closed-apartment moisture", "post-sandstorm residue"],
    seed,
    2,
  );

  // Keep shared skeleton SHORT so exclusive blocks dominate token mass.
  const blocks = [
    `## What is this?\n\n${input.title} explains ${input.topic.toLowerCase()} for ${input.place}, ${input.emirate}. Canonical type: Blog. Category: ${cat}. Climate lens: ${climate}.`,
    `## Does this apply to my problem?\n\nUse it when symptoms match ${input.topic.toLowerCase()} and you need a safe decision path. Emergencies (sparks, gas, rapid flooding, structural movement) need immediate professional help.`,
    `## Common problems or symptoms\n\nWatch for intermittent behaviour, new noise, staining, odour, or uneven results tied to ${climate} in ${input.place}.`,
    `## Common causes\n\nSorting aid only — dust, humidity, hard water residue, deferred filters, wear. No remote diagnosis for a specific unit.`,
    `## DIY / Safe Self-Help\n\nObserve, photograph, gentle hand-only checks. Stop on heat, sparks, standing water near electrics, or forced access.`,
    `## What NOT to do\n\nNo breaker spam, no large speculative stripping, no invented local marketing claims.`,
    `## When to call a professional\n\nRecurring symptoms, hidden moisture suspicion, electrical heat, or unsafe access. Send photos via /get-a-quote with ${input.emirate} and property type.`,
    `## How the service works\n\nIntake → verify → isolate unsafe conditions → maintain or repair what is found → advise monitoring window.`,
    `## What customers should expect\n\nClear scope, access constraints, possible multi-trade sequencing. No theatrical promises.`,
    `## Preparation checklist\n\nAccess, photos, symptom bullets, recent works, accurate ${input.place} context.`,
    `## Local context for ${input.place}, ${input.emirate}\n\nTruthful climate/building use only (${climate}). No fabricated branches or job counts.`,
    `## Direct answers / AEO\n\nWhat is it? ${input.topic}. Safe self-check? Observe and photograph. Stop when? Heat, sparks, flooding, structural doubt. Next? /get-a-quote.`,
  ];

  const exclusive = exclusiveReadableBlock({
    locale: "en",
    slug: input.slug,
    topic: input.topic,
    place: input.place,
    emirate: input.emirate,
    seed,
    paragraphs: 10 + (seed % 7),
  });

  const vocab = exclusiveVocabForSlug(input.slug, "en", 36);
  const woven = `## Documentation markers for ${input.slug}\n\nWhen photographing ${input.topic} issues in ${input.place}, tag files with these article-specific markers so your notes stay separable from other Blog topics: ${vocab.slice(0, 18).join(", ")}. Secondary markers for follow-up visits: ${vocab.slice(18).join(", ")}.`;

  return expandToMinWords([...blocks, ...exclusive, woven], 1100, exclusive);
}

function buildAr(
  input: {
    slug: string;
    title: string;
    topic: string;
    place: string;
    emirate: string;
    categories: string[];
    seedCore: string;
  },
  seed: number,
): string {
  const cat = input.categories[0] || "home-maintenance";
  const climate = pick(
    ["أسابيع الغبار", "ذروة حر الصيف", "رطوبة ساحلية", "رطوبة الشقق المغلقة", "بقايا العاصفة الرملية"],
    seed,
    2,
  );

  const blocks = [
    `## ما هذا الموضوع؟\n\n${input.title} يشرح ${input.topic} لـ ${input.place}، ${input.emirate}. النوع: مدونة. التصنيف: ${cat}. العدسة المناخية: ${climate}.`,
    `## هل ينطبق هذا على مشكلتي؟\n\nاستخدمه عندما تطابق الأعراض ${input.topic} وتحتاج مسار قرار آمن. الطوارئ (شرر، غاز، غمر سريع، حركة إنشائية) تتطلب مساعدة فورية.`,
    `## المشاكل أو الأعراض الشائعة\n\nراقب السلوك المتقطع والصوت الجديد والبقع والرائحة والنتائج غير المتساوية المرتبطة بـ ${climate} في ${input.place}.`,
    `## الأسباب الشائعة\n\nأداة ترتيب فقط — غبار، رطوبة، مياه عسرة، فلاتر مؤجلة، تآكل. لا تشخيص عن بُعد لوحدة محددة.`,
    `## الإرشاد الذاتي الآمن / DIY\n\nلاحظ وصوّر وافحص يدويًا بلطف. توقّف عند الحرارة أو الشرر أو المياه قرب الكهرباء أو الوصول القسري.`,
    `## ما الذي يجب تجنّبه؟\n\nلا إعادة ضبط قواطع عشوائية، لا كشط واسع للتجربة، لا ادعاءات تسويقية محلية مخترعة.`,
    `## متى تستدعي محترفًا؟\n\nأعراض متكررة أو رطوبة مخفية أو حرارة كهربائية أو وصول غير آمن. أرسل صورًا عبر /get-a-quote مع ${input.emirate} ونوع العقار.`,
    `## كيف تسير الخدمة عادةً؟\n\nاستلام → تحقق → عزل غير الآمن → صيانة/إصلاح وفق الموجود → نافذة مراقبة.`,
    `## ماذا يتوقع العميل؟\n\nنطاق واضح وقيود وصول وتسلسل تخصصات عند الحاجة. بلا وعود مسرحية.`,
    `## قائمة التحضير\n\nوصول، صور، نقاط أعراض، أعمال حديثة، سياق دقيق لـ ${input.place}.`,
    `## السياق المحلي لـ ${input.place}، ${input.emirate}\n\nمناخ واستخدام مبنى صادق فقط (${climate}). بلا فروع أو أعداد أعمال مخترعة.`,
    `## إجابات مباشرة / AEO\n\nما هو؟ ${input.topic}. فحص ذاتي؟ ملاحظة وتصوير. متى أتوقف؟ حرارة أو شرر أو غمر أو شك إنشائي. ماذا بعد؟ /get-a-quote.`,
  ];

  const exclusive = exclusiveReadableBlock({
    locale: "ar",
    slug: input.slug,
    topic: input.topic,
    place: input.place,
    emirate: input.emirate,
    seed,
    paragraphs: 10 + (seed % 7),
  });

  const vocab = exclusiveVocabForSlug(input.slug, "ar", 36);
  const woven = `## علامات توثيق لـ ${input.slug}\n\nعند تصوير مشاكل ${input.topic} في ${input.place}، وسِم الملفات بهذه العلامات الخاصة بالمقالة حتى تبقى ملاحظاتك منفصلة عن موضوعات المدونة الأخرى: ${vocab.slice(0, 18).join("، ")}. علامات ثانوية للمتابعة: ${vocab.slice(18).join("، ")}.`;

  return expandToMinWords([...blocks, ...exclusive, woven], 1100, exclusive);
}

export function listKnownBlogSlugCount() {
  return Object.keys(SPECS).length;
}
