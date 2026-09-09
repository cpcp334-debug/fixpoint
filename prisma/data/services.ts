import type { LocaleCopy } from "./shared";
import {
  APPROVED_CATEGORIES,
  APPROVED_CHILDREN,
  LEGACY_ORPHAN_CATEGORIES,
  REVIEW_REQUIRED,
  childSchemaData,
  childSlug,
  serviceTypeForCategory,
} from "./catalog-a1";
import { DIY_SAFETY_ALIGNMENTS_A411 } from "./diy-safety-alignment-a411";

export type ServiceSeed = {
  slug: string;
  categorySlug: string;
  sopCode?: string;
  serviceType: string;
  active: boolean;
  riskLevel: "green" | "yellow" | "red";
  diyAvailable: boolean;
  quoteMethod: "inspection" | "per_hour" | "project" | "material_labor";
  inspectionRequired: boolean;
  bookingEnabled: boolean;
  emergencyAvailable: boolean;
  amcAvailable: boolean;
  related: string[];
  questions: LocaleCopy[];
  name: LocaleCopy;
  short: LocaleCopy;
  long: LocaleCopy;
  who: LocaleCopy;
  what: LocaleCopy;
  whenPro: LocaleCopy;
  process: LocaleCopy;
  pricing: LocaleCopy;
  fallback: LocaleCopy;
  safety: LocaleCopy;
  faqs: Array<{ q: LocaleCopy; a: LocaleCopy }>;
  /** Optional JSON metadata (A1 catalogRole, REVIEW_REQUIRED flags, sortOrder). */
  schemaData?: Record<string, unknown>;
  /** true for approved taxonomy parents; false for legacy orphan categories. */
  categoryApproved?: boolean;
};

export type CategorySeed = {
  slug: string;
  sopCode: string | null;
  sortOrder: number;
  name: LocaleCopy;
  description: LocaleCopy;
  approved: boolean;
};

export const categories: CategorySeed[] = [
  ...APPROVED_CATEGORIES.map((cat) => ({
    slug: cat.slug,
    sopCode: cat.sopCode,
    sortOrder: cat.sortOrder,
    name: { en: cat.nameEn, ar: cat.nameAr },
    description: { en: cat.descriptionEn, ar: cat.nameAr === REVIEW_REQUIRED ? REVIEW_REQUIRED : "" },
    approved: true,
  })),
  ...LEGACY_ORPHAN_CATEGORIES.map((cat) => ({
    slug: cat.slug,
    sopCode: cat.sopCode,
    sortOrder: cat.sortOrder,
    name: { en: cat.nameEn, ar: cat.nameAr },
    description: { en: cat.descriptionEn, ar: "" },
    approved: false,
  })),
];

const noPrice: LocaleCopy = {
  en: "We do not publish a fixed price here because cost depends on access, materials, and what the inspection finds. Request a quote. ALNAJAH AI never invents prices. A person reviews every quotation.",
  ar: "لا ننشر سعراً ثابتاً هنا لأن التكلفة تعتمد على الوصول والمواد وما تظهره المعاينة. اطلب عرض سعر. لا يخترع ذكاء النجاح أسعاراً. يراجع شخص كل عرض.",
};

const processStandard: LocaleCopy = {
  en: "1) Tell us the problem and location. 2) Photos help when safe to take. 3) We confirm whether a site inspection is needed. 4) A person prepares the quotation. 5) After you approve, a work visit is scheduled. A requested time is not a confirmed appointment.",
  ar: "1) أخبرنا بالمشكلة والموقع. 2) الصور مفيدة إن كان التقاطها آمناً. 3) نؤكد إن كانت المعاينة لازمة. 4) يُعد شخص عرض السعر. 5) بعد موافقتك تُجدول زيارة العمل. الوقت المطلوب ليس موعداً مؤكداً.",
};

