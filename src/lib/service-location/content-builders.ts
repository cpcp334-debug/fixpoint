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
