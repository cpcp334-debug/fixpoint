import type { EffectiveOps } from "./types";
import type { LocationType } from "@prisma/client";
import {
  emptyAeo,
  emptyDiy,
  emptyExpert,
  emptyGeo,
  emptyMain,
  type AeoContentBlock,
  type DiyContentBlock,
  type ExpertCtaBlock,
  type FaqContentItem,
  type GeoContentBlock,
  type MainContentBlock,
  type ServiceLocationContentJson,
} from "./content-contract";
import type { DiySafetyClass } from "./types";

export type LocationNode = {
  slug: string;
  type: LocationType;
  name: string;
};

/** Build GEO block from structured location chain only — no invented claims. */
export function buildGeoContent(args: {
  chain: LocationNode[];
  localInfo?: string;
  approvedLocalContext?: string;
  covered: boolean;
  serviceName: string;
  locationName: string;
  locale: "en" | "ar";
}): GeoContentBlock {
  const geo = emptyGeo();
  geo.emirate = args.chain.find((c) => c.type === "emirate")?.name ?? "";
  geo.city = args.chain.find((c) => c.type === "city")?.name ?? "";
  geo.community = args.chain.find((c) => c.type === "community")?.name ?? "";
  geo.localInfo = (args.localInfo ?? "").trim();
  geo.approvedLocalContext = (args.approvedLocalContext ?? "").trim();
  geo.coverageStatement = args.covered
    ? args.locale === "ar"
      ? `${args.serviceName} مدرجة كتغطية في ${args.locationName} حسب البيانات التشغيلية المعتمدة.`
      : `${args.serviceName} is listed as covered in ${args.locationName} according to approved operational data.`
    : args.locale === "ar"
      ? `التغطية في ${args.locationName} غير مؤكدة لهذه الخدمة.`
      : `Coverage in ${args.locationName} is not confirmed for this service.`;
  return geo;
}

/** Build AEO answers from stored/approved facts — no LLM. */
export function buildAeoContent(args: {
  locale: "en" | "ar";
  serviceName: string;
  locationName: string;
  serviceShort: string;
  whenProfessional: string;
  diySafety: DiySafetyClass;
  diyQuickAnswer?: string;
  diyWhenToStop?: string;
  diyVisible: boolean;
  ops: EffectiveOps;
  covered: boolean;
  overrides?: Partial<AeoContentBlock>;
}): AeoContentBlock {
  const isAr = args.locale === "ar";
  const base = emptyAeo();
  base.whatIs =
    args.serviceShort.trim() ||
    (isAr ? `خدمة ${args.serviceName}.` : `${args.serviceName} service.`);
  base.directAnswer =
    args.overrides?.directAnswer?.trim() ||
    (isAr
      ? `${args.serviceName} في ${args.locationName}: ${base.whatIs}`
      : `${args.serviceName} in ${args.locationName}: ${base.whatIs}`);
  base.canIDoIt = !args.diyVisible
    ? args.diySafety === "RED" || args.diySafety === "REVIEW_REQUIRED"
      ? isAr
        ? "لا يُنصح بالإصلاح الذاتي. اطلب فنيًا."
        : "Do-it-yourself repair is not recommended. Request a professional."
      : isAr
        ? "دليل DIY غير متاح حاليًا."
        : "A DIY guide is not available right now."
    : args.diyQuickAnswer?.trim() ||
      (isAr ? "اتبع الدليل المعتمد وتوقف عند أي خطر." : "Follow the approved guide and stop if unsafe.");
  base.whenCallProfessional =
    args.whenProfessional.trim() ||
    args.diyWhenToStop?.trim() ||
    (isAr ? "اطلب فنيًا عند الشك أو الخطر." : "Call a professional when unsure or unsafe.");
  base.availabilityAnswer = args.covered
    ? isAr
      ? `نعم، التغطية مدرجة في ${args.locationName}.`
      : `Yes — coverage is listed in ${args.locationName}.`
    : isAr
      ? `التغطية غير مؤكدة في ${args.locationName}.`
      : `Coverage is not confirmed in ${args.locationName}.`;
  base.bookingAnswer = args.ops.bookingEnabled
    ? isAr
      ? "نعم، يمكن إرسال طلب حجز."
      : "Yes — you can submit a booking request."
    : isAr
      ? "الحجز غير مفعّل. اطلب عرض سعر."
      : "Booking is not enabled. Request a quote.";
  base.emergencyAnswer = args.ops.emergencyAvailable
    ? isAr
      ? "الطوارئ متاحة حسب إعدادات الخدمة."
      : "Emergency is available according to service settings."
    : isAr
      ? "الطوارئ غير مؤكدة لهذه الخدمة."
      : "Emergency is not confirmed for this service.";
  base.amcAnswer = args.ops.amcAvailable
    ? isAr
      ? "AMC متاح حسب إعدادات الخدمة."
      : "AMC is available according to service settings."
    : isAr
      ? "AMC غير متاح حاليًا."
      : "AMC is not available right now.";
  return { ...base, ...args.overrides };
}