export const services: ServiceSeed[] = [
  {
    slug: "cleaning-services",
    categorySlug: "cleaning",
    serviceType: "cleaning",
    active: true,
    riskLevel: "green",
    diyAvailable: true,
    quoteMethod: "inspection",
    inspectionRequired: false,
    bookingEnabled: true,
    emergencyAvailable: false,
    amcAvailable: true,
    related: ["building-maintenance", "ac-maintenance"],
    questions: [
      { en: "Is this a home, office, or building common area?", ar: "هل المكان منزل أم مكتب أم مناطق مشتركة؟" },
      { en: "How many rooms or how large is the area, approximately?", ar: "كم عدد الغرف أو ما هو حجم المساحة تقريباً؟" },
      { en: "Is this regular cleaning or a one-time deep clean?", ar: "هل التنظيف دوري أم تنظيف عميق لمرة واحدة؟" },
    ],
    name: { en: "Cleaning Services", ar: "خدمات التنظيف" },
    short: {
      en: "Internal building and property cleaning for homes, offices, and common areas, scoped after we understand the space.",
      ar: "تنظيف داخلي للمباني والعقارات للمنازل والمكاتب والمناطق المشتركة، بعد فهم المساحة.",
    },
    long: {
      en: "Cleaning Services covers internal building cleaning: occupied homes, offices, and shared areas inside a building. The public Sharjah license listed for this activity is ALNAJAH ALDAEM BUILDING CLEANING SERVICES, license 925212 (Internal Building Cleaning Services). We do not claim facade, industrial, or specialised high-level cleaning unless that service is later activated. Tell us the property type, approximate size, and whether you need a one-off visit or a repeating schedule. Hazardous chemical procedures are not published as DIY.",
      ar: "تغطي خدمات التنظيف التنظيف الداخلي للمباني: المنازل المشغولة والمكاتب والمناطق المشتركة. الرخصة العامة في الشارقة لهذا النشاط هي ALNAJAH ALDAEM BUILDING CLEANING SERVICES رقم 925212 (تنظيف المباني الداخلي). لا ندّعي تنظيف الواجهات أو التنظيف الصناعي أو التنظيف على ارتفاعات عالية ما لم تُفعَّل تلك الخدمة لاحقاً. أخبرنا بنوع العقار والحجم التقريبي وما إذا كنت تحتاج زيارة واحدة أو جدولاً متكرراً. لا ننشر إجراءات كيميائية خطرة كأعمال منزلية.",
    },
    who: {
      en: "Residents, office occupiers, and building supervisors who need internal cleaning. Not a substitute for licensed healthcare or industrial decontamination.",
      ar: "السكان ومستأجرو المكاتب ومشرفو المباني الذين يحتاجون تنظيفاً داخلياً. ليست بديلاً عن إزالة التلوث الطبي أو الصناعي المرخّص.",
    },
    what: {
      en: "We discuss scope (rooms, kitchens, bathrooms, common corridors), frequency, and access. A written quote follows human review. Recurring visits can be discussed as an AMC-style schedule later.",
      ar: "نناقش النطاق (الغرف والمطابخ والحمامات والممرات المشتركة) والتكرار وسهولة الوصول. يصدر عرض مكتوب بعد مراجعة بشرية. يمكن مناقشة الزيارات المتكررة لاحقاً كجدول صيانة سنوية.",
    },
    whenPro: {
      en: "Choose professional cleaning for occupied buildings, post-work dust, high bathrooms, or anywhere chemicals and ladders would be unsafe for the household.",
      ar: "اختر التنظيف المهني للمباني المشغولة أو الغبار بعد الأعمال أو الحمامات المرتفعة أو حيث تكون المواد الكيميائية والسلالم غير آمنة للأسرة.",
    },
    process: processStandard,
    pricing: noPrice,
    fallback: {
      en: "If the space is large, occupied, or needs chemicals you should not handle, request a quote or WhatsApp us with photos of the rooms.",
      ar: "إذا كانت المساحة كبيرة أو مشغولة أو تحتاج مواداً لا يجب أن تتعامل معها، اطلب عرض سعر أو راسلنا عبر واتساب مع صور الغرف.",
    },
    safety: {
      en: "Do not mix bleach and acids. Do not climb without stable access. Keep children and pets away from wet floors and products.",
      ar: "لا تخلط المبيض مع الأحماض. لا تتسلق دون وصول ثابت. أبعد الأطفال والحيوانات عن الأرضيات المبللة والمنتجات.",
    },
    faqs: [
      {
        q: { en: "Do you clean in Sharjah?", ar: "هل تنظفون في الشارقة؟" },
        a: { en: "Yes. Internal building cleaning is the activity on Sharjah license 925212. Other emirates can be requested; we do not claim a cleaning license in every emirate.", ar: "نعم. تنظيف المباني الداخلي هو النشاط على رخصة الشارقة 925212. يمكن طلب الإمارات الأخرى؛ لا ندّعي رخصة تنظيف في كل إمارة." },
      },
      {
        q: { en: "Do you publish a price per square metre?", ar: "هل تنشرون سعراً للمتر المربع؟" },
        a: { en: "No. Size, access, and soil level change the quote. Ask for a human-reviewed quotation.", ar: "لا. الحجم وسهولة الوصول ودرجة الاتساخ تغيّر العرض. اطلب عرضاً يراجعه شخص." },
      },
    ],
  },
  {
    slug: "building-maintenance",
    categorySlug: "general-maintenance",
    sopCode: "SOP-016",
    serviceType: "maintenance",
    active: true,
    riskLevel: "yellow",
    diyAvailable: true,
    quoteMethod: "inspection",
    inspectionRequired: true,
    bookingEnabled: true,
    emergencyAvailable: false,
    amcAvailable: true,
    related: ["plumbing-maintenance", "electrical-maintenance", "painting-services"],
    questions: [
      { en: "What is not working, and in which room or area?", ar: "ما الذي لا يعمل، وفي أي غرفة أو منطقة؟" },
      { en: "Is this a villa, apartment, or commercial unit?", ar: "هل العقار فيلا أم شقة أم وحدة تجارية؟" },
      { en: "When did you first notice the issue?", ar: "متى لاحظت المشكلة أول مرة؟" },
    ],
    name: { en: "General Building Maintenance", ar: "الصيانة العامة للمباني" },
    short: {
      en: "General repair and upkeep for residential and commercial buildings, scoped after we understand the fault.",
      ar: "إصلاح وصيانة عامة للمباني السكنية والتجارية بعد فهم العطل.",
    },
    long: {
      en: "General Building Maintenance is the starting point when several trades might be involved, or when you know something is wrong but not which specialist you need. The public Ajman license listed for building maintenance is ALNAJAH ALDAEM BUILDING MAINTENANCE, license 132954. We still ask you to describe symptoms: leaks, loose fittings, damaged finishes, or a mix. Dangerous structural work, gas, and live electrical panel work are not DIY topics and may need inspection before any quote.",
      ar: "الصيانة العامة للمباني هي نقطة البداية عندما قد تشترك عدة مهن، أو عندما تعرف أن هناك مشكلة دون تحديد التخصص. الرخصة العامة في عجمان لصيانة المباني هي ALNAJAH ALDAEM BUILDING MAINTENANCE رقم 132954. ما زلنا نطلب وصف الأعراض: تسرب أو تركيبات مرتخية أو تشطيبات تالفة أو مزيج منها. الأعمال الإنشائية الخطرة والغاز ولوحات الكهرباء الحية ليست مواضيع للأعمال المنزلية وقد تحتاج معاينة قبل أي عرض.",
    },
    who: {
      en: "Homeowners, tenants (with landlord permission), and facility contacts who need mixed small-to-medium building repairs.",
      ar: "ملاك المنازل والمستأجرون (بإذن المالك) ومسؤولو المرافق الذين يحتاجون إصلاحات مباني متنوعة صغيرة إلى متوسطة.",
    },
    what: {
      en: "We classify the request, ask targeted questions, and recommend plumbing, electrical, AC, painting, wall repair, or a combined visit. Inspection is often required before a final quotation.",
      ar: "نصنّف الطلب ونسأل أسئلة محددة ونرشح السباكة أو الكهرباء أو التكييف أو الدهان أو إصلاح الجدران أو زيارة مشتركة. غالباً ما تلزم المعاينة قبل العرض النهائي.",
    },
    whenPro: {
      en: "Call a professional if you smell gas, see sparks, have active flooding, or suspect structural movement. Those are not DIY jobs.",
      ar: "اتصل بفني إذا شممت غازاً أو رأيت شرراً أو كان هناك غمر بالمياه أو اشتبهت بحركة إنشائية. هذه ليست أعمالاً منزلية.",
    },
    process: processStandard,
    pricing: noPrice,
    fallback: {
      en: "If several rooms are affected or the cause is unclear, request a site inspection rather than guessing the trade.",
      ar: "إذا تأثرت عدة غرف أو كان السبب غير واضح، اطلب معاينة موقع بدل تخمين التخصص.",
    },
    safety: {
      en: "Do not enter flooded areas with electrical devices. Do not open electrical panels. Ventilate if you smell chemicals or gas and leave the area.",
      ar: "لا تدخل مناطق مغمورة بأجهزة كهربائية. لا تفتح لوحات الكهرباء. هوِّئ المكان إذا شممت مواداً كيميائية أو غازاً واخرج.",
    },
    faqs: [
      {
        q: { en: "Is maintenance licensed in Ajman?", ar: "هل الصيانة مرخّصة في عجمان؟" },
        a: { en: "Building maintenance is the activity on Ajman license 132954. Enquiries from other emirates are accepted; we do not list a maintenance license for every emirate.", ar: "صيانة المباني هي النشاط على رخصة عجمان 132954. نستقبل طلبات من إمارات أخرى؛ لا نعرض رخصة صيانة لكل إمارة." },
      },
    ],
  },
  {
    slug: "plumbing-maintenance",
    categorySlug: "plumbing",
    sopCode: "SOP-017",
    serviceType: "maintenance",
    active: true,
    riskLevel: "yellow",
    diyAvailable: true,
    quoteMethod: "inspection",
    inspectionRequired: true,
    bookingEnabled: true,
    emergencyAvailable: false,
    amcAvailable: true,
    related: ["building-maintenance", "wall-maintenance", "cleaning-services"],
    questions: [
      { en: "Where is the water appearing — ceiling, wall, floor, or fixture?", ar: "أين يظهر الماء — السقف أم الجدار أم الأرض أم القطعة الصحية؟" },
      { en: "Is the water clean, rusty, or sewage-smelling?", ar: "هل الماء نظيف أم صدئ أم برائحة صرف؟" },
      { en: "Can you shut the local isolation valve safely?", ar: "هل يمكنك إغلاق محبس العزل المحلي بأمان؟" },
    ],
    name: { en: "Plumbing Maintenance", ar: "صيانة السباكة" },
    short: {
      en: "Leaks, blockages, and sanitary fittings. Simple dripping taps may have a DIY guide; hidden leaks usually need a technician.",
      ar: "التسربات والانسداد والقطع الصحية. الحنفية التي تقطر قد يكون لها دليل منزلي؛ التسرب المخفي يحتاج فنياً عادة.",
    },
    long: {
      en: "Plumbing Maintenance covers dripping taps, running cisterns, slow drains, and visible leaks. A bathroom leak can also be a waterproofing or seal failure — ALNAJAH AI will not tell you it is definitely one cause. Gas pipe work is out of DIY scope. Major hidden leaks, sewage backups, and work inside slabs typically need inspection. We do not publish prices; quotes follow what is found on site.",
      ar: "تغطي صيانة السباكة الحنفيات التي تقطر وخزانات الطرد التي لا تتوقف والصرف البطيء والتسرب الظاهر. تسرب الحمام قد يكون أيضاً عازلاً أو فشل مانع تسرب — لن يقول ذكاء النجاح إن السبب مؤكد. أعمال أنابيب الغاز خارج نطاق الأعمال المنزلية. التسربات المخفية الكبيرة ورجوع الصرف والعمل داخل البلاطات تحتاج معاينة عادة. لا ننشر أسعاراً؛ العروض تتبع ما يُكتشف في الموقع.",
    },
    who: {
      en: "Anyone with a water or drain problem in a home, office, or building — after they have stopped obvious flooding if it is safe to do so.",
      ar: "أي شخص لديه مشكلة مياه أو صرف في منزل أو مكتب أو مبنى — بعد إيقاف الغمر الظاهر إن كان ذلك آمناً.",
    },
    what: {
      en: "We ask where water appears, whether valves can be shut, and whether photos show the fitting or the stain. Then we recommend DIY only for low-risk tap work, or a professional visit.",
      ar: "نسأل أين يظهر الماء وهل يمكن إغلاق المحابس وهل الصور تظهر القطعة أم البقع. ثم نرشح أعمالاً منزلية فقط للحنفية منخفضة الخطورة، أو زيارة مهنية.",
    },
    whenPro: {
      en: "Stop DIY and book a technician for ceiling leaks, sewage smells, burst pipes, water near electrics, or any gas-related smell.",
      ar: "أوقف الأعمال المنزلية واحجز فنياً لتسرب السقف أو رائحة الصرف أو انفجار الأنابيب أو الماء قرب الكهرباء أو أي رائحة غاز.",
    },
    process: processStandard,
    pricing: noPrice,
    fallback: {
      en: "If water is near lights or sockets, isolate power only if you can do so safely at a known switch, keep clear, and request urgent professional help.",
      ar: "إذا كان الماء قرب إضاءة أو أفياش، اقطع الكهرباء فقط إن أمكن من مفتاح معروف بأمان، وابتعد، واطلب مساعدة مهنية عاجلة.",
    },
    safety: {
      en: "No gas work. No chemical drain openers we have not specified. Do not break tiles to chase a leak yourself.",
      ar: "لا أعمال غاز. لا تستخدم فاتحات صرف كيميائية لم نحددها. لا تكسر البلاط لتتبع التسرب بنفسك.",
    },
    faqs: [
      {
        q: { en: "Can I fix a dripping faucet myself?", ar: "هل أصلح حنفية تقطر بنفسي؟" },
        a: { en: "Sometimes, if you can isolate the tap and follow the DIY guide. Stop if the valve will not close or parts are corroded.", ar: "أحياناً، إذا استطعت عزل الحنفية واتباع الدليل. توقف إذا لم يُغلق المحبس أو كانت القطع متآكلة." },
      },
    ],
  },
  {
    slug: "electrical-maintenance",
    categorySlug: "electrical",
    sopCode: "SOP-018",
    serviceType: "maintenance",
    active: true,
    riskLevel: "red",
    diyAvailable: false,
    quoteMethod: "inspection",
    inspectionRequired: true,
    bookingEnabled: true,
    emergencyAvailable: false,
    amcAvailable: true,
    related: ["building-maintenance", "ac-maintenance"],
    questions: [
      { en: "Is a breaker tripping, or is a fixture dead?", ar: "هل القاطع يفصل أم أن نقطة غير تعمل؟" },
      { en: "Do you smell burning or see scorch marks?", ar: "هل تشم احتراقاً أو ترى آثار حرق؟" },
      { en: "Which rooms lost power?", ar: "أي الغرف فقدت الكهرباء؟" },
    ],
    name: { en: "Electrical Maintenance", ar: "صيانة الكهرباء" },
    short: {
      en: "Professional electrical repair and inspection. We do not publish live-electrical DIY steps.",
      ar: "إصلاح ومعاينة كهربائية مهنية. لا ننشر خطوات لأعمال كهرباء حية.",
    },
    long: {
      en: "Electrical Maintenance is a high-risk category. We can help you describe symptoms (tripping breakers, dead sockets, flickering lights) and arrange a technician. We will not give step-by-step instructions for live wiring, panel work, or meter work. If you see scorch marks, smell burning, or water is near electrics, keep clear and request professional help. Quotations follow inspection; we do not invent prices.",
      ar: "صيانة الكهرباء فئة عالية الخطورة. يمكننا مساعدتك على وصف الأعراض (قواطع تفصل أو أفياش ميتة أو إضاءة تومض) وترتيب فني. لن نعطي خطوات لتوصيل أسلاك حية أو أعمال اللوحة أو العداد. إذا رأيت آثار حرق أو شممت احتراقاً أو كان الماء قرب الكهرباء، ابتعد واطلب مساعدة مهنية. العروض تتبع المعاينة؛ لا نخترع أسعاراً.",
    },
    who: {
      en: "Property users who have an electrical symptom and need a qualified person — not a DIY walkthrough.",
      ar: "مستخدمو العقار الذين لديهم عارض كهربائي ويحتاجون شخصاً مؤهلاً — وليس دليلاً منزلياً.",
    },
    what: {
      en: "Symptom intake, safety advice (what to stop doing), and a booking or quote request for a technician. No hazardous how-to content.",
      ar: "استقبال الأعراض ونصائح سلامة (ماذا تتوقف عن فعله) وطلب حجز أو عرض لفني. لا محتوى خطير لكيفية التنفيذ.",
    },
    whenPro: {
      en: "Always, for panel, wiring, and anything beyond resetting a known consumer-unit switch that you already use in daily life — and even that, only if it is labelled and familiar. When unsure, stop.",
      ar: "دائماً لأعمال اللوحة والأسلاك وأي شيء يتجاوز إعادة تشغيل مفتاح معروف تستخدمه يومياً — وحتى ذلك فقط إذا كان مسمّى ومألوفاً. إذا لم تكن متأكداً توقف.",
    },
    process: processStandard,
    pricing: noPrice,
    fallback: {
      en: "Do not open the electrical panel. Request a technician and describe what you observed.",
      ar: "لا تفتح لوحة الكهرباء. اطلب فنياً وصف ما لاحظته.",
    },
    safety: {
      en: "No live electrical DIY. No meter tampering. Keep water away. If burning smell or sparks, evacuate the room and seek professional help.",
      ar: "لا أعمال كهرباء حية منزلية. لا تعبث بالعداد. أبعد الماء. إذا وُجدت رائحة حرق أو شرر، اخرج من الغرفة واطلب مساعدة مهنية.",
    },
    faqs: [
      {
        q: { en: "Why is there no DIY electrical guide?", ar: "لماذا لا يوجد دليل كهرباء منزلي؟" },
        a: { en: "Live electrical work is treated as red-risk. We explain symptoms and when to stop, then help you book a professional.", ar: "أعمال الكهرباء الحية تُعامل كخطورة حمراء. نشرح الأعراض ومتى تتوقف، ثم نساعدك على حجز فني." },
      },
    ],
  },
  {
    slug: "ac-maintenance",
    categorySlug: "ac",
    sopCode: "SOP-019",
    serviceType: "maintenance",
    active: true,
    riskLevel: "yellow",
    diyAvailable: true,
    quoteMethod: "inspection",
    inspectionRequired: true,
    bookingEnabled: true,
    emergencyAvailable: false,
    amcAvailable: true,
    related: ["electrical-maintenance", "building-maintenance", "cleaning-services"],
    questions: [
      { en: "Is the unit running but not cooling, or not running at all?", ar: "هل الوحدة تعمل دون تبريد أم لا تعمل أصلاً؟" },
      { en: "Split, window, or central / package unit?", ar: "سبليت أم شباك أم وحدة مركزية / باكيج؟" },
      { en: "Any water leaking from the indoor unit?", ar: "هل يوجد تسرب ماء من الوحدة الداخلية؟" },
    ],
    name: { en: "AC / Air Conditioning Maintenance", ar: "صيانة التكييف" },
    short: {
      en: "Filter cleaning can be DIY when safe. Refrigerant handling and electrical faults need a technician.",
      ar: "تنظيف الفلتر يمكن أن يكون منزلياً إن كان آمناً. التعامل مع وسيط التبريد والأعطال الكهربائية يحتاج فنياً.",
    },
    long: {
      en: "AC Maintenance in the UAE is mostly about cooling performance, dirty filters, blocked drains, and outdoor-unit airflow. A basic filter clean is documented in our DIY section. We do not provide instructions for refrigerant charging, recovery, or sealed-system work. Electrical faults on AC equipment follow the same red-risk rule as other electrical work. Summer demand is high; we still will not invent wait times or prices.",
      ar: "صيانة التكييف في الإمارات غالباً حول أداء التبريد والفلاتر المتسخة وتصريف الماء المسدود وتدفق الهواء للوحدة الخارجية. تنظيف الفلتر الأساسي موثّق في قسم الإرشاد المنزلي. لا نقدّم تعليمات لشحن أو سحب وسيط التبريد أو أعمال الدائرة المغلقة. الأعطال الكهربائية في أجهزة التكييف تتبع نفس قاعدة الخطورة الحمراء. الطلب صيفاً مرتفع؛ ومع ذلك لن نخترع أوقات انتظار أو أسعاراً.",
    },
    who: {
      en: "Homes and offices with split or package units that are noisy, leaking, or not cooling as expected.",
      ar: "منازل ومكاتب بوحدات سبليت أو باكيج تصدر ضوضاء أو تسرباً أو لا تبرد كما يُتوقع.",
    },
    what: {
      en: "Intake questions, optional filter DIY, then professional servicing, drain clearing, or inspection-based repair. Refrigerant work is professional-only.",
      ar: "أسئلة استقبال، وخيار تنظيف الفلتر منزلياً، ثم صيانة مهنية أو تنظيف التصريف أو إصلاح بعد معاينة. أعمال وسيط التبريد مهنية فقط.",
    },
    whenPro: {
      en: "Ice on pipes, burning smell, sparking, refrigerant hiss, or units at unsafe height — book a technician. Do not stand on unstable furniture to reach a high indoor unit.",
      ar: "جليد على الأنابيب أو رائحة حرق أو شرر أو صوت تسرب وسيط أو وحدات على ارتفاع غير آمن — احجز فنياً. لا تقف على أثاث غير ثابت للوصول لوحدة داخلية مرتفعة.",
    },
    process: processStandard,
    pricing: noPrice,
    fallback: {
      en: "If cooling failed after you already cleaned an accessible filter, request a professional service visit rather than adding chemicals or opening the sealed system.",
      ar: "إذا فشل التبريد بعد تنظيف فلتر يمكن الوصول إليه، اطلب زيارة صيانة مهنية بدل إضافة مواد أو فتح الدائرة المغلقة.",
    },
    safety: {
      en: "No refrigerant handling. Isolate power before removing an accessible filter if the manufacturer requires it. No work at dangerous height.",
      ar: "لا تعامل مع وسيط التبريد. اقطع الكهرباء قبل إزالة فلتر يمكن الوصول إليه إذا طلب المصنّع ذلك. لا عمل على ارتفاع خطر.",
    },
    faqs: [
      {
        q: { en: "AC not cooling — is it always gas?", ar: "التكييف لا يبرد — هل هو دائماً نقص غاز؟" },
        a: { en: "No. Dirty filters, blocked drains, airflow, and electrical faults are also common. We will not say it is definitely refrigerant without inspection.", ar: "لا. الفلاتر المتسخة والتصريف المسدود وتدفق الهواء والأعطال الكهربائية شائعة أيضاً. لن نقول إنه وسيط تبريد حتماً دون معاينة." },
      },
    ],
  },
  {
    slug: "painting-services",
    categorySlug: "painting",
    sopCode: "SOP-020",
    serviceType: "finishes",
    active: true,
    riskLevel: "green",
    diyAvailable: true,
    quoteMethod: "inspection",
    inspectionRequired: true,
    bookingEnabled: true,
    emergencyAvailable: false,
    amcAvailable: false,
    related: ["wall-maintenance", "building-maintenance", "cleaning-services"],
    questions: [
      { en: "Interior, exterior, or both?", ar: "داخلي أم خارجي أم كلاهما؟" },
      { en: "Roughly how many rooms or what wall area?", ar: "كم عدد الغرف تقريباً أو ما مساحة الجدران؟" },
      { en: "Are there cracks, damp stains, or peeling now?", ar: "هل توجد تشققات أو بقع رطوبة أو تقشير الآن؟" },
    ],
    name: { en: "Painting Services", ar: "خدمات الدهان" },
    short: {
      en: "Interior painting for rooms and common areas. Exterior and high work needs a professional assessment.",
      ar: "دهان داخلي للغرف والمناطق المشتركة. الأعمال الخارجية والمرتفعة تحتاج تقييماً مهنياً.",
    },
    long: {
      en: "Painting Services covers interior walls and ceilings where access is safe. UAE coastal humidity and AC condensation can cause peeling if damp is not addressed first — painting over active moisture is not a lasting fix. We do not publish prices per square foot here because surface condition, colours, and access change the quote. Dangerous height and facade work are professional-only and may stay out of scope until assessed.",
      ar: "تغطي خدمات الدهان الجدران والأسقف الداخلية عندما يكون الوصول آمناً. رطوبة الساحل وتكثف التكييف في الإمارات قد يسببان تقشيراً إذا لم تُعالج الرطوبة أولاً — الدهان فوق رطوبة نشطة ليس حلاً دائماً. لا ننشر سعراً للقدم المربع هنا لأن حالة السطح والألوان وسهولة الوصول تغيّر العرض. العمل على ارتفاع خطر وأعمال الواجهات مهنية فقط وقد تبقى خارج النطاق حتى التقييم.",
    },
    who: {
      en: "Homes and offices needing refresh painting, stain covering after repairs, or colour changes — after moisture issues are understood.",
      ar: "منازل ومكاتب تحتاج دهاناً تجديدياً أو تغطية بقع بعد إصلاح أو تغييراً للون — بعد فهم مشاكل الرطوبة.",
    },
    what: {
      en: "We ask about area, height, current defects, and whether furniture protection is needed. Inspection is typical before a project quotation.",
      ar: "نسأل عن المساحة والارتفاع والعيوب الحالية وما إذا كانت حماية الأثاث لازمة. المعاينة معتادة قبل عرض المشروع.",
    },
    whenPro: {
      en: "High ceilings, exterior elevations, lead-concern unknown old coatings, or damp that keeps returning should not be treated as a weekend DIY job.",
      ar: "الأسقف العالية والواجهات الخارجية والدهانات القديمة غير المعروفة أو الرطوبة المتكررة لا تُعامل كعمل منزلي لعطلة نهاية الأسبوع.",
    },
    process: processStandard,
    pricing: noPrice,
    fallback: {
      en: "If walls are cracking or staining after rain or AC leaks, fix the moisture source with the right trade first, then paint.",
      ar: "إذا كانت الجدران تتشقق أو تتبقع بعد المطر أو تسرب التكييف، عالج مصدر الرطوبة بالتخصص المناسب أولاً ثم ادهن.",
    },
    safety: {
      en: "Ventilate solvents. No unsafe ladders. Do not paint over live electrical accessories. Keep children away from wet coatings.",
      ar: "هوِّئ المذيبات. لا سلالم غير آمنة. لا تدهن فوق إكسسوارات كهرباء حية. أبعد الأطفال عن الدهان الرطب.",
    },
    faqs: [
      {
        q: { en: "Can you paint a whole villa?", ar: "هل تدهنون فيلا كاملة؟" },
        a: { en: "You can request it. Scope, access, and moisture must be reviewed by a person before a quotation.", ar: "يمكنك طلب ذلك. يجب أن يراجع شخص النطاق والوصول والرطوبة قبل عرض السعر." },
      },
    ],
  },
  {
    slug: "wall-maintenance",
    categorySlug: "walls",
    sopCode: "SOP-021",
    serviceType: "maintenance",
    active: true,
    riskLevel: "yellow",
    diyAvailable: true,
    quoteMethod: "inspection",
    inspectionRequired: true,
    bookingEnabled: true,
    emergencyAvailable: false,
    amcAvailable: false,
    related: ["painting-services", "plumbing-maintenance", "building-maintenance"],
    questions: [
      { en: "Is the issue a crack, hollow plaster, damp, or impact damage?", ar: "هل المشكلة شق أم محارة مجوفة أم رطوبة أم ضرر صدمة؟" },
      { en: "Interior or exterior wall?", ar: "جدار داخلي أم خارجي؟" },
      { en: "Is the crack getting wider or staying the same?", ar: "هل الشق يتسع أم بقي كما هو؟" },
    ],
    name: { en: "Wall Maintenance & Repair", ar: "صيانة وإصلاح الجدران" },
    short: {
      en: "Plaster, small cracks, and surface repairs. Structural movement and major demolition are professional-only.",
      ar: "المحارة والشقوق الصغيرة وإصلاح الأسطح. الحركة الإنشائية والهدم الكبير مهنيان فقط.",
    },
    long: {
      en: "Wall Maintenance & Repair covers loose plaster, hairline cracks, and making good after other trades. In the UAE, some stains are AC or plumbing related rather than the wall itself. We will not instruct structural demolition or tell you a crack is definitely non-structural without inspection. Dangerous work at height on external walls is not DIY.",
      ar: "تغطي صيانة وإصلاح الجدران المحارة المرتخية والشقوق الشعرية والإصلاح بعد أعمال أخرى. في الإمارات بعض البقع سببها التكييف أو السباكة لا الجدار نفسه. لن نوجّه هدماً إنشائياً ولن نقول إن الشق غير إنشائي حتماً دون معاينة. العمل الخطير على ارتفاع للجدران الخارجية ليس منزلياً.",
    },
    who: {
      en: "Occupiers who see cracks, hollow sounds, or damaged finishes and need to know whether paint, plaster, plumbing, or inspection comes first.",
      ar: "الشاغلون الذين يرون شقوقاً أو فراغاً تحت المحارة أو تشطيباً تالفاً ويحتاجون معرفة ما إذا كان الدهان أو المحارة أو السباكة أو المعاينة أولاً.",
    },
    what: {
      en: "Classify cosmetic versus possible moisture or movement. Small making-good can follow a quote; structural concerns go to inspection with no DIY repair steps.",
      ar: "نفرّق بين التجميلي واحتمال الرطوبة أو الحركة. الإصلاح الصغير يمكن أن يلي عرض سعر؛ المخاوف الإنشائية تذهب للمعاينة دون خطوات إصلاح منزلية.",
    },
    whenPro: {
      en: "Doors that suddenly stick, widening cracks, cracks across slabs, or any suspected structural damage — stop and request inspection.",
      ar: "أبواب تعلق فجأة أو شقوق تتسع أو شقوق عبر البلاطات أو أي ضرر إنشائي مشتبه — توقف واطلب معاينة.",
    },
    process: processStandard,
    pricing: noPrice,
    fallback: {
      en: "Photograph the crack with a scale (for example a coin) and request inspection rather than filling a crack that keeps opening.",
      ar: "صوّر الشق مع مقياس (مثل عملة) واطلب معاينة بدل ملء شق يستمر بالفتح.",
    },
    safety: {
      en: "No structural demolition DIY. Wear eye protection for loose plaster. Avoid cutting into walls where electrical or water lines may run.",
      ar: "لا هدم إنشائي منزلي. ارتدِ حماية للعينين عند المحارة المرتخية. تجنب القطع في جدران قد تمر فيها أسلاك أو مواسير.",
    },
    faqs: [
      {
        q: { en: "Hairline crack after first summer — is that structural?", ar: "شق شعري بعد أول صيف — هل هو إنشائي؟" },
        a: { en: "Not necessarily. Thermal movement is common. We will not confirm either way without seeing it.", ar: "ليس بالضرورة. الحركة الحرارية شائعة. لن نؤكد أياً من الاحتمالين دون رؤيته." },
      },
    ],
  },
];

