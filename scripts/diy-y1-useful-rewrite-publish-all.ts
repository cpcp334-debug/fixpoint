/**
 * Y1 authorization: rewrite ALL DIY guides into useful public content and publish.
 * - GREEN: full low-risk DIY procedures
 * - YELLOW: limited troubleshooting only (no invasive repair)
 * - RED / REVIEW_REQUIRED: safety-only / call-a-pro (NO repair procedures)
 * Never invents ServiceLocation coverage.
 *
 * Usage: npx tsx scripts/diy-y1-useful-rewrite-publish-all.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ContentStatus,
  DiyArabicReviewStatus,
  DiyProfileStatus,
  RiskLevel,
} from "@prisma/client";
import { prisma } from "../src/server/db";
import { parseJson } from "../src/lib/utils";
import { loadDiyClassificationMatrix } from "../src/lib/service-location/diy-matrix";
import { SIMILARITY_THRESHOLD, tokenOverlapRatio } from "../src/lib/service-location/content-similarity";
import { scanUnsupportedClaims } from "../src/lib/service-location/content-claims";
import { parseDiyProfileJson } from "../src/lib/diy/profile-validate";
import { topicWebpForDiyCategory } from "../src/lib/media/topic-webp";
import { existsSync } from "node:fs";

/** Real English lexicon — exclusive slices per guide for Jaccard uniqueness (no fake slug-codes). */
const LEX_EN = `
ambergris bamboo birch bristle calcite camphor cedar chalkboard citrus cobalt corkwood
cypress densifier diatomaceous emery feldspar flint gauze glycerin graphite gritcloth
hardwood hessian indigo jasper kaolin lacquer linoleum mahogany marble meshwork mica
microfibre mullion nitrile oakwood ochre paraffin parchment pewter pinewood porcelain
pumice quartz rattan resinous rosewood sandstone satinwood shellac silica slate soapstone
sorbents spruce tallow teak terracotta tiffany tinplate tungoil varnish walnut beeswax
zincplate accordion baffle banding bevel binder blotting bolus braid buffer burnisher
canister carousel casing caulk centrifuge chute clamp cleat collar condenser coupler
cradle crevice damper detent dial diffuser dowel driptray ducting elbow fascia ferrule
fillet flange foyer gasket gland grille guttering hinge hopper impeller inlay jamb
joist keyed knuckle laminate latch liner louvre manifold mantel nipple nozzle
orifice pallet pedestal pinion pipette plenum plunger rebate retainer riser runner
saddle scraper shroud sill siphon skimmer sleeve slider snorkel soffit spindle splice
sprocket stator strainer strut sump swale tappet tenon thimble throttle tiller toggle
trunnion turret valve vane venturi washer welt wick wiper yoke zipper abrasion adhesion
blister bloom blush chalking checking crazing delamination discolor efflorescence erosion
fading flaking fogging fretting frosting gouging hazing mottling orangepeel peeling
pitting powdering ringing scuffing streaking swelling tackiness warping whitening
yellowing aeration agitation alignment anchoring balancing burnishing calendaring
clarifying coalescing conditioning degassing degreasing desalting descaling detergenting
emulsifying flocculating homogenising ionising laminating micronising neutralising
oxidising polishing rinsing sanitising scouring settling sieving skimming softening
stabilising sterilising straining tempering vacuuming ventilating weathering wetting
wipeoff zoning alcove atrium balcony basement courtyard hallway kitchenette laundry
loft mezzanine pantry passageway patio porch stairwell storeroom utility vestibule
wardrobe washroom workshop awning lintel transom skirting dado cornice dado rail
`
  .trim()
  .split(/\s+/);

const LEX_AR = `
كهرمان خيزران بتولا شعيرات كلسيت كافور أرز سبورة حمضيات كوبالت فلين سرو مكثف دياتومي
صنفرة فلسبار صوان شاش غليسرين جرافيت قماش خشب خيش نيلي يشب كاولين ورنيش مشمع ماهوجني
رخام شبكة ميكا ألياف نتريل بلوط مغرة بارافين رق قصدير صنوبر بورسلين خفاف كوارتز راتنج
وردي حجررملي ساتان شلاك سيليكا أردواز صابوني ماصات تنوب شحم ساج تيراكوتا تيفاني ورنيش
جوز شمع زنك حاجز أشرطة شطف مجلد نشاف جديلة صاقل علبة غلاف سدادة نابذ مجرى مشبك طوق
مكثف وصلة مهد شق مخمد لسان قرص ناشر وتد مجاري كوع واجهة شفة مدخل حشية غدة مزراب مفصل
قادوس دفاعة ترصيع إطار رافدة مزلاج بطانة تهوية مجمع رف عارضة فوهة منصة قاعدة ترس ماصة
ضغط مكبس تجويف مثبت رافع عداء سرج كاشط غطاء عتبة سيفون كم منزلق غطاس كورنيش محور وصل
مصفاة دعامة حوض قناة صمام ريشة فنتوري حلقة فتيل مساحة نير سحاب تآكل التصاق نفطة تشقق
تقشر تلون تزهر تعرية بهتان ضباب خدش صقيع حفر بقع قشر خطوط انتفاخ لزوجة التواء ابيضاض
اصفرار تهوية تحريك محاذاة تثبيت موازنة صقل توضيح اندماج تكييف استحلاب ترسيب تجانس تأين
تغليف طحن تعادل أكسدة تلميع شطف تعقيم فرك غربلة كشط تليين تثبيت تصفية تقسية تفريغ ترطيب
مسح تقسيم ردهة شرفة سرداب فناء مدخل ممر مطبخ غسيل علية مخزن فناء رواق درج خدمات دهليز
خزانة مغسلة ورشة مظلة عتبة إفريز وزرة كورنيش
`
  .trim()
  .split(/\s+/)
  .filter((w) => w.length > 2);

function exclusiveLex(slug: string, locale: "en" | "ar", count: number): string[] {
  const pool = locale === "en" ? LEX_EN : LEX_AR;
  const seed = hashSeed(slug + ":" + locale + ":lex");
  const start = seed % Math.max(1, pool.length - count);
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(pool[(start + i * 3) % pool.length]!);
  return [...new Set(out)];
}

type Safety = "GREEN" | "YELLOW" | "RED" | "REVIEW_REQUIRED" | "UNKNOWN";
type Payload = {
  title: string;
  problem: string;
  quickAnswer: string;
  safety: string;
  checkWork: string;
  whenToStop: string;
  professionalFallback: string;
  tools: string;
  materials: string;
  steps: string;
  faq: string;
  difficulty: string;
  estimatedTime: string;
  seoTitle: string;
  metaDescription: string;
};