/**
 * Ensure every public service×location page has a meaningful DIY/self-help block.
 * Safety-class aware: GREEN may include limited steps; YELLOW checks only; RED/RR observation + escalate.
 * Does not invent coverage, branches, or hazardous repair procedures.
 */
export function formatDiySelfHelpBodySection(args: {
  diy: DiyContentBlock;
  locale: "en" | "ar";
}): string {
  const isAr = args.locale === "ar";
  const heading = isAr ? "## ما يمكنك فحصه بأمان بنفسك" : "## What you can safely check yourself";
  const notHeading = isAr ? "### ما يجب تجنبه" : "### What not to do";
  const stopHeading = isAr ? "### متى تتوقف وتتصل بمختص" : "### When to stop and call a professional";
  const lines: string[] = [heading, ""];
  for (const c of args.diy.safeSelfChecks) lines.push(`- ${c}`);
  if (args.diy.steps.length && (args.diy.safetyState === "GREEN" || args.diy.safetyState === "YELLOW")) {
    lines.push("");
    for (const s of args.diy.steps) lines.push(`- ${s}`);
  }
  if (args.diy.whatNotToDo.length || args.diy.safetyNotes.length) {
    lines.push("", notHeading, "");
    for (const x of [...args.diy.whatNotToDo, ...args.diy.safetyNotes]) lines.push(`- ${x}`);
  }
  if (args.diy.stopConditions.length || args.diy.professionalFallback) {
    lines.push("", stopHeading, "");
    for (const x of args.diy.stopConditions) lines.push(`- ${x}`);
    if (args.diy.professionalFallback) lines.push("", args.diy.professionalFallback);
  }
  return lines.join("\n").trim();
}

export const DIY_SELF_HELP_MARKER_EN = "## What you can safely check yourself";
export const DIY_SELF_HELP_MARKER_AR = "## ما يمكنك فحصه بأمان بنفسك";

export function bodyHasDiySelfHelp(body: string, locale: "en" | "ar") {
  return locale === "ar" ? body.includes(DIY_SELF_HELP_MARKER_AR) : body.includes(DIY_SELF_HELP_MARKER_EN);
}