const draftNames: Array<{
  slug: string;
  categorySlug: string;
  sopCode?: string;
  name: LocaleCopy;
  risk: "green" | "yellow" | "red";
  diy: boolean;
  catalogRole?: "category_anchor" | "legacy_unmapped";
  note?: string;
}> = [
  { slug: "carpentry-joinery", categorySlug: "carpentry", sopCode: "SOP-022", name: { en: "Carpentry & Joinery", ar: "النجارة والتركيبات الخشبية" }, risk: "yellow", diy: true, catalogRole: "legacy_unmapped" },
  { slug: "flooring-tiling", categorySlug: "flooring", sopCode: "SOP-023", name: { en: "Flooring & Tiling", ar: "الأرضيات والبلاط" }, risk: "yellow", diy: true, catalogRole: "legacy_unmapped" },
  { slug: "waterproofing-sealing", categorySlug: "waterproofing", sopCode: "SOP-024", name: { en: "Waterproofing & Sealing", ar: "العزل المائي والإحكام" }, risk: "red", diy: false, catalogRole: "legacy_unmapped" },
  { slug: "roof-exterior-maintenance", categorySlug: "roof-exterior", sopCode: "SOP-025", name: { en: "Roof & Exterior Maintenance", ar: "صيانة الأسطح والواجهات" }, risk: "red", diy: false, catalogRole: "legacy_unmapped" },
  { slug: "bathroom-maintenance", categorySlug: "bath-kitchen", name: { en: "Bathroom Maintenance", ar: "صيانة الحمامات" }, risk: "yellow", diy: true, catalogRole: "legacy_unmapped" },
  { slug: "kitchen-maintenance", categorySlug: "bath-kitchen", name: { en: "Kitchen Maintenance", ar: "صيانة المطابخ" }, risk: "yellow", diy: true, catalogRole: "legacy_unmapped" },
  { slug: "doors-windows", categorySlug: "openings", name: { en: "Doors & Windows", ar: "الأبواب والنوافذ" }, risk: "yellow", diy: true, catalogRole: "legacy_unmapped" },
  { slug: "preventive-maintenance", categorySlug: "preventive", name: { en: "Preventive Maintenance", ar: "الصيانة الوقائية" }, risk: "yellow", diy: false, catalogRole: "legacy_unmapped" },
  { slug: "emergency-maintenance", categorySlug: "preventive", name: { en: "Emergency Maintenance", ar: "صيانة الطوارئ" }, risk: "red", diy: false, catalogRole: "legacy_unmapped" },
  { slug: "demolition-dismantling", categorySlug: "specialist", name: { en: "Demolition & Dismantling", ar: "الهدم والتفكيك" }, risk: "red", diy: false, catalogRole: "legacy_unmapped" },
  { slug: "swimming-pool-maintenance", categorySlug: "swimming-pool", name: { en: "Swimming Pool Cleaning & Maintenance", ar: "تنظيف وصيانة المسابح" }, risk: "yellow", diy: false, catalogRole: "category_anchor" },
  { slug: "water-tank-cleaning", categorySlug: "water-tank", name: { en: "Water Tank Cleaning & Maintenance", ar: "تنظيف وصيانة خزانات المياه" }, risk: "yellow", diy: false, catalogRole: "category_anchor" },
  {
    slug: "sauna-maintenance",
    categorySlug: "sauna",
    name: { en: "Sauna Room Maintenance & Cleaning", ar: "صيانة وتنظيف غرف الساونا" },
    risk: "yellow",
    diy: false,
    catalogRole: "category_anchor",
    note: "Word-order only vs approved parent Sauna Room Cleaning & Maintenance",
  },
  { slug: "home-appliance-maintenance", categorySlug: "appliances", name: { en: "Home Appliance Maintenance", ar: "صيانة الأجهزة المنزلية" }, risk: "yellow", diy: false, catalogRole: "legacy_unmapped" },
  { slug: "gym-cleaning-maintenance", categorySlug: "gym", name: { en: "Gym Cleaning & Maintenance", ar: "تنظيف وصيانة الصالات الرياضية" }, risk: "yellow", diy: false, catalogRole: "category_anchor" },
  { slug: "oven-cooker-maintenance", categorySlug: "appliances", name: { en: "Oven & Cooker Maintenance", ar: "صيانة الأفران والطباخات" }, risk: "red", diy: false, catalogRole: "legacy_unmapped" },
  { slug: "kitchen-appliance-maintenance", categorySlug: "appliances", name: { en: "Kitchen Appliance Maintenance", ar: "صيانة أجهزة المطبخ" }, risk: "yellow", diy: false, catalogRole: "legacy_unmapped" },
];