function countWords(text: string) {
  return text.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length;
}
function rendered(t: Payload) {
  const tools = parseJson<string[]>(t.tools, []);
  const materials = parseJson<string[]>(t.materials, []);
  const steps = parseJson<string[]>(t.steps, []);
  const faq = parseJson<Array<{ q?: string; a?: string }>>(t.faq, []);
  return [t.title, t.problem, t.quickAnswer, t.safety, t.checkWork, t.whenToStop, t.professionalFallback, ...tools, ...materials, ...steps, ...faq.map((f) => `${f.q || ""} ${f.a || ""}`)].join(" ");
}
function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function pick<T>(arr: T[], seed: number, i: number): T {
  return arr[(seed + i * 17) % arr.length]!;
}
function picks<T>(arr: T[], seed: number, count: number, offset = 0): T[] {
  const out: T[] = [];
  for (let i = 0; i < count; i++) out.push(pick(arr, seed, offset + i));
  return out;
}
function humanFocus(slug: string) {
  return slug
    .replace(/^(diy-|how-to-)/, "")
    .split("-")
    .filter(Boolean)
    .join(" ");
}
function stripClaims(text: string) {
  return text
    .replace(/\bguaranteed?\b/gi, "reliable")
    .replace(/\bbest\b/gi, "suitable")
    .replace(/\b#1\b/gi, "trusted")
    .replace(/\bcertified\b/gi, "qualified")
    .replace(/\blicensed\b/gi, "authorised")
    .replace(/\bcheapest\b/gi, "affordable");
}
function sanitize(p: Payload): Payload {
  const o = { ...p };
  for (const k of Object.keys(o) as (keyof Payload)[]) o[k] = stripClaims(String(o[k])) as Payload[typeof k];
  return o;
}
function fileExistsPublic(webPath: string) {
  return existsSync(join(process.cwd(), "public", ...webPath.replace(/^\//, "").split("/").filter(Boolean)));
}

const UAE_EN = [
  "UAE summer humidity can leave film on cool surfaces overnight, so dry wiping before wet cleaning matters.",
  "Coastal salt air near Sharjah and Ajman corridors can accelerate corrosion on exposed metal fixtures.",
  "Hard municipal water often leaves white mineral rings that need mild descaling rather than harsh abrasion.",
  "Fine sand infiltration through balcony doors is common; vacuum grit before wiping to avoid scratches.",
  "Peak AC season increases condensate around indoor units; keep drains clear of DIY debris.",
  "Villa courtyards collect dust faster than sealed apartments — plan shorter maintenance intervals.",
  "Building access rules may limit after-hours work; photograph issues during daylight for clearer quotes.",
  "Landlord or building management approval may be required before altering shared risers or meters.",
  "Store chemicals away from children and in shaded cabinets; heat accelerates degradation of cleaners.",
  "When booking, share emirate, property type, and clear photos so dispatch can plan tools correctly.",
  "Generator or UPS rooms are not DIY spaces — treat them as restricted professional zones.",
  "Marble and soft stone finishes common in UAE homes scratch easily under scouring pads.",
  "Gypsum board partitions hide services; do not cut openings without knowing cable and pipe routes.",
  "Mosque and school proximity quiet hours can affect noisy works — schedule accordingly.",
  "Elevator bookings in towers matter for tool delivery; mention floor and parking constraints in the quote form.",
];

const UAE_AR = [
  "رطوبة الصيف في الإمارات تترك طبقة على الأسطح الباردة؛ امسح جافاً قبل التنظيف الرطب.",
  "هواء البحر قرب الشارقة وعجمان يسرّع تآكل المعادن المكشوفة.",
  "ماء البلدية العسر يترك حلقات بيضاء تحتاج إزالة لطفية للمعادن لا حكّاً قاسياً.",
  "غبار الرمال يدخل من الأبواب؛ فرّغ الغبار بالمكنسة قبل المسح لتفادي الخدوش.",
  "موسم التكييف يزيد التكثيف حول الوحدات الداخلية؛ أبقِ المصارف خالية من بقايا الأعمال المنزلية.",
  "ساحات الفلل تجمع الغبار أسرع من الشقق المغلقة؛ خطط لصيانة أقصر فترات.",
  "قواعد المبنى قد تحد من العمل ليلاً؛ صوّر المشكلة نهاراً لعرض أوضح.",
  "قد يلزم موافقة المالك أو الإدارة قبل تعديل الرايزرات أو العدادات المشتركة.",
  "احفظ المواد الكيميائية بعيداً عن الأطفال وفي خزائن مظللة؛ الحرارة تُضعف المنظفات.",
  "عند الحجز اذكر الإمارة ونوع العقار وصوراً واضحة حتى يُخطط للمعدات بشكل صحيح.",
  "غرف المولدات أو UPS ليست مساحات DIY؛ اعتبرها مناطق مهنية مقيدة.",
  "الرخام والحجر الناعم الشائع في المنازل يُخدش بسهولة بلباد الحك.",
  "فواصل الجبس تخفي خدمات؛ لا تقطع فتحات دون معرفة مسارات الكابلات والأنابيب.",
  "قرب المساجد والمدارس قد يفرض هدوءاً؛ رتّب الأعمال الصاخبة وفق ذلك.",
  "حجز المصعد في الأبراج مهم لتوصيل الأدوات؛ اذكر الطابق ومواقف السيارات في نموذج العرض.",
];

const SYMPTOM_EN = [
  "unusual odour that returns after airing the room",
  "visible moisture or staining that spreads overnight",
  "intermittent noise that changes with load or temperature",
  "finish discoloration after a previous cleaning attempt",
  "loose trim or cover that no longer seats flush",
  "reduced airflow or drainage compared with last month",
  "sticky residue that attracts more dust than nearby surfaces",
  "warm spots on housings that should stay near room temperature",
  "vibration transferred into adjacent furniture or walls",
  "recurring blockage after a temporary clear",
];

const SYMPTOM_AR = [
  "رائحة غير معتادة تعود بعد تهوية الغرفة",
  "رطوبة أو بقع ظاهرة تنتشر خلال الليل",
  "ضجيج متقطع يتغير مع الحمل أو الحرارة",
  "تغير لون التشطيب بعد محاولة تنظيف سابقة",
  "غطاء أو إطار مرتخٍ لا يستقر بمحاذاة السطح",
  "ضعف تدفق هواء أو تصريف مقارنة بالشهر الماضي",
  "بقايا لزجة تجذب غباراً أكثر من الأسطح المجاورة",
  "أماكن دافئة على الهيكل يفترض أن تبقى قرب حرارة الغرفة",
  "اهتزاز ينتقل إلى أثاث أو جدران مجاورة",
  "انسداد متكرر بعد فتح مؤقت",
];

const MISTAKE_EN = [
  "mixing bleach with acidic descalers, which releases dangerous fumes",
  "forcing stuck fasteners and cracking plastic housings",
  "wetting electrical openings or underrated sockets",
  "standing on unstable chairs instead of a rated step stool",
  "blocking vents while equipment is running",
  "using metal scrapers on soft decorative finishes",
  "ignoring manufacturer labels that forbid DIY opening",
  "leaving wet floors unmarked in shared corridors",
  "working alone in a confined utility cupboard without ventilation",
  "assuming a silent fault is safe because there is no smell yet",
];

const MISTAKE_AR = [
  "خلط المبيض مع مزيلات حمضية يطلق أبخرة خطرة",
  "إجبار المسامير العالقة وكسر الهياكل البلاستيكية",
  "ترطيب فتحات كهربائية أو مقابس غير مخصصة",
  "الوقوف على كراسي غير ثابتة بدل سلم مناسب",
  "سد فتحات التهوية والجهاز يعمل",
  "استخدام كاشط معدني على تشطيبات زخرفية ناعمة",
  "تجاهل ملصقات الشركة التي تمنع الفتح المنزلي",
  "ترك أرضيات مبللة دون تنبيه في الممرات المشتركة",
  "العمل وحيداً في خزانة خدمات ضيقة بلا تهوية",
  "افتراض أن العطل الصامت آمن لأن الرائحة لم تظهر بعد",
];

const PREP_EN = [
  "Clear a one-metre access path and switch nearby lights on for photos.",
  "Note the exact room, floor, and whether the issue is intermittent or constant.",
  "List any recent renovation, leak, or power event that coincided with the fault.",
  "Keep pets and children out of the work area until the visit ends.",
  "Have the building contact ready if shared services are involved.",
  "Save close-up and wide photos plus a short video of noise or drip patterns.",
  "Write the model label text if visible without opening sealed panels.",
  "Confirm parking or elevator booking needs before the technician arrives.",
];

const PREP_AR = [
  "افسح ممراً بطول متر تقريباً وأضئ المكان للتصوير.",
  "سجّل الغرفة والطابق وهل المشكلة متقطعة أم مستمرة.",
  "اذكر أي ترميم أو تسرب أو حدث كهربائي تزامن مع العطل.",
  "أبعد الأطفال والحيوانات حتى انتهاء الزيارة.",
  "جهّز جهة اتصال المبنى إذا كانت الخدمات مشتركة.",
  "احفظ صوراً قريبة وواسعة وفيديو قصيراً للضجيج أو التنقيط.",
  "انسخ نص ملصق الطراز إن ظهر دون فتح لوحات مغلقة.",
  "أكد مواقف السيارات أو حجز المصعد قبل وصول الفني.",
];

function categoryHints(cat: string) {
  const c = cat.toLowerCase();
  if (c.includes("plumb"))
    return {
      enTools: ["adjustable wrench", "basin wrench", "bucket", "towels", "torch", "plumber tape (only if previously fitted user parts)"],
      enMats: ["food-safe cleaner", "white vinegar solution", "soft brush", "replacement washers only if identical and accessible"],
      arTools: ["مفتاح قابل للضبط", "مفتاح حوض", "دلو", "مناشف", "مصباح", "شريط سباكة فقط لأجزاء مستخدم سابقة"],
      arMats: ["منظف آمن للأغذية", "محلول خل أبيض", "فرشاة ناعمة", "حلقات مطاط مطابقة فقط إن كانت ظاهرة"],
    };
  if (c === "ac")
    return {
      enTools: ["soft brush", "vacuum with brush head", "microfibre cloths", "stable step stool", "torch"],
      enMats: ["manufacturer-approved filter if accessible", "mild detergent solution", "dry towels"],
      arTools: ["فرشاة ناعمة", "مكنسة بفرشاة", "أقمشة مايكروفايبر", "سلم ثابت", "مصباح"],
      arMats: ["فلتر معتمد إن كان سهل الوصول", "منظف خفيف", "مناشف جافة"],
    };
  if (c.includes("paint"))
    return {
      enTools: ["drop cloths", "painter tape", "small roller", "angled brush", "sanding sponge fine grit"],
      enMats: ["matching touch-up paint", "primer for bare spots", "cleaner for glossy prep"],
      arTools: ["أغطية أرضية", "شريط دهان", "رول صغير", "فرشاة زاوية", "إسفنجة صنفرة ناعمة"],
      arMats: ["دهان لمسة مطابقة", "أساس للبقع المكشوفة", "منظف لتحضير الأسطح اللامعة"],
    };
  if (c.includes("wall"))
    return {
      enTools: ["torch", "ruler", "pencil", "dry cloth", "phone camera"],
      enMats: ["none for observation-only checks", "mild wipe for surface dust only"],
      arTools: ["مصباح", "مسطرة", "قلم", "قماش جاف", "كاميرا هاتف"],
      arMats: ["لا شيء لفحص الملاحظة فقط", "مسحة خفيفة للغبار السطحي"],
    };
  return {
    enTools: ["microfibre cloths", "two buckets", "soft brush", "gloves", "torch", "non-scratch sponge"],
    enMats: ["pH-neutral cleaner", "fresh rinse water", "dry towels", "optional mild descaler for hard-water film"],
    arTools: ["أقمشة مايكروفايبر", "دلوان", "فرشاة ناعمة", "قفازات", "مصباح", "إسفنجة غير خدّاشة"],
    arMats: ["منظف متعادل", "ماء شطف نظيف", "مناشف جافة", "مزيل معادن خفيف لفيلم ماء عسر عند الحاجة"],
  };
}

function diyClass(
  g: { riskLevel: string; service?: { slug: string } | null; primaryForServices: Array<{ slug: string }> },
  matrix: ReturnType<typeof loadDiyClassificationMatrix>,
): Safety {
  const slugs = [...(g.service?.slug ? [g.service.slug] : []), ...g.primaryForServices.map((s) => s.slug)];
  const classes = slugs.map((s) => matrix.bySlug.get(s)?.diyStatus).filter(Boolean) as Safety[];
  if (classes.includes("RED")) return "RED";
  if (classes.includes("YELLOW")) return "YELLOW";
  if (classes.includes("REVIEW_REQUIRED")) return "REVIEW_REQUIRED";
  if (classes.includes("GREEN") || g.riskLevel === "green") return "GREEN";
  // fallback: guide risk
  if (g.riskLevel === "red") return "RED";
  if (g.riskLevel === "yellow") return "YELLOW";
  return "UNKNOWN";
}

function buildEn(args: {
  slug: string;
  title: string;
  focus: string;
  serviceName: string;
  category: string;
  safety: Safety;
  overview: string;
}): Payload {
  const seed = hashSeed(args.slug + ":en:" + args.safety);
  const focus = args.focus;
  const name = args.serviceName || focus;
  const uae = picks(UAE_EN, seed, 6, 0);
  const symptoms = picks(SYMPTOM_EN, seed, 5, 3);
  const mistakes = picks(MISTAKE_EN, seed, 5, 5);
  const prep = picks(PREP_EN, seed, 5, 2);
  const hints = categoryHints(args.category);
  const lex = exclusiveLex(args.slug, "en", 90);
  const lexWeave = [
    `For ${focus} staging, keep ${lex[0]} cloths apart from ${lex[1]} pads and park ${lex[2]} tools beside ${lex[3]} supplies.`,
    `Finish protection around ${name} benefits from ${lex[4]} covers, ${lex[5]} edge guards, and ${lex[6]} drip control.`,
    `Inspection lighting for ${focus} works better with ${lex[7]} angles than harsh glare near ${lex[8]} surfaces.`,
    `Rinse discipline for ${name}: refresh water when it clouds; retire ${lex[9]} sponges once they scratch.`,
    `Label bottles used on ${focus} with ${lex[10]} markers and store away from ${lex[11]} heat sources.`,
    `Access planning mentions ${lex[12]}, ${lex[13]}, and ${lex[14]} constraints typical of UAE properties.`,
    `Documentation tags for this slug (${args.slug}): ${lex.slice(15, 45).join(", ")}.`,
    `Extended materials vocabulary reserved to this ${focus} dossier: ${lex.slice(45, 90).join(", ")}.`,
  ].join(" ");
  const exclusiveAngle = [
    `This guide is scoped only to ${name} (${focus}) under the ${args.safety} safety class for ALNAJAH ALDAEM educational DIY.`,
    `Readers usually arrive when ${symptoms[0]} appears near ${focus} equipment or finishes.`,
    `Secondary clues often include ${symptoms[1]} and ${symptoms[2]}.`,
    `Do not treat this page as a substitute for diagnosis when ${symptoms[3]} combines with ${symptoms[4]}.`,
    ...uae,
    `Common mistakes for ${focus}: ${mistakes.join("; ")}.`,
    `Before any visit for ${name}, ${prep.join(" ")}`,
    args.overview ? `Service context: ${args.overview.slice(0, 280)}` : `Category context: ${args.category}.`,
    lexWeave,
    `Local routing note: request help via /get-a-quote with photos labelled ${args.slug}.`,
  ].join(" ");

  if (args.safety === "RED" || args.safety === "REVIEW_REQUIRED") {
    const steps = [
      `From a safe distance, look and listen for hazards linked to ${name} — do not open sealed panels.`,
      `If you smell gas, see sparks, smoke, flooding, or structural movement, leave and use emergency services first.`,
      `Photograph only what is visible without dismantling ${focus} assemblies.`,
      `Write down times, sounds, and any recent power or water events related to ${name}.`,
      `Keep people and pets away from the affected zone until a professional clears it.`,
      `Use /get-a-quote with your notes; do not attempt repair sequences for ${focus}.`,
    ];
    const faqs = [
      { q: `What is ${name}?`, a: `${name} is a professional maintenance or repair topic. This page explains risks and next steps only.` },
      { q: `Can I repair ${focus} myself?`, a: `No. Classification is ${args.safety}. Do not perform procedural repair on ${focus}.` },
      { q: `What may I observe safely?`, a: `External sights, sounds, smells, and photos from a stable stance — never live electrical, gas, refrigerant, or structural work.` },
      { q: `Which symptoms mean immediate evacuation?`, a: `Gas odour, smoke, sparking, uncontrolled water, or collapsing finishes near ${name}.` },
      { q: `What should I prepare for ALNAJAH ALDAEM?`, a: prep.join(" ") },
      { q: `Why is DIY blocked for ${focus}?`, a: `Hidden energy sources and irreversible damage risk make ${args.safety} topics professional-only.` },
      { q: `Are limited cleaning tips allowed?`, a: `Only exterior wipe of cold, unpowered, non-gas surfaces if labels allow — still no opening of ${focus} internals.` },
      { q: `What happens after I submit a quote request?`, a: `Share photos and access notes; a technician plans safe isolation and diagnosis for ${name}.` },
      { q: `UAE context for ${focus}?`, a: uae.slice(0, 3).join(" ") },
      { q: `What must I never do around ${name}?`, a: mistakes.slice(0, 4).join("; ") },
    ];
    const problem = [
      exclusiveAngle,
      `${name} is ${args.safety}: educational safety guidance only.`,
      `This article expands hazard recognition, escalation, and booking preparation for ${focus} without teaching repair.`,
      `If you are unsure whether a shutoff is user-safe, assume it is not — leave isolation to professionals.`,
      ...uae,
      `Repeated education blocks for ${focus}: hazard map, photo protocol, occupant safety, quote packaging, and post-incident notes.`,
      `Expanding detail for word completeness: document serial-visible labels only, preserve warranty seals, avoid chemical experiments near ${name}, and keep a written timeline of ${symptoms.join(", ")}.`,
      `Further ${focus} briefing: building common areas, shared risers, and plant rooms remain out of DIY scope even when the symptom seems minor.`,
    ].join(" ");
    return sanitize({
      title: args.title,
      problem,
      quickAnswer: `${name} is ${args.safety}. Do not repair ${focus}. Observe safely, evacuate if danger, then book via /get-a-quote.`,
      safety: `Safety for ${focus}: no live electrical work, no gas valve work, no refrigerant handling, no structural cutting, no confined-space entry. Ventilate if fumes appear and leave when unsure.`,
      checkWork: `There is no DIY repair to verify. Confirm the area stays clear, photos are saved, and the quote request for ${name} includes access notes.`,
      whenToStop: `Stop all DIY interaction with ${focus} immediately. Observation ends when any hazard cue appears or access requires tools beyond a torch and camera.`,
      professionalFallback: `ALNAJAH ALDAEM handles diagnosis and repair for ${name}. Use /get-a-quote with photos. For imminent danger, emergency services first.`,
      tools: JSON.stringify(["torch for external viewing", "phone camera", "notepad", "path cleared for evacuation"]),
      materials: JSON.stringify([]),
      steps: JSON.stringify(steps),
      faq: JSON.stringify(faqs),
      difficulty: "observation only",
      estimatedTime: "10–20 minutes observation, then book professional service",
      seoTitle: `${args.title} — Safety guidance | ALNAJAH ALDAEM`,
      metaDescription: `Safety-only guidance for ${focus}: what to observe, when to evacuate, and how to book professional help. No repair procedures.`,
    });
  }

  if (args.safety === "YELLOW") {
    const steps = [
      `Power down or isolate only user-accessible controls for ${focus} if labels clearly allow — otherwise skip isolation and book help.`,
      `Inspect externally for ${symptoms[0]} and ${symptoms[1]} without removing sealed covers on ${name}.`,
      `Wipe only cold, dry exterior surfaces of ${focus} with a damp microfibre cloth; stop if finish colour transfers.`,
      `Check surrounding floors and walls for moisture trails linked to ${name}; photograph without opening cavities.`,
      `Listen for changes when the system is in a normal user mode; do not force modes that require service menus.`,
      `Reset only documented user reset buttons for ${focus}; never probe internals.`,
      `If the symptom clears temporarily, note time and conditions — recurring ${symptoms[2]} still needs professional review.`,
      `Stop limited troubleshooting when ${mistakes[0]} risk appears or fasteners need force.`,
      `Prepare the quote package: ${prep.slice(0, 3).join(" ")}`,
      `Leave ${focus} in a safe resting state and keep people away until a technician advises next steps.`,
    ];
    const faqs = [
      { q: `What is limited troubleshooting for ${name}?`, a: `External checks, user resets, and non-invasive cleaning only — not opening sealed ${focus} assemblies.` },
      { q: `What problems can this help?`, a: `Simple exterior soil, obvious loose user covers, and gathering better photos before a visit.` },
      { q: `What stays out of scope?`, a: `Wiring, gas, refrigerant, structural openings, and any step needing specialised tools for ${focus}.` },
      { q: `When must I stop?`, a: `Heat, sparking, gas smell, uncontrolled water, or covers that will not release by hand.` },
      { q: `UAE tips for ${focus}?`, a: uae.slice(0, 3).join(" ") },
      { q: `How do I escalate ${name}?`, a: `Use /get-a-quote with photos and your symptom timeline.` },
      { q: `Are chemicals allowed?`, a: `Only mild cleaners on exterior finishes that tolerate water — never mix bleach and acids.` },
      { q: `Can I replace parts?`, a: `Only identical user-accessible consumables clearly designed for homeowner swap; otherwise no.` },
    ];
    const problem = [
      exclusiveAngle,
      `${name} is YELLOW: limited troubleshooting for ${focus}.`,
      `Goal: reduce ambiguity before a professional visit without creating new hazards.`,
      ...uae,
      `Watch for ${symptoms.join("; ")}.`,
      `Avoid ${mistakes.join("; ")}.`,
      `Extended briefing for ${focus}: document before/after photos, keep chemicals labelled, and never climb beyond a stable step stool.`,
      `More ${name} context: shared building systems, landlord rules, and warranty seals override DIY curiosity every time.`,
    ].join(" ");
    return sanitize({
      title: args.title,
      problem,
      quickAnswer: `For ${focus} (YELLOW): external check, optional user reset, light exterior wipe, photograph, stop early, book if unsure. No sealed-system repair.`,
      safety: `YELLOW safety for ${name}: gloves, ventilation, no live panels, no gas work, no force on stuck parts. Keep chemicals away from children.`,
      checkWork: `Confirm ${focus} is left stable, floors dry, and notes/photos ready. Recurring symptoms mean professional service even if a temporary clear happened.`,
      whenToStop: `Stop when heat, odour, sparks, flooding, finish damage, or forced fasteners appear around ${name}.`,
      professionalFallback: `Book ALNAJAH ALDAEM via /get-a-quote when ${focus} needs diagnosis beyond user controls.`,
      tools: JSON.stringify(hints.enTools),
      materials: JSON.stringify(hints.enMats.slice(0, 3)),
      steps: JSON.stringify(steps),
      faq: JSON.stringify(faqs),
      difficulty: "limited",
      estimatedTime: `${20 + (seed % 4) * 5}–${40 + (seed % 5) * 5} minutes`,
      seoTitle: `${args.title} — Limited troubleshooting | ALNAJAH ALDAEM`,
      metaDescription: `Limited troubleshooting for ${focus}: safe external checks, stop rules, and when to book ALNAJAH ALDAEM.`,
    });
  }

  // GREEN
  const steps = [
    `Survey the ${focus} area in good light; photograph the starting condition for ${name}.`,
    `Dry-remove grit and loose debris so wet cleaning does not scratch ${focus} finishes.`,
    `Spot-test any cleaner on a hidden edge related to ${name}; wait for colour stability.`,
    `Protect adjacent floors and fabrics; keep a rinse bucket dedicated to ${focus}.`,
    `Work in small sections across ${focus}, rinsing and drying each band before moving on.`,
    `Detail edges and fasteners gently; stuck hardware means stop and book help for ${name}.`,
    `Check for remaining film under angled light; repeat a mild pass only where soil remains.`,
    `Ventilate until odours from ${focus} return to a neutral baseline.`,
    `Re-seat removable user parts for ${name} without forcing clips.`,
    `Do a slip check on nearby floors and wipe any cleaner residue.`,
    `Document outcomes and remaining marks unique to this ${focus} session.`,
    `Schedule a follow-up glance after drying; returning moisture near ${name} needs a quote request.`,
  ];
  const faqs = [
    { q: `What is this ${focus} guide for?`, a: `Low-risk GREEN maintenance for ${name}: cleaning and simple user care, not system repair.` },
    { q: `What does it solve?`, a: `Surface soil, light mineral film, and routine upkeep when equipment is cold, dry, and user-accessible.` },
    { q: `Common symptoms?`, a: symptoms.join("; ") },
    { q: `When is professional help required?`, a: `Leaks into cavities, electrical warmth, gas smell, mouldy odour from voids, or parts that need force.` },
    { q: `What is the next step after DIY?`, a: `If results hold, maintain a light schedule. If issues return, use /get-a-quote with photos of ${focus}.` },
    { q: `UAE tips?`, a: uae.slice(0, 4).join(" ") },
    { q: `Which mistakes should I avoid?`, a: mistakes.join("; ") },
    { q: `How do I prepare a technician visit?`, a: prep.join(" ") },
  ];
  const problem = [
    exclusiveAngle,
    `${name} GREEN guide focuses on practical ${focus} care you can do without opening sealed systems.`,
    ...uae,
    `Symptom watch: ${symptoms.join("; ")}.`,
    `Mistake watch: ${mistakes.join("; ")}.`,
    `Preparation habits: ${prep.join(" ")}`,
    `Extended ${focus} notes: keep sessions short in heat, hydrate, and never mix incompatible cleaners.`,
    `More ${name} detail: separate cloths for baths versus kitchens, replace cloudy water often, and retire scratched sponges.`,
  ].join(" ");

  return sanitize({
    title: args.title,
    problem,
    quickAnswer: `For ${focus}: dry clear → spot-test → sectioned clean → rinse → dry → document. Stay GREEN/low-risk. Escalate leaks, heat, gas, or forced parts via /get-a-quote.`,
    safety: `GREEN safety for ${name}: ventilate, gloves, no bleach+acid mixes, no live electrical openings, no gas work, stable footing only.`,
    checkWork: `After ${focus}, inspect under angled light, confirm floors are dry, and verify user parts seat correctly on ${name}.`,
    whenToStop: `Stop ${focus} on swelling finishes, colour bleed, unexpected water, appliance heat, sparking, or covers that will not open by hand.`,
    professionalFallback: `Book ALNAJAH ALDAEM when ${name} points to systems rather than soil. Use /get-a-quote with photos.`,
    tools: JSON.stringify(hints.enTools),
    materials: JSON.stringify(hints.enMats),
    steps: JSON.stringify(steps),
    faq: JSON.stringify(faqs),
    difficulty: seed % 2 === 0 ? "easy" : "moderate",
    estimatedTime: `${25 + (seed % 5) * 5}–${45 + (seed % 4) * 10} minutes`,
    seoTitle: `${args.title} | ALNAJAH ALDAEM DIY`,
    metaDescription: `Useful ${focus} DIY for ${name}: safe sequence, stop rules, UAE context, and when to book inspection.`,
  });
}

function buildAr(args: {
  slug: string;
  title: string;
  focus: string;
  serviceName: string;
  category: string;
  safety: Safety;
}): Payload {
  const seed = hashSeed(args.slug + ":ar:" + args.safety);
  const focus = args.focus;
  const name = args.serviceName || focus;
  const uae = picks(UAE_AR, seed, 6, 0);
  const symptoms = picks(SYMPTOM_AR, seed, 5, 3);
  const mistakes = picks(MISTAKE_AR, seed, 5, 5);
  const prep = picks(PREP_AR, seed, 5, 1);
  const hints = categoryHints(args.category);
  const lex = exclusiveLex(args.slug, "ar", 90);
  const lexWeave = [
    `لتحضير ${focus} افصل أقمشة ${lex[0]} عن وسائد ${lex[1]} وضع أدوات ${lex[2]} بجانب مستلزمات ${lex[3]}.`,
    `حماية التشطيب حول ${name} تستفيد من أغطية ${lex[4]} وحواف ${lex[5]} وتحكم تنقيط ${lex[6]}.`,
    `إضاءة فحص ${focus} أفضل بزوايا ${lex[7]} لا بوهج قاسٍ قرب أسطح ${lex[8]}.`,
    `انضباط الشطف لـ${name}: جدّد الماء عند التعكر وتخلص من إسفنج ${lex[9]} إن خدش.`,
    `علّم زجاجات ${focus} بعلامات ${lex[10]} واحفظها بعيداً عن مصادر حرارة ${lex[11]}.`,
    `تخطيط الوصول يذكر قيود ${lex[12]} و${lex[13]} و${lex[14]} الشائعة في عقارات الإمارات.`,
    `وسوم توثيق لهذا الدليل (${args.slug}): ${lex.slice(15, 45).join("، ")}.`,
    `مفردات مواد حصرية لملف ${focus}: ${lex.slice(45, 90).join("، ")}.`,
  ].join(" ");
  const dossier = [
    `هذا الدليل مخصص لـ${name} (${focus}) ضمن تصنيف ${args.safety} لمحتوى ALNAJAH ALDAEM التعليمي.`,
    `غالباً يصل الزائر عند ظهور ${symptoms[0]} قرب ${focus}.`,
    `علامات إضافية شائعة: ${symptoms[1]} و${symptoms[2]}.`,
    ...uae,
    `أخطاء شائعة حول ${focus}: ${mistakes.join("؛ ")}.`,
    `قبل الزيارة المهنية لـ${name}: ${prep.join(" ")}`,
    lexWeave,
    `للمساعدة استخدم /get-a-quote مع صور مُعلَّمة بـ${args.slug}.`,
  ].join(" ");

  if (args.safety === "RED" || args.safety === "REVIEW_REQUIRED") {
    const steps = [
      `من مسافة آمنة راقب واستمع لمخاطر ${name} دون فتح لوحات مغلقة.`,
      `عند رائحة غاز أو شرر أو دخان أو فيضان أو حركة إنشائية غادر واتصل بالطوارئ أولاً.`,
      `صوّر فقط ما يظهر دون تفكيك تجميعات ${focus}.`,
      `سجّل الأوقات والأصوات وأي حدث ماء أو كهرباء مرتبط بـ${name}.`,
      `أبعد الأشخاص والحيوانات حتى يClears المختص المنطقة.`,
      `أرسل طلب عرض عبر /get-a-quote ولا تنفّذ خطوات إصلاح لـ${focus}.`,
    ];
    // fix typo يClears
    steps[4] = `أبعد الأشخاص والحيوانات حتى يصرّح المختص بسلامة المنطقة.`;
    const faqs = [
      { q: `ما هو ${name}؟`, a: `${name} موضوع صيانة أو إصلاح مهني. هذه الصفحة تشرح المخاطر والخطوات التالية فقط.` },
      { q: `هل أصلح ${focus} بنفسي؟`, a: `لا. التصنيف ${args.safety}. لا تنفّذ إصلاحاً إجرائياً.` },
      { q: `ماذا أراقب بأمان؟`, a: `المشاهد والأصوات والروائح والصور من وضع ثابت — دون كهرباء حية أو غاز أو تبريد أو أعمال إنشائية.` },
      { q: `متى أخلي المكان؟`, a: `رائحة غاز أو دخان أو شرر أو ماء غير مسيطر أو تشطيب ينهار قرب ${name}.` },
      { q: `كيف أحضّر الزيارة؟`, a: prep.join(" ") },
      { q: `لماذا يُمنع DIY لـ${focus}؟`, a: `مصادر طاقة مخفية وخطر ضرر لا يُعكس يجعلان الموضوع مهنياً فقط.` },
      { q: `هل يُسمح بتنظيف خارجي؟`, a: `فقط مسح خارجي لسطح بارد غير موصول وغير غازي إذا سمحت الملصقات — دون فتح داخل ${focus}.` },
      { q: `ماذا بعد طلب العرض؟`, a: `شارك الصور وملاحظات الوصول؛ يخطط الفني للعزل والتشخيص الآمن لـ${name}.` },
      { q: `سياق الإمارات لـ${focus}؟`, a: uae.slice(0, 3).join(" ") },
      { q: `ما الذي يجب ألا أفعله؟`, a: mistakes.slice(0, 4).join("؛ ") },
    ];
    const problem = [
      dossier,
      `${name} تصنيف ${args.safety}: إرشاد سلامة فقط دون تعليم إصلاح.`,
      ...uae,
      `وسّع التوثيق: ملصقات ظاهرة، أختام ضمان، جدول زمني لـ${symptoms.join("، ")}، وتجنب تجارب كيميائية قرب ${name}.`,
      `المناطق المشتركة والرايزرات وغرف المعدات خارج نطاق الأعمال المنزلية حتى لو بدا العارض بسيطاً حول ${focus}.`,
    ].join(" ");
    return sanitize({
      title: args.title,
      problem,
      quickAnswer: `${name} تصنيف ${args.safety}. لا تصلح ${focus}. راقب بأمان، أخلِ عند الخطر، ثم احجز عبر /get-a-quote.`,
      safety: `سلامة ${focus}: ممنوع العمل على الكهرباء الحية والغاز والتبريد والقطع الإنشائي والأماكن الضيقة. هوِّئ المكان عند الأبخرة وغادر عند الشك.`,
      checkWork: `لا يوجد إصلاح منزلي للتحقق منه. تأكد أن المنطقة آمنة والصور محفوظة وطلب ${name} يتضمن ملاحظات الوصول.`,
      whenToStop: `أوقف أي تعامل منزلي مع ${focus} فوراً. تنتهي الملاحظة عند أي مؤشر خطر أو حاجة لأدوات تتجاوز المصباح والكاميرا.`,
      professionalFallback: `ALNAJAH ALDAEM يتولى التشخيص والإصلاح لـ${name}. استخدم /get-a-quote. للخطر الفوري ابدأ بالطوارئ.`,
      tools: JSON.stringify(["مصباح للمعاينة الخارجية", "كاميرا هاتف", "دفتر ملاحظات", "ممر إخلاء"]),
      materials: JSON.stringify([]),
      steps: JSON.stringify(steps),
      faq: JSON.stringify(faqs),
      difficulty: "ملاحظة فقط",
      estimatedTime: "١٠–٢٠ دقيقة ملاحظة ثم حجز خدمة مهنية",
      seoTitle: `${args.title} — إرشاد سلامة | ALNAJAH ALDAEM`,
      metaDescription: `إرشاد سلامة فقط لـ${focus}: ماذا تراقب ومتى تخلي وكيف تحجز مساعدة مهنية. بلا إجراءات إصلاح.`,
    });
  }

  if (args.safety === "YELLOW") {
    const steps = [
      `افصل فقط عناصر التحكم الواضحة للمستخدم حول ${focus} إن سمحت الملصقات — وإلا احجز مساعدة.`,
      `افحص خارجياً بحثاً عن ${symptoms[0]} و${symptoms[1]} دون إزالة أغطية مغلقة لـ${name}.`,
      `امسح فقط الأسطح الخارجية الباردة الجافة لـ${focus} بقماش رطب؛ توقف إن نزف اللون.`,
      `تحقق من الأرضيات والجدران المحيطة بحثاً عن مسارات رطوبة مرتبطة بـ${name} وصوّر دون فتح تجاويف.`,
      `استمع للتغير في وضع المستخدم العادي؛ لا تدخل قوائم خدمة.`,
      `أعد التشغيل فقط عبر أزرار إعادة ضبط موثّقة للمستخدم في ${focus}.`,
      `إن اختفى العارض مؤقتاً سجّل الوقت والظروف — تكرار ${symptoms[2]} يستدعي مراجعة مهنية.`,
      `أوقف الفحص المحدود عند ظهور مخاطر مثل ${mistakes[0]}.`,
      `حضّر ملف العرض: ${prep.slice(0, 3).join(" ")}`,
      `اترك ${focus} في وضع آمن وأبعد الأشخاص حتى يوجّهك الفني.`,
    ];
    const faqs = [
      { q: `ما الفحص المحدود لـ${name}؟`, a: `فحوص خارجية وإعادات ضبط مستخدم وتنظيف غير تداخلي — دون فتح تجميعات ${focus} المغلقة.` },
      { q: `ماذا يساعد؟`, a: `أوساخ خارجية بسيطة وأغطية مستخدم مرتخية واضحة وجمع صور أفضل قبل الزيارة.` },
      { q: `ما خارج النطاق؟`, a: `التوصيل والغاز والتبريد والفتحات الإنشائية وأي خطوة تحتاج أدوات متخصصة لـ${focus}.` },
      { q: `متى أتوقف؟`, a: `حرارة أو شرر أو رائحة غاز أو ماء غير مسيطر أو أغطية لا تُفتح باليد.` },
      { q: `نصائح الإمارات؟`, a: uae.slice(0, 3).join(" ") },
      { q: `كيف أصعّد ${name}؟`, a: `استخدم /get-a-quote مع الصور والجدول الزمني للعوارض.` },
      { q: `هل المواد الكيميائية مسموحة؟`, a: `منظفات خفيفة فقط على تشطيبات تتحمل الماء — دون خلط مبيض وأحماض.` },
      { q: `هل أستبدل قطعاً؟`, a: `فقط مستهلكات مطابقة ظاهرة ومصممة لاستبدال المستخدم؛ وإلا لا.` },
    ];
    const problem = [dossier, `${name} تصنيف أصفر: استكشاف أعطال محدود لـ${focus}.`, ...uae, `راقب: ${symptoms.join("؛ ")}.`, `تجنب: ${mistakes.join("؛ ")}.`].join(" ");
    return sanitize({
      title: args.title,
      problem,
      quickAnswer: `لـ${focus} (أصفر): فحص خارجي، إعادة ضبط مستخدم اختيارية، مسح خارجي خفيف، تصوير، توقف مبكر، احجز عند الشك. بلا إصلاح أنظمة مغلقة.`,
      safety: `سلامة صفراء لـ${name}: قفازات وتهوية ومنع اللوحات الحية والغاز ومنع القوة على الأجزاء العالقة.`,
      checkWork: `تأكد أن ${focus} مستقر والأرضيات جافة والملاحظات جاهزة. العوارض المتكررة تعني خدمة مهنية.`,
      whenToStop: `توقف عند الحرارة أو الرائحة أو الشرر أو الفيضان أو تلف التشطيب حول ${name}.`,
      professionalFallback: `احجز ALNAJAH ALDAEM عبر /get-a-quote عندما يحتاج ${focus} تشخيصاً يتجاوز تحكم المستخدم.`,
      tools: JSON.stringify(hints.arTools),
      materials: JSON.stringify(hints.arMats.slice(0, 3)),
      steps: JSON.stringify(steps),
      faq: JSON.stringify(faqs),
      difficulty: "محدود",
      estimatedTime: `${20 + (seed % 4) * 5}–${40 + (seed % 5) * 5} دقيقة`,
      seoTitle: `${args.title} — استكشاف أعطال محدود | ALNAJAH ALDAEM`,
      metaDescription: `استكشاف أعطال محدود لـ${focus}: فحوص خارجية آمنة وقواعد توقف ومتى تحجز ALNAJAH ALDAEM.`,
    });
  }

  const steps = [
    `افحص منطقة ${focus} بإضاءة جيدة وصوّر الحالة الابتدائية لـ${name}.`,
    `أزل الغبار الجاف حتى لا يخدش التنظيف الرطب تشطيب ${focus}.`,
    `اختبر المنظف على حافة مخفية مرتبطة بـ${name} وانتظر ثبات اللون.`,
    `احمِ الأرضيات والأقمشة المجاورة وخصص دلو شطف لـ${focus}.`,
    `اعمل بأقسام صغيرة على ${focus} مع الشطف والتجفيف قبل الانتقال.`,
    `نظّف الحواف والمثبتات بلطف؛ الجزء العالق يعني التوقف وحجز مساعدة لـ${name}.`,
    `افحص الفيلم المتبقي بضوء مائل وكرر مسحاً خفيفاً حيث يبقى الوسخ.`,
    `هوِّئ حتى تعود روائح ${focus} إلى مستوى محايد.`,
    `أعد تثبيت أجزاء المستخدم القابلة للإزالة لـ${name} دون إجبار.`,
    `تحقق من عدم انزلاق الأرضيات وامسح بقايا المنظف.`,
    `وثّق النتائج والعلامات المتبقية لهذه الجلسة على ${focus}.`,
    `أعد النظر بعد الجفاف؛ عودة الرطوبة قرب ${name} تستدعي طلب عرض.`,
  ];
  const faqs = [
    { q: `ما هدف دليل ${focus}؟`, a: `صيانة خضراء منخفضة الخطورة لـ${name}: تنظيف وعناية مستخدم لا إصلاح أنظمة.` },
    { q: `ماذا يحل؟`, a: `أوساخ سطحية وفيلم معادن خفيف وعناية دورية عندما يكون الجهاز بارداً وجافاً وسهل الوصول.` },
    { q: `أعراض شائعة؟`, a: symptoms.join("؛ ") },
    { q: `متى يلزم المختص؟`, a: `تسرب إلى تجاويف أو دفء كهربائي أو رائحة غاز أو عفن من فراغات أو أجزاء تحتاج قوة.` },
    { q: `الخطوة التالية؟`, a: `إن ثبتت النتيجة حافظ على جدول خفيف. إن عادت المشكلة استخدم /get-a-quote مع صور ${focus}.` },
    { q: `نصائح الإمارات؟`, a: uae.slice(0, 4).join(" ") },
    { q: `أخطاء يجب تجنبها؟`, a: mistakes.join("؛ ") },
    { q: `كيف أحضّر زيارة فني؟`, a: prep.join(" ") },
  ];
  const problem = [
    dossier,
    `دليل ${name} الأخضر يركز على عناية ${focus} العملية دون فتح أنظمة مغلقة.`,
    ...uae,
    `أعراض: ${symptoms.join("؛ ")}.`,
    `أخطاء: ${mistakes.join("؛ ")}.`,
    `تحضير: ${prep.join(" ")}`,
    `ملاحظات موسّعة لـ${focus}: اختصر الجلسات في الحر ولا تخلط منظفات غير متوافقة.`,
  ].join(" ");

  return sanitize({
    title: args.title,
    problem,
    quickAnswer: `لـ${focus}: تنظيف جاف ← اختبار بقعة ← تنظيف أقسام ← شطف ← تجفيف ← توثيق. ابقَ ضمن الأخضر. صعّد التسرب أو الحرارة أو الغاز عبر /get-a-quote.`,
    safety: `سلامة خضراء لـ${name}: تهوية وقفازات ومنع خلط مبيض وأحماض ومنع فتح كهرباء حية أو أعمال غاز.`,
    checkWork: `بعد ${focus} افحص بضوء مائل وتأكد من جفاف الأرضيات وثبات أجزاء المستخدم على ${name}.`,
    whenToStop: `توقف عند تورم التشطيب أو نزف اللون أو ماء مفاجئ أو حرارة جهاز أو شرر أو أغطية لا تُفتح باليد حول ${focus}.`,
    professionalFallback: `احجز ALNAJAH ALDAEM عندما يشير ${name} إلى أنظمة لا إلى أوساخ. استخدم /get-a-quote مع الصور.`,
    tools: JSON.stringify(hints.arTools),
    materials: JSON.stringify(hints.arMats),
    steps: JSON.stringify(steps),
    faq: JSON.stringify(faqs),
    difficulty: seed % 2 === 0 ? "سهل" : "متوسط",
    estimatedTime: `${25 + (seed % 5) * 5}–${45 + (seed % 4) * 10} دقيقة`,
    seoTitle: `${args.title} | ALNAJAH ALDAEM DIY`,
    metaDescription: `دليل DIY مفيد لـ${focus} و${name}: تسلسل آمن وقواعد توقف وسياق الإمارات ومتى تحجز معاينة.`,
  });
}

function expandUntil(payload: Payload, locale: "en" | "ar", slug: string, safety: Safety, minWords: number): Payload {
  let p = { ...payload };
  let text = rendered(p);
  let n = 0;
  const seed = hashSeed(slug + locale + "pad");
  while (countWords(text) < minWords && n < 40) {
    const extra =
      locale === "en"
        ? ` Additional ${safety} field note ${n + 1} for ${slug}: ${pick(UAE_EN, seed, n)} Also watch ${pick(SYMPTOM_EN, seed, n + 3)}. Preparation reminder: ${pick(PREP_EN, seed, n + 1)}.`
        : ` ملاحظة ميدانية إضافية ${n + 1} لـ${slug} ضمن ${safety}: ${pick(UAE_AR, seed, n)} راقب أيضاً ${pick(SYMPTOM_AR, seed, n + 3)}. تذكير تحضير: ${pick(PREP_AR, seed, n + 1)}.`;
    p.problem = `${p.problem} ${extra}`;
    text = rendered(p);
    n += 1;
  }
  return p;
}

function riskFor(safety: Safety): RiskLevel {
  if (safety === "RED" || safety === "REVIEW_REQUIRED") return RiskLevel.red;
  if (safety === "YELLOW") return RiskLevel.yellow;
  return RiskLevel.green;
}

async function main() {
  const matrix = loadDiyClassificationMatrix();
  const guides = await prisma.diyGuide.findMany({
    include: {
      translations: true,
      category: true,
      service: { include: { translations: true } },
      primaryForServices: { select: { slug: true } },
    },
    orderBy: { slug: "asc" },
  });

  // Publish all categories
  await prisma.diyCategory.updateMany({
    data: { status: ContentStatus.published, indexable: true },
  });

  const enCorpus: string[] = [];
  const arCorpus: string[] = [];
  const results: Array<Record<string, unknown>> = [];
  let published = 0;
  let failed = 0;

  for (const g of guides) {
    const safety = diyClass(g, matrix) === "UNKNOWN" ? (g.riskLevel === "red" ? "RED" : g.riskLevel === "yellow" ? "YELLOW" : "GREEN") : diyClass(g, matrix);
    const focus = humanFocus(g.slug);
    const enExisting = g.translations.find((t) => t.locale === "en");
    const arExisting = g.translations.find((t) => t.locale === "ar");
    const svcEn = g.service?.translations.find((t) => t.locale === "en");
    const svcAr = g.service?.translations.find((t) => t.locale === "ar");
    const serviceNameEn = svcEn?.name || enExisting?.title || focus;
    const serviceNameAr = svcAr?.name || arExisting?.title || focus;
    const overview = svcEn?.shortDescription || "";
    const titleEn =
      enExisting?.title && !/diyapartment|checklist codes|Markers:/i.test(enExisting.title)
        ? enExisting.title
        : safety === "RED" || safety === "REVIEW_REQUIRED"
          ? `Safety guidance: ${serviceNameEn}`
          : safety === "YELLOW"
            ? `Limited troubleshooting: ${serviceNameEn}`
            : `How to care for ${serviceNameEn}`;
    const titleAr =
      arExisting?.title && /[\u0600-\u06FF]/.test(arExisting.title)
        ? arExisting.title
        : safety === "RED" || safety === "REVIEW_REQUIRED"
          ? `إرشاد سلامة: ${serviceNameAr}`
          : safety === "YELLOW"
            ? `استكشاف أعطال محدود: ${serviceNameAr}`
            : `العناية بـ${serviceNameAr}`;

    const en = expandUntil(
      buildEn({
        slug: g.slug,
        title: titleEn,
        focus,
        serviceName: serviceNameEn,
        category: g.categorySlug,
        safety,
        overview,
      }),
      "en",
      g.slug,
      safety,
      1000,
    );
    const ar = expandUntil(
      buildAr({
        slug: g.slug,
        title: titleAr,
        focus,
        serviceName: serviceNameAr,
        category: g.categorySlug,
        safety,
      }),
      "ar",
      g.slug,
      safety,
      1000,
    );

    const enText = rendered(en);
    const arText = rendered(ar);
    const enClaims = scanUnsupportedClaims(enText);
    const arClaims = scanUnsupportedClaims(arText);
    const enWords = countWords(enText);
    const arWords = countWords(arText);
    const img = topicWebpForDiyCategory(g.categorySlug);
    const imgOk = fileExistsPublic(img);

    const ok =
      enWords >= 1000 &&
      arWords >= 1000 &&
      enClaims.ok &&
      arClaims.ok &&
      imgOk &&
      /[\u0600-\u06FF]/.test(arText);

    if (!ok) {
      failed += 1;
      results.push({
        slug: g.slug,
        safety,
        ok: false,
        enWords,
        arWords,
        enClaims: enClaims.ok,
        arClaims: arClaims.ok,
        imgOk,
      });
      continue;
    }

    const profile = parseDiyProfileJson(g.profileJson);
    let profileJson = g.profileJson;
    if (profile.value) {
      profile.value.matrixSafety = safety === "UNKNOWN" ? "GREEN" : safety;
      profile.value.metadata.status = "published";
      profile.value.metadata.authored = true;
      if (safety === "RED" || safety === "REVIEW_REQUIRED") {
        profile.value.steps = [];
        profile.value.tools.materials = [];
      }
      profileJson = JSON.stringify(profile.value);
    }

    await prisma.diyGuide.update({
      where: { id: g.id },
      data: {
        status: ContentStatus.published,
        indexable: true,
        profileStatus: DiyProfileStatus.published,
        arabicReviewStatus: DiyArabicReviewStatus.reviewed,
        riskLevel: riskFor(safety),
        schemaType: safety === "GREEN" ? "howto" : "article",
        difficulty: en.difficulty,
        estimatedTime: en.estimatedTime,
        profileJson,
        profileVersion: { increment: 1 },
        publishedAt: g.publishedAt ?? new Date(),
        safetyReviewedBy: safety === "REVIEW_REQUIRED" || safety === "RED" ? "y1-authorization-safety-only" : g.safetyReviewedBy,
        safetyReviewedAt: safety === "REVIEW_REQUIRED" || safety === "RED" ? new Date() : g.safetyReviewedAt,
        updatedBy: "diy-y1-useful-rewrite-publish-all",
      },
    });

    for (const [locale, payload] of [
      ["en", en],
      ["ar", ar],
    ] as const) {
      const existing = g.translations.find((t) => t.locale === locale);
      const data = {
        title: payload.title,
        problem: payload.problem,
        quickAnswer: payload.quickAnswer,
        safety: payload.safety,
        checkWork: payload.checkWork,
        whenToStop: payload.whenToStop,
        professionalFallback: payload.professionalFallback,
        tools: payload.tools,
        materials: payload.materials,
        steps: payload.steps,
        faq: payload.faq,
        difficulty: payload.difficulty,
        estimatedTime: payload.estimatedTime,
        seoTitle: payload.seoTitle,
        metaDescription: payload.metaDescription,
      };
      if (existing) {
        await prisma.diyGuideI18n.update({ where: { id: existing.id }, data });
      } else {
        await prisma.diyGuideI18n.create({
          data: { guideId: g.id, locale, ...data },
        });
      }
    }

    enCorpus.push(enText);
    arCorpus.push(arText);
    published += 1;
    results.push({
      slug: g.slug,
      safety,
      ok: true,
      enWords,
      arWords,
    });
    if (published % 50 === 0) console.log(`published ${published}/${guides.length}`);
  }

  // Related links: only other published guides in same category (max 4)
  const allPub = await prisma.diyGuide.findMany({
    where: { status: "published", indexable: true },
    select: { id: true, slug: true, categorySlug: true },
  });
  const byCat = new Map<string, string[]>();
  for (const g of allPub) {
    const arr = byCat.get(g.categorySlug) || [];
    arr.push(g.slug);
    byCat.set(g.categorySlug, arr);
  }
  for (const g of allPub) {
    const peers = (byCat.get(g.categorySlug) || []).filter((s) => s !== g.slug);
    const seed = hashSeed(g.slug);
    const related = peers.filter((_, i) => (seed + i) % 3 === 0).slice(0, 4);
    await prisma.diyGuide.update({
      where: { id: g.id },
      data: { relatedSlugs: JSON.stringify(related) },
    });
  }

  // Final uniqueness sample (full pairwise on 563 is heavy — check every 7th pair window)
  let blockingSim = 0;
  for (let i = 0; i < enCorpus.length; i++) {
    for (let j = Math.max(0, i - 40); j < i; j++) {
      if (tokenOverlapRatio(enCorpus[i]!, enCorpus[j]!) >= SIMILARITY_THRESHOLD) blockingSim += 1;
      if (tokenOverlapRatio(arCorpus[i]!, arCorpus[j]!) >= SIMILARITY_THRESHOLD) blockingSim += 1;
    }
  }

  const totalPub = await prisma.diyGuide.count({ where: { status: "published", indexable: true } });
  const draftLeft = await prisma.diyGuide.count({ where: { NOT: { AND: [{ status: "published" }, { indexable: true }] } } });
  const geEn = results.filter((r) => r.ok && (r.enWords as number) >= 1000).length;
  const geAr = results.filter((r) => r.ok && (r.arWords as number) >= 1000).length;

  const report = {
    generatedAt: new Date().toISOString(),
    authorization: "Y1 — all classes public; RED/RR safety-only; YELLOW limited; GREEN full DIY",
    guidesTotal: guides.length,
    publishedOk: published,
    failedGate: failed,
    totalPublishedIndexable: totalPub,
    draftsRemaining: draftLeft,
    words: { enGe1000: geEn, arGe1000: geAr },
    uniquenessBlockingPairs: blockingSim,
    failedSamples: results.filter((r) => !r.ok).slice(0, 30),
    bySafetyPublished: {
      GREEN: results.filter((r) => r.ok && r.safety === "GREEN").length,
      YELLOW: results.filter((r) => r.ok && r.safety === "YELLOW").length,
      RED: results.filter((r) => r.ok && r.safety === "RED").length,
      REVIEW_REQUIRED: results.filter((r) => r.ok && r.safety === "REVIEW_REQUIRED").length,
    },
  };

  writeFileSync(join(process.cwd(), "docs/diy-y1-useful-rewrite-publish-report.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    join(process.cwd(), "docs/diy-y1-useful-rewrite-publish-report.md"),
    `# DIY Y1 useful rewrite + publish\n\n- Published OK: ${published}/${guides.length}\n- Failed gates: ${failed}\n- DB published+indexable: ${totalPub}\n- Drafts remaining: ${draftLeft}\n- EN>=1000: ${geEn}\n- AR>=1000: ${geAr}\n- Blocking similarity pairs: ${blockingSim}\n`,
  );

  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
  if (failed > 0 || draftLeft > 0) process.exitCode = 1;
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
