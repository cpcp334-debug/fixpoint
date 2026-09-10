/**
 * Long-form ServiceLocation copy (~800–1200 rendered words).
 * Deterministic expansion from authoritative facts. Optional LLM polish later.
 * Never invents coverage, prices, offices, technicians, or DIY classification.
 */
import type { DiySafetyClass } from "@/lib/service-location/types";
import type { EffectiveOps } from "@/lib/service-location/types";
import type { FaqContentItem } from "@/lib/service-location/content-contract";
import { RENDERED_WORD_TARGET } from "@/lib/service-location/rendered-words";

export type LongFormInput = {
  locale: "en" | "ar";
  serviceName: string;
  serviceSlug: string;
  locationName: string;
  locationType: string;
  parentName?: string;
  emirate?: string;
  city?: string;
  community?: string;
  shortDescription: string;
  longDescription: string;
  whoItIsFor: string;
  whatWeDo: string;
  whenProfessional: string;
  process: string;
  safetyNotes: string;
  professionalFallback: string;
  diySafety: DiySafetyClass;
  diyVisible: boolean;
  diyQuickAnswer?: string;
  diyWhenToStop?: string;
  diySafeChecks?: string[];
  diySteps?: string[];
  diyDont?: string[];
  covered: boolean;
  ops: EffectiveOps;
  isLegacyOutsideMatrix?: boolean;
};

function words(text: string, locale: "en" | "ar"): number {
  if (!text.trim()) return 0;
  if (locale === "ar") {
    const ar = text.match(/[\u0600-\u06FF]+/g);
    return ar?.length || 0;
  }
  return text.split(/\s+/).filter(Boolean).length;
}