for (const item of draftNames) {
  services.push({
    slug: item.slug,
    categorySlug: item.categorySlug,
    sopCode: item.sopCode,
    serviceType: "maintenance",
    active: false,
    riskLevel: item.risk,
    diyAvailable: item.diy,
    quoteMethod: "inspection",
    inspectionRequired: true,
    bookingEnabled: true,
    emergencyAvailable: item.slug === "emergency-maintenance",
    amcAvailable: item.slug === "preventive-maintenance",
    related: [],
    questions: [{ en: "Describe the issue and the property type.", ar: "صف المشكلة ونوع العقار." }],
    name: item.name,
    short: {
      en: `${item.name.en} is in the catalog as draft and is not offered publicly until it is activated.`,
      ar: `${item.name.ar} موجودة في الكتالوج كمسودة ولا تُعرض للعامة حتى يتم تفعيلها.`,
    },
    long: {
      en: `${item.name.en} exists so the platform can activate it later from the database without restructuring routes. It is not indexable and not customer-facing while status is draft.`,
      ar: `${item.name.ar} موجودة حتى يمكن تفعيلها لاحقاً من قاعدة البيانات دون إعادة هيكلة المسارات. غير قابلة للفهرسة وغير ظاهرة للعملاء ما دامت مسودة.`,
    },
    who: { en: "Not publicly offered yet.", ar: "غير معروضة للعامة بعد." },
    what: { en: "Not publicly offered yet.", ar: "غير معروضة للعامة بعد." },
    whenPro: { en: "Not publicly offered yet.", ar: "غير معروضة للعامة بعد." },
    process: processStandard,
    pricing: noPrice,
    fallback: {
      en: "This service is not active. Choose an active service or contact us with your requirement.",
      ar: "هذه الخدمة غير مفعّلة. اختر خدمة مفعّلة أو تواصل معنا بوصف احتياجك.",
    },
    safety: {
      en: item.risk === "red" ? "This category is treated as high risk. No DIY repair instructions will be published if it is activated." : "Safety notes will be completed before public activation.",
      ar: item.risk === "red" ? "هذه الفئة عالية الخطورة. لن تُنشر تعليمات إصلاح منزلية إذا فُعّلت." : "ستُستكمل ملاحظات السلامة قبل التفعيل العام.",
    },
    faqs: [],
    schemaData: {
      catalogPhase: "A1",
      catalogRole: item.catalogRole || "legacy_unmapped",
      ...(item.note ? { mappingNote: item.note } : {}),
    },
  });
}

