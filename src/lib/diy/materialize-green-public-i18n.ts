/**
 * Project authored GREEN DiyGuide.profileJson into public DiyGuideI18n fields.
 * EN is derived from the authored profile (not invented).
 * AR is independently authored Arabic for GREEN-safe visitor pages (never EN paste).
 */
import type { DiyGuideProfileJson } from "@/lib/diy/profile-contract";
import { stepsToPlainText } from "@/lib/diy/profile-contract";

export type PublicDiyI18nPayload = {
  title: string;
  problem: string;
  quickAnswer: string;
  difficulty: string;
  estimatedTime: string;
  tools: string;
  materials: string;
  safety: string;
  steps: string;
  checkWork: string;
  whenToStop: string;
  professionalFallback: string;
  seoTitle: string;
  metaDescription: string;
  faq: string;
};

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

export function materializeGreenEnI18n(
  profile: DiyGuideProfileJson,
  args: { title: string; difficulty: string; estimatedTime: string },
): PublicDiyI18nPayload {
  const steps = stepsToPlainText(profile.steps);
  const safety = [...profile.safety.warnings, ...profile.safety.dontDo].filter(Boolean).join(" ");
  const whenToStop = profile.safety.stopConditions.join(" ");
  const checkWork = profile.checks.expectedObservations.join(" ") || "Confirm the area is safe, dry where needed, and improved.";
  const faq = profile.faq.map((f) => ({ q: f.question, a: f.answer }));
  return {
    title: args.title,
    problem: profile.main.overview,
    quickAnswer: profile.main.canIDoIt,
    difficulty: args.difficulty || profile.main.skillLevel,
    estimatedTime: args.estimatedTime || profile.main.estimatedTime,
    tools: JSON.stringify(profile.tools.tools),
    materials: JSON.stringify(profile.tools.materials),
    safety,
    steps: JSON.stringify(steps),
    checkWork,
    whenToStop,
    professionalFallback: profile.professional.professionalFallback,
    seoTitle: `${args.title} | DIY | Al Najah Al Daem · Fixpoint`,
    metaDescription: clip(profile.main.overview || profile.main.canIDoIt, 155),
    faq: JSON.stringify(faq),
  };
}

/** Independent Arabic GREEN public copy — no English fallback paste. */
export function materializeGreenArI18n(
  profile: DiyGuideProfileJson,
  args: { titleAr: string; serviceNameAr: string; difficulty?: string; estimatedTime?: string },
): PublicDiyI18nPayload {
  const name = args.serviceNameAr || args.titleAr;
  const title = args.titleAr;
  const focusHint = clip(profile.main.overview, 120);

  const tools = [
    "قطع قماش مايكروفايبر",
    "دلو",
    "فرشاة ناعمة أو إسفنجة",
    "مكنسة أو مجرفة يدوية",
  ];
  const materials = ["منظف مناسب للسطح", "ماء نظيف", "مطهّر مخصص للسطح عند الحاجة"];
  const steps = [
    `جهّز المنطقة الخاصة بـ${name}: أزل العوائق ونظّف الغبار الجاف أولاً.`,
    "استخدم منتجاً مناسباً للسطح حسب التعليمات — ولا تخلط المواد الكيميائية.",
    `نفّذ العمل على أقسام صغيرة مع أدوات ناعمة فقط، مع الالتزام بنطاق الدليل الآمن.`,
    "اشطف أو امسح البقايا حتى لا يبقى فيلم زلق.",
    "جفّف المناطق المعرّضة للرطوبة جيداً قبل المغادرة.",
    "راجع الزوايا والحواف والتجهيزات، وتوقف فوراً عند أي ضرر أو رائحة حرق أو عدم وضوح.",
  ];
  const safety = [
    "توقف عند شم رائحة حرق أو رؤية شرر أو تعذر عزل المنطقة بأمان.",
    "أبعد الأطفال والحيوانات عن الأدوات والأرضيات المبللة.",
    "لا تتجاوز أجهزة السلامة ولا تجبر القطع العالقة.",
    "لا تخلط مواد التنظيف المنزلية.",
  ].join(" ");
  const whenToStop = [
    "توقف إذا لم تستطع تحديد الأجزاء أو مسار الوصول الآمن.",
    "توقف إذا تصرف الماء أو الحرارة أو الكهرباء بشكل غير متوقع.",
    "توقف إذا تطلب الأمر قوة قد تكسر التجهيزات أو التشطيبات.",
  ].join(" ");
  const quickAnswer = `نعم — يمكن تنفيذ خطوات محدودة وآمنة لـ${name} عندما يكون الوصول آمناً ويمكن العزل عند الحاجة، مع التوقف عند أول علامة خطر.`;
  const problem = `دليل DIY آمن لـ${name}. الهدف تنظيف/صيانة منخفضة الخطورة دون أعمال كهرباء حية أو غاز أو أنظمة مغلقة. ${focusHint}`;
  const fallback =
    "هل تحتاج مساعدة؟ يمكن لفريق النجاح الدائم · فكس بوينت فحص المشكلة والتوصية بخدمة الصيانة أو الإصلاح المناسبة.";
  const faq = [
    { q: `ما هو ${name}؟`, a: problem },
    { q: "هل يمكنني القيام بذلك بنفسي؟", a: quickAnswer },
    { q: "ماذا أتحقق أولاً؟", a: "حدد نوع السطح وأزل الأوساخ السائبة قبل التنظيف الرطب، وتأكد من العزل الآمن عند الحاجة." },
    { q: "متى أتصل بفني؟", a: `اتصل بفني عند صعوبة الوصول أو ظهور ضرر أو عدم تحسن ${name} بعد الخطوات الآمنة الأساسية.` },
    { q: "ما الذي يجب تجنبه؟", a: "تجنب الفوط الخشنة، والأحماض غير المخففة، وخلط المبيض مع الأمونيا، وإجبار الأغطية العالقة." },
    {
      q: "هل هذا يغني عن الخدمة المهنية؟",
      a: "لا. هذا محتوى تعليمي منخفض الخطورة فقط، وليس بديلاً عن الفحص المهني عند الشك.",
    },
  ];

  return {
    title,
    problem,
    quickAnswer,
    difficulty: args.difficulty || "مبتدئ إلى متوسط",
    estimatedTime: args.estimatedTime || "20–90 دقيقة",
    tools: JSON.stringify(tools),
    materials: JSON.stringify(materials),
    safety,
    steps: JSON.stringify(steps),
    checkWork: "يجب أن تبدو الأسطح أنظف وبلا بقايا زلقة، دون تلف ظاهر للتشطيب.",
    whenToStop,
    professionalFallback: fallback,
    seoTitle: `${title} | DIY | النجاح الدائم · فكس بوينت`,
    metaDescription: clip(problem, 155),
    faq: JSON.stringify(faq),
  };
}

export function hasArabicScript(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}