export function ensureDiySelfHelpSection(args: {
  existing: DiyContentBlock | null | undefined;
  safetyState: DiySafetyClass;
  serviceName: string;
  locale: "en" | "ar";
  guideSlug?: string | null;
}): DiyContentBlock {
  const ex = args.existing;
  const hasUseful =
    !!ex &&
    ((ex.safeSelfChecks?.length || 0) > 0 ||
      (ex.steps?.length || 0) > 0 ||
      Boolean(ex.professionalFallback?.trim()) ||
      (ex.whatNotToDo?.length || 0) > 0 ||
      (ex.safetyNotes?.length || 0) > 0);
  if (hasUseful && ex) {
    return buildDiyContentBlocks({
      safetyState: args.safetyState,
      guideSlug: args.guideSlug ?? ex.canonicalGuideSlug,
      professionalFallback: ex.professionalFallback,
      safeSelfChecks: ex.safeSelfChecks,
      tools: ex.tools,
      steps: ex.steps,
      stopConditions: ex.stopConditions,
      whatNotToDo: ex.whatNotToDo,
      safetyNotes: ex.safetyNotes,
    });
  }

  const isAr = args.locale === "ar";
  const name = args.serviceName;
  if (args.safetyState === "RED" || args.safetyState === "REVIEW_REQUIRED") {
    return buildDiyContentBlocks({
      safetyState: args.safetyState,
      guideSlug: args.guideSlug ?? null,
      professionalFallback: isAr
        ? `اطلب مساعدة مهنية لـ${name} عبر طلب عرض السعر. لا تفتح لوحات حية أو أنظمة غاز أو تبريد.`
        : `Request professional help for ${name} via Get a Quote. Do not open live panels, gas, or refrigerant systems.`,
      safeSelfChecks: isAr
        ? [
            `من مسافة آمنة لاحظ الروائح والأصوات والحرارة الظاهرة حول ${name}.`,
            "صوّر المشكلة دون تفكيك أي غطاء مغلق.",
            "أخلِ المكان فورًا عند رائحة غاز أو شرر أو دخان أو فيضان.",
          ]
        : [
            `From a safe distance, note smells, sounds, and visible heat related to ${name}.`,
            "Photograph the issue without removing sealed covers.",
            "Leave immediately for gas smell, sparks, smoke, or flooding.",
          ],
      whatNotToDo: isAr
        ? ["لا عمل كهرباء حية", "لا عبث بصمامات الغاز", "لا تعامل مع التبريد", "لا قطع إنشائي"]
        : ["No live electrical work", "No gas valve work", "No refrigerant handling", "No structural cutting"],
      safetyNotes: isAr
        ? [`تصنيف ${args.safetyState}: إرشاد سلامة فقط لـ${name}.`]
        : [`${args.safetyState} classification: safety guidance only for ${name}.`],
      stopConditions: isAr
        ? ["أي شك في السلامة", "أغطية لا تُفتح باليد", "ماء أو حرارة غير متوقعة"]
        : ["Any safety doubt", "Covers that will not open by hand", "Unexpected water or heat"],
    });
  }

  if (args.safetyState === "YELLOW") {
    return buildDiyContentBlocks({
      safetyState: "YELLOW",
      guideSlug: args.guideSlug ?? null,
      professionalFallback: isAr
        ? `إذا استمرت أعراض ${name} بعد الفحوص الخارجية، اطلب عرض سعر.`
        : `If ${name} symptoms continue after external checks, request a quote.`,
      safeSelfChecks: isAr
        ? [
            `افحص خارجيًا فقط ما يتعلق بـ${name} دون إزالة أغطية مغلقة.`,
            "لاحظ التسرب الظاهر والروائح والاهتزاز غير المعتاد.",
            "استخدم فقط أزرار إعادة الضبط الموثّقة للمستخدم إن وُجدت.",
            "صوّر الحالة قبل طلب المساعدة المهنية.",
          ]
        : [
            `Inspect only externally for ${name} — do not remove sealed covers.`,
            "Note visible leaks, odours, and unusual vibration.",
            "Use only documented user reset controls if present.",
            "Photograph the condition before requesting professional help.",
          ],
      whatNotToDo: isAr
        ? ["لا تفتح الأنظمة المغلقة", "لا تجبر المثبتات العالقة", "لا تخلط مواد كيميائية غير متوافقة"]
        : ["Do not open sealed systems", "Do not force stuck fasteners", "Do not mix incompatible chemicals"],
      safetyNotes: isAr
        ? [`${name}: استكشاف أعطال محدود فقط (أصفر).`]
        : [`${name}: limited troubleshooting only (YELLOW).`],
      stopConditions: isAr
        ? ["حرارة أو شرر", "رائحة غاز", "ماء غير مسيطر", "تلف تشطيب"]
        : ["Heat or sparks", "Gas odour", "Uncontrolled water", "Finish damage"],
    });
  }

  // GREEN
  return buildDiyContentBlocks({
    safetyState: "GREEN",
    guideSlug: args.guideSlug ?? null,
    professionalFallback: isAr
      ? `عند التسرب إلى تجاويف أو أعطال أنظمة تتعلق بـ${name}، اطلب عرض سعر.`
      : `If cavity leaks or system faults appear around ${name}, request a quote.`,
    safeSelfChecks: isAr
      ? [
          `تأكد أن منطقة ${name} باردة وجافة وسهلة الوصول قبل أي عناية سطحية.`,
          "اختبر المنظف على حافة مخفية.",
          "اعمل بأقسام صغيرة ثم اشطف وجفف.",
        ]
      : [
          `Confirm the ${name} area is cold, dry, and user-accessible before surface care.`,
          "Spot-test cleaners on a hidden edge.",
          "Work in small sections, then rinse and dry.",
        ],
    steps: isAr
      ? [
          `نظّف المنطقة المحيطة بـ${name} من الغبار الجاف.`,
          "نفّذ مسحًا خفيفًا ثم شطفًا وتجفيفًا.",
          "وثّق النتيجة وأي علامات متبقية.",
        ]
      : [
          `Dry-clear grit around ${name}.`,
          "Apply a light clean, rinse, and dry.",
          "Document results and any remaining marks.",
        ],
    whatNotToDo: isAr
      ? ["لا تفتح لوحات كهرباء حية", "لا تخلط مبيضًا وأحماضًا"]
      : ["Do not open live electrical panels", "Do not mix bleach and acids"],
    safetyNotes: isAr ? [`${name}: إرشاد DIY أخضر منخفض الخطورة.`] : [`${name}: GREEN low-risk DIY guidance.`],
    stopConditions: isAr
      ? ["ماء غير متوقع", "حرارة جهاز", "أغطية لا تُفتح باليد"]
      : ["Unexpected water", "Equipment heat", "Covers that will not open by hand"],
  });
}