const stubAr = REVIEW_REQUIRED;
for (const child of APPROVED_CHILDREN) {
  const slug = childSlug(child);
  services.push({
    slug,
    categorySlug: child.categorySlug,
    serviceType: serviceTypeForCategory(child.categorySlug),
    active: false,
    riskLevel: "yellow",
    diyAvailable: false,
    quoteMethod: "inspection",
    inspectionRequired: true,
    bookingEnabled: true,
    emergencyAvailable: false,
    amcAvailable: false,
    related: [],
    questions: [{ en: "Describe the issue and the property type.", ar: stubAr }],
    name: { en: child.nameEn, ar: stubAr },
    short: {
      en: `${child.nameEn} is a draft catalog offering and is not publicly offered until activated.`,
      ar: stubAr,
    },
    long: {
      en: `${child.nameEn} is part of the Phase A1 master catalog under its parent category. It remains draft/non-indexable until deliberately activated.`,
      ar: stubAr,
    },
    who: { en: "Not publicly offered yet.", ar: stubAr },
    what: { en: "Not publicly offered yet.", ar: stubAr },
    whenPro: { en: "Not publicly offered yet.", ar: stubAr },
    process: processStandard,
    pricing: noPrice,
    fallback: {
      en: "This service is not active. Choose an active service or contact us with your requirement.",
      ar: stubAr,
    },
    safety: {
      en: "Safety notes and DIY classification require human review before public activation.",
      ar: stubAr,
    },
    faqs: [],
    schemaData: childSchemaData(child),
  });
}