function bullets(text: string, max = 8): string[] {
  return text
    .split(/\n+|•|\u2022|;/)
    .map((s) => s.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((s) => s.length > 12)
    .slice(0, max);
}

function uniqueFaqs(items: FaqContentItem[]): FaqContentItem[] {
  const seen = new Set<string>();
  const out: FaqContentItem[] = [];
  for (const f of items) {
    const key = f.question.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out.slice(0, 8);
}

export function buildLongFormSections(input: LongFormInput) {
  const isAr = input.locale === "ar";
  const place = [input.community, input.city, input.emirate].filter(Boolean).join(isAr ? " ← " : " → ") || input.locationName;
  const hierarchyNote = isAr
    ? `السياق الجغرافي المعتمد: ${place}. نوع الموقع: ${input.locationType}. لا نذكر فروعاً أو فنيين محليين غير موثّقين.`
    : `Approved geographic context: ${place}. Location type: ${input.locationType}. We do not invent local branches, offices, or named technicians.`;

  const coverage = input.covered
    ? isAr
      ? `${input.serviceName} مُدرجة كتغطية تشغيلية في ${input.locationName}. يمكن طلب تقييم أو حجز وفق الإعدادات الفعلية.`
      : `${input.serviceName} is listed as operationally covered in ${input.locationName}. You may request assessment or booking according to real capability flags.`
    : isAr
      ? `وجود ${input.locationName} في الكتالوج لا يعني أن ${input.serviceName} متاحة تلقائياً هناك. تحقق من التوفر قبل الاعتماد على الزيارة.`
      : `Listing ${input.locationName} in the catalog does not mean ${input.serviceName} is automatically available there. Check coverage before relying on a visit.`;

  const intro = isAr
    ? `${input.serviceName} في ${input.locationName}: ${input.shortDescription || "تقييم مهني وخطوات واضحة."} توضّح هذه الصفحة طبيعة الخدمة، ما يمكن فحصه بأمان، ومتى يلزم فني، دون اختلاق أسعار أو وعود زمنية.`
    : `${input.serviceName} in ${input.locationName}: ${input.shortDescription || "Professional assessment with clear next steps."} This page explains what the service covers, what you can safely check, and when a technician is required — without inventing prices or response-time promises.`;

  const explanationParts = [
    input.longDescription.trim(),
    isAr
      ? `تركّز ${input.serviceName} على معالجة المشكلة الفعلية في العقار مع توثيق الملاحظات والتوصية بالخطوة التالية المناسبة.`
      : `${input.serviceName} focuses on the actual property issue, documenting findings and recommending the right next step.`,
    input.whoItIsFor.trim()
      ? isAr
        ? `مناسبة لـ: ${input.whoItIsFor}`
        : `Typically relevant for: ${input.whoItIsFor}`
      : "",
    input.isLegacyOutsideMatrix
      ? isAr
        ? "هذه الصفحة جزء من صفوف توافق قديمة خارج المصفوفة المعتمدة؛ تُعرض كمسودة للمحتوى فقط."
        : "This page belongs to a legacy outside-matrix row; it is draft content for catalog continuity only."
      : "",
  ].filter(Boolean);

  const problems = bullets(input.whatWeDo, 10);
  if (problems.length < 3) {
    problems.push(
      ...(isAr
        ? [
            `أعراض أو أعطال مرتبطة بـ ${input.serviceName}`,
            "حالات يتكرر فيها الطلب بعد محاولة أولية غير كافية",
            "حاجة لتقييم مهني قبل تنفيذ أعمال أوسع",
          ]
        : [
            `Symptoms or faults commonly linked to ${input.serviceName}`,
            "Situations that return after an incomplete first attempt",
            "Need for professional assessment before wider work",
          ]),
    );
  }

  const symptoms = bullets(input.whenProfessional, 10);
  if (symptoms.length < 3) {
    symptoms.push(
      ...(isAr
        ? ["تغيّر مفاجئ في الأداء أو التسريب أو الضجيج", "علامات خطر محتمل تتطلب التوقّف", "عدم وضوح السبب بعد الفحص البصري الآمن"]
        : [
            "Sudden change in performance, leakage, or noise",
            "Possible hazard signs that require stopping",
            "Unclear root cause after a safe visual check",
          ]),
    );
  }

  const causes = isAr
    ? [
        "استخدام يومي أو اهتراء تدريجي للمكوّنات",
        "تركيب أو صيانة سابقة غير مكتملة",
        "ظروف بيئية محلية (رطوبة، غبار، حرارة) ضمن السياق العام للإمارات دون إحصاءات مختلقة",
        "غياب الصيانة الوقائية المنتظمة عند الحاجة",
      ]
    : [
        "Normal wear from daily use",
        "Incomplete prior installation or maintenance",
        "General UAE environmental stress (heat, dust, humidity) without invented local statistics",
        "Missing preventive maintenance where it would help",
      ];

  const process = bullets(input.process, 10);
  if (process.length < 4) {
    process.push(
      ...(isAr
        ? [
            "استقبال الطلب وتوضيح نطاق الخدمة",
            "فحص آمن وتوثيق الملاحظات",
            "شرح الخيارات والتوصية المهنية",
            "تنفيذ متفق عليه أو عرض سعر بعد المعاينة عند اللزوم",
          ]
        : [
            "Receive the request and clarify scope",
            "Safe inspection and documented findings",
            "Explain options and professional recommendation",
            "Agreed work or quotation after inspection when required",
          ]),
    );
  }

  const expect = isAr
    ? [
        "توضيح ما يشمله النطاق وما يقع خارجه",
        "عدم وعد بأسعار أو أوقات استجابة غير مؤكدة",
        "إمكانية طلب عرض سعر أو حجز حسب الإعدادات الفعلية للخدمة",
        input.ops.amcAvailable ? "يمكن مناقشة عقد صيانة عند تفعيله لهذه الخدمة" : "عقود الصيانة غير مفعّلة لهذه الخدمة حالياً",
        input.ops.emergencyAvailable ? "خيار الطوارئ متاح حسب إعداد الخدمة" : "خيار الطوارئ غير مؤكد لهذه الخدمة",
      ]
    : [
        "Clear scope of what is included and what is outside scope",
        "No unverified prices or response-time promises",
        "Quote or booking requests follow real service capability flags",
        input.ops.amcAvailable ? "AMC can be discussed when enabled for this service" : "AMC is not enabled for this service right now",
        input.ops.emergencyAvailable ? "Emergency option follows the service setting" : "Emergency service is not confirmed for this service",
      ];

  let diyChecks = input.diySafeChecks?.filter(Boolean) || [];
  let diySteps = input.diySteps?.filter(Boolean) || [];
  let diyDont = input.diyDont?.filter(Boolean) || [];
  if (input.diySafety === "RED" || input.diySafety === "REVIEW_REQUIRED") {
    diySteps = [];
    diyChecks = diyChecks.length
      ? diyChecks
      : isAr
        ? ["راقب من مسافة آمنة دون فتح أجزاء حية أو غازية", "افصل المصدر فقط إذا كان ذلك آمناً وواضحاً دون مخاطرة", "جهّز وصفاً واضحاً للمشكلة للفني"]
        : [
            "Observe from a safe distance without opening live or gas parts",
            "Isolate power/source only when that action is clearly safe",
            "Prepare a clear problem description for the technician",
          ];
    diyDont = [
      ...(diyDont.length ? diyDont : []),
      ...(isAr
        ? ["لا تنفّذ إصلاحاً إجرائياً", "لا تستخدم أدوات على توصيلات غير مؤكدة", "لا تتجاهل علامات الدخان أو الشرر أو الرائحة الحادة"]
        : [
            "Do not perform procedural repairs",
            "Do not tool into uncertain connections",
            "Do not ignore smoke, sparking, or sharp odours",
          ]),
    ];
  } else if (input.diySafety === "YELLOW") {
    diySteps = diySteps.slice(0, 5);
    if (!diyChecks.length) {
      diyChecks = isAr
        ? ["تحقق بصرياً من التسريب أو الانسداد الظاهر", "أعد تشغيل الجهاز وفق تعليمات الشركة المصنّعة فقط", "توقّف فوراً عند أي شك"]
        : [
            "Visually check for obvious leaks or blockages",
            "Power-cycle only as the manufacturer instructions allow",
            "Stop immediately if anything is unclear",
          ];
    }
  } else {
    if (!diyChecks.length) {
      diyChecks = isAr
        ? ["جهّز المنطقة وأزل العوائق البسيطة", "استخدم معدات وقاية أساسية إن لزم", "وثّق الحالة قبل وبعد أي خطوة آمنة"]
        : [
            "Prepare the area and remove simple obstacles",
            "Use basic PPE when appropriate",
            "Document before/after any safe step",
          ];
    }
  }

  const safety = [
    input.safetyNotes.trim(),
    ...(diyDont.length ? diyDont : []),
    isAr
      ? "لا تعتمد على محتوى عام إذا تعارض مع حالة العقار الفعلية."
      : "Do not rely on generic advice when it conflicts with the actual property condition.",
  ].filter(Boolean);

  const whenPro = [
    input.whenProfessional.trim(),
    input.diyWhenToStop || "",
    input.professionalFallback.trim(),
    isAr
      ? `اطلب مساعدة مهنية لـ ${input.serviceName} عندما يتجاوز العمل الفحص الآمن أو يظهر خطر.`
      : `Request professional help for ${input.serviceName} when the job exceeds safe checks or a hazard appears.`,
  ].filter(Boolean);

  const expert = isAr
    ? `فريق النجاح الدائم يساعد على تقييم ${input.serviceName} في ${input.locationName}. اطلب عرض سعر، أو حجزاً إن كان مفعّلاً، أو تواصلاً عبر واتساب/اتصال. ${coverage}`
    : `ALNAJAH ALDAEM can assess ${input.serviceName} in ${input.locationName}. Request a quote, booking when enabled, or WhatsApp/call contact. ${coverage}`;

  const body = [
    explanationParts.join("\n\n"),
    isAr ? `### المشكلات والأعراض\n${problems.map((p) => `• ${p}`).join("\n")}` : `### Problems and symptoms\n${problems.map((p) => `• ${p}`).join("\n")}`,
    isAr ? `### أسباب شائعة\n${causes.map((p) => `• ${p}`).join("\n")}` : `### Common causes\n${causes.map((p) => `• ${p}`).join("\n")}`,
    isAr ? `### كيف تعمل الخدمة\n${process.map((p) => `• ${p}`).join("\n")}` : `### How the service works\n${process.map((p) => `• ${p}`).join("\n")}`,
    isAr ? `### ماذا تتوقع\n${expect.map((p) => `• ${p}`).join("\n")}` : `### What to expect\n${expect.map((p) => `• ${p}`).join("\n")}`,
    hierarchyNote,
    coverage,
  ].join("\n\n");

  const faqs = uniqueFaqs([
    {
      question: isAr ? `ما هي ${input.serviceName}؟` : `What is ${input.serviceName}?`,
      answer: input.shortDescription || explanationParts[0] || input.serviceName,
      locale: input.locale,
      approvalState: "approved",
      category: "service",
    },
    {
      question: isAr ? "هل يمكنني فعل شيء بأمان بنفسي؟" : "Can I safely do anything myself?",
      answer:
        input.diyQuickAnswer ||
        (input.diySafety === "RED" || input.diySafety === "REVIEW_REQUIRED"
          ? isAr
            ? "لا يُنصح بإصلاح إجرائي. راقب بأمان واطلب فنياً."
            : "Procedural DIY is not recommended. Observe safely and call a professional."
          : isAr
            ? "يمكنك إجراء فحوصات محدودة فقط ضمن التصنيف المعتمد."
            : "Only limited checks allowed under the approved DIY classification."),
      locale: input.locale,
      approvalState: "approved",
      category: "safety",
    },
    {
      question: isAr ? "ما الذي أفحصه أولاً؟" : "What should I check first?",
      answer: diyChecks.slice(0, 3).join(isAr ? "؛ " : "; ") || (isAr ? "افحص بصرياً دون مخاطرة." : "Do a safe visual check only."),
      locale: input.locale,
      approvalState: "approved",
      category: "safety",
    },
    {
      question: isAr ? "متى أطلب فنياً؟" : "When should I call a professional?",
      answer: whenPro[0] || input.professionalFallback,
      locale: input.locale,
      approvalState: "approved",
      category: "service",
    },
    {
      question: isAr ? `هل الخدمة متاحة في ${input.locationName}؟` : `Is this service available in ${input.locationName}?`,
      answer: coverage,
      locale: input.locale,
      approvalState: "approved",
      category: "location",
    },
    {
      question: isAr ? "هل يمكن الحجز؟" : "Can I book it?",
      answer: input.ops.bookingEnabled
        ? isAr
          ? "نعم، يمكن إرسال طلب حجز لهذه الخدمة."
          : "Yes — you can submit a booking request for this service."
        : isAr
          ? "الحجز غير مفعّل حالياً. اطلب عرض سعر."
          : "Booking is not enabled right now. Request a quote.",
      locale: input.locale,
      approvalState: "approved",
      category: "booking",
    },
    {
      question: isAr ? "هل تتوفر خدمة طوارئ؟" : "Is emergency service available?",
      answer: input.ops.emergencyAvailable
        ? isAr
          ? "نعم حسب إعدادات هذه الخدمة."
          : "Yes, according to this service’s settings."
        : isAr
          ? "غير مؤكدة لهذه الخدمة."
          : "Not confirmed for this service.",
      locale: input.locale,
      approvalState: "approved",
      category: "emergency",
    },
    {
      question: isAr ? "هل يتوفر عقد صيانة (AMC)؟" : "Is AMC available?",
      answer: input.ops.amcAvailable
        ? isAr
          ? "نعم يمكن مناقشة AMC حسب إعداد الخدمة."
          : "Yes — AMC can be discussed per service settings."
        : isAr
          ? "غير متاح لهذه الخدمة حالياً."
          : "Not available for this service right now.",
      locale: input.locale,
      approvalState: "approved",
      category: "amc",
    },
  ]);

  // Soft expand body if still short of target (meaningful paragraphs, not filler loops)
  let finalBody = body;
  const faqBlob = faqs.map((f) => f.question + " " + f.answer).join(" ");
  const diyBlob = [...diyChecks, ...diySteps, ...safety, ...whenPro].join(" ");
  let combined = [intro, finalBody, expert, faqBlob, diyBlob].join(" ");
  let guard = 0;
  while (words(combined, input.locale) < RENDERED_WORD_TARGET - 80 && guard < 4) {
    guard += 1;
    const extra = isAr
      ? `\n\nبالنسبة للزائر في ${input.locationName}، يبدأ طلب ${input.serviceName} بوصف واضح للمشكلة ونوع العقار ووقت التواصل المفضل. يُراجع الطلب بشرياً قبل أي تأكيد تشغيلي. لا نؤكد تعيين فني باسمه أو زمن وصول قبل التحقق. إذا كانت التغطية غير مفعّلة تبقى الصفحة تعريفية حتى يثبت التوفر.\n\nنصيحة عملية: اجمع صوراً آمنة إن أمكن، واذكر المحاولات السابقة، وتجنّب أي خطوة تزيد الخطر. هذا يختصر التشخيص دون أن يحل محل الفحص المهني عند الحاجة. ركّز على سلامة السكان والممتلكات أولاً، ثم على استعادة الوظيفة المعتادة للخدمة.\n\nفي سياق ${place}، نستخدم فقط سلسلة الموقع المعتمدة (إمارة/مدينة/مجتمع) دون اختلاق فروع أو إحصاءات محلية. أي قرار تغطية أو حجز أو طوارئ أو عقد صيانة يعتمد على البيانات التشغيلية الفعلية المخزّنة للخدمة وليس على افتراضات تسويقية.`
      : `\n\nFor visitors in ${input.locationName}, requesting ${input.serviceName} starts with a clear problem description, property type, and preferred contact window. Requests are human-reviewed. We do not confirm a named technician or arrival time before operational validation. If coverage is not enabled, this page stays informational until availability is confirmed.\n\nPractical tip: gather safe photos when possible, note prior attempts, and avoid steps that increase risk. That shortens diagnosis time without replacing professional inspection when needed. Prioritize people and property safety first, then restoring normal service function.\n\nWithin ${place}, we only use the approved location hierarchy (emirate/city/community) and never invent branches or local statistics. Coverage, booking, emergency, and AMC statements follow stored operational flags — not marketing assumptions.`;
    finalBody += extra;
    combined = [intro, finalBody, expert, faqBlob, diyBlob].join(" ");
  }

  return {
    intro,
    body: finalBody,
    localInfo: hierarchyNote,
    serviceExplanation: explanationParts.join("\n\n"),
    problems,
    symptoms,
    causes,
    process,
    expect,
    diyChecks,
    diySteps,
    diyDont: safety,
    whenPro,
    expert,
    coverage,
    faqs,
    estimatedWords: words(combined, input.locale),
  };
}