export function buildDiyContentBlocks(args: {
  safetyState: DiySafetyClass;
  guideSlug: string | null;
  professionalFallback: string;
  safeSelfChecks?: string[];
  tools?: string[];
  steps?: string[];
  stopConditions?: string[];
  whatNotToDo?: string[];
  safetyNotes?: string[];
}): DiyContentBlock {
  const diy = emptyDiy();
  diy.safetyState = args.safetyState;
  diy.canonicalGuideSlug = args.guideSlug;
  diy.professionalFallback = args.professionalFallback;
  diy.stopConditions = args.stopConditions ?? [];
  diy.whatNotToDo = args.whatNotToDo ?? [];
  diy.safetyNotes = args.safetyNotes ?? [];
  diy.safeSelfChecks = args.safeSelfChecks ?? [];

  if (args.safetyState === "RED" || args.safetyState === "REVIEW_REQUIRED") {
    diy.allowedBlocks = ["stop_conditions", "what_not_to_do", "safety_notes", "professional_fallback"];
    diy.tools = [];
    diy.steps = [];
  } else if (args.safetyState === "YELLOW") {
    diy.allowedBlocks = [
      "safe_self_checks",
      "stop_conditions",
      "what_not_to_do",
      "safety_notes",
      "professional_fallback",
    ];
    diy.tools = args.tools ?? [];
    diy.steps = []; // limited — no full procedural steps
  } else {
    diy.allowedBlocks = [
      "safe_self_checks",
      "tools",
      "steps",
      "stop_conditions",
      "what_not_to_do",
      "safety_notes",
      "professional_fallback",
    ];
    diy.tools = args.tools ?? [];
    diy.steps = args.steps ?? [];
  }
  return diy;
}

export function buildExpertCta(args: {
  helpSummary: string;
  ops: EffectiveOps;
  quoteCta?: boolean;
  whatsappCta?: boolean;
  phoneCta?: boolean;
  aiCta?: boolean;
}): ExpertCtaBlock {
  const expert = emptyExpert();
  expert.helpSummary = args.helpSummary;
  expert.quoteCta = args.quoteCta !== false;
  expert.bookingCta = args.ops.bookingEnabled;
  expert.whatsappCta = args.whatsappCta !== false;
  expert.phoneCta = args.phoneCta !== false;
  expert.aiCta = args.aiCta !== false;
  expert.emergencyCta = args.ops.emergencyAvailable;
  expert.amcCta = args.ops.amcAvailable;
  return expert;
}

export function buildMainContent(args: Partial<MainContentBlock>): MainContentBlock {
  return { ...emptyMain(), ...args };
}

export function validateFaqItems(items: FaqContentItem[]): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const approved = items.filter((f) => f.approvalState === "approved");
  if (approved.length < 1) reasons.push("no_approved_faq");
  for (const f of approved) {
    if (!f.question.trim() || f.question.length < 8) reasons.push("faq_question_thin");
    if (!f.answer.trim() || f.answer.length < 20) reasons.push("faq_answer_thin");
    if (/^(TODO|TBD|placeholder)/i.test(f.answer.trim())) reasons.push("faq_template_only");
  }
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)] };
}

export function assembleContentJson(parts: {
  main: MainContentBlock;
  aeo: AeoContentBlock;
  geo: GeoContentBlock;
  diy: DiyContentBlock;
  faq: FaqContentItem[];
  expert: ExpertCtaBlock;
}): ServiceLocationContentJson {
  return {
    version: 1,
    main: parts.main,
    aeo: parts.aeo,
    geo: parts.geo,
    diy: parts.diy,
    faq: parts.faq,
    expert: parts.expert,
    related: { relatedServiceSlugs: [], relatedLocationSlugs: [] },
  };
}