/** Mark the seven public actives as category anchors in metadata (content preserved). */
for (const svc of services) {
  if (!svc.active) continue;
  svc.schemaData = {
    ...(svc.schemaData || {}),
    catalogPhase: "A1",
    catalogRole: "category_anchor",
  };
}

/**
 * A4.1.1 — apply DIY matrix-authoritative Class A safety alignments.
 * Excludes painting-services (HUMAN_REVIEW_REQUIRED) and does not create missing hubs.
 * Never downgrades risk; seed must match DB after reconciliation.
 */
for (const svc of services) {
  const alignment = DIY_SAFETY_ALIGNMENTS_A411[svc.slug];
  if (!alignment) continue;
  const rank = { green: 0, yellow: 1, red: 2 } as const;
  if (rank[alignment.riskLevel] < rank[svc.riskLevel]) {
    throw new Error(
      `A4.1.1 refused downward risk for ${svc.slug}: ${svc.riskLevel} → ${alignment.riskLevel}`,
    );
  }
  if (alignment.diyAvailable && !svc.diyAvailable) {
    throw new Error(`A4.1.1 refused diyAvailable true upgrade for ${svc.slug}`);
  }
  svc.riskLevel = alignment.riskLevel;
  svc.diyAvailable = alignment.diyAvailable;
  svc.schemaData = {
    ...(svc.schemaData || {}),
    diySafetyAlignment: "A4.1.1",
    diySafetyReason: "diy_matrix_authoritative",
  };
}
