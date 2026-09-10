/**
 * Rewrite public FAQs everywhere: global + active services + public DIY + public SL + Blog.
 * 6 unique valuable FAQs each, independent EN + AR.
 * Claim-safe: no best/#1/guaranteed/24/7/fake coverage.
 *
 * Usage: npx tsx scripts/rewrite-public-faqs-unique.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TARGET = 6;

type Pair = { en: { q: string; a: string }; ar: { q: string; a: string } };

function store(items: Array<{ q: string; a: string }>) {
  return JSON.stringify(items.map((f) => ({ q: f.q, a: f.a })));
}

function take6(pairs: Pair[]) {
  return pairs.slice(0, TARGET);
}

function globalFaqs(): Pair[] {
  return [
    {
      en: {
        q: "Which emirates can I request service in?",
        a: "We accept enquiries for active services across the UAE. Public licenses currently listed are Sharjah (925212) and Ajman (132954). Coverage for a specific service and area is confirmed during quotation—not assumed from this page alone.",
      },
      ar: {
        q: "في أي إمارات يمكنني طلب الخدمة؟",
        a: "نستقبل طلبات للخدمات المفعّلة في أنحاء الإمارات. الرخص المعروضة حالياً هي الشارقة (925212) وعجمان (132954). تأكيد التغطية لخدمة ومنطقة محددة يتم أثناء عرض السعر—ولا يُفترض من هذه الصفحة وحدها.",
      },
    },
    {
      en: {
        q: "Will ALNAJAH AI give me a final diagnosis or price?",
        a: "No. ALNAJAH AI helps classify the issue and may suggest safe self-checks. It does not replace a technician, authorise prices, or confirm a diagnosis from photos alone.",
      },
      ar: {
        q: "هل يعطيني ذكاء النجاح تشخيصاً أو سعراً نهائياً؟",
        a: "لا. يساعد ذكاء النجاح على تصنيف المشكلة وقد يقترح فحوصات آمنة. لا يغني عن الفني، ولا يعتمد أسعاراً، ولا يؤكد تشخيصاً من الصور وحدها.",
      },
    },
    {
      en: {
        q: "How do quotations work?",
        a: "Submit details via Get a Quote. A person reviews scope, access, and site conditions before any quotation. Instant automated pricing is not offered.",
      },
      ar: {
        q: "كيف تعمل عروض الأسعار؟",
        a: "أرسل التفاصيل عبر طلب عرض سعر. يراجع شخص النطاق وإمكانية الوصول وظروف الموقع قبل أي عرض. لا نقدّم تسعيرًا فورياً آلياً.",
      },
    },
    {
      en: {
        q: "When should I use DIY guides versus calling a professional?",
        a: "Use DIY only for low-risk checks described in a published GREEN guide. Stop and request professional help for gas, live electrical work, structural risk, flooding, or anything you cannot safely access.",
      },
      ar: {
        q: "متى أستخدم أدلة الأعمال اليدوية ومتى أتصل بمحترف؟",
        a: "استخدم الأعمال اليدوية فقط للفحوصات منخفضة المخاطر في دليل أخضر منشور. توقّف واطلب مساعدة مهنية عند الغاز أو الكهرباء الحية أو الخطر الإنشائي أو الفيضان أو أي عمل لا يمكنك الوصول إليه بأمان.",
      },
    },
    {
      en: {
        q: "Do you publish every service in every community?",
        a: "No. Only verified covered Service × Location pages are public and indexable. Uncovered pairs stay private even if content drafts exist.",
      },
      ar: {
        q: "هل تنشرون كل خدمة في كل منطقة؟",
        a: "لا. تُنشر فقط صفحات الخدمة × الموقع المغطاة والمؤكدة وتكون قابلة للفهرسة. الأزواج غير المغطاة تبقى خاصة حتى لو وُجدت مسودات محتوى.",
      },
    },
    {
      en: {
        q: "What should I prepare before a visit?",
        a: "Note symptoms, when they started, access constraints, and any photos of the area. Clear a safe path to the work zone and list questions for the technician.",
      },
      ar: {
        q: "ماذا أحضّر قبل الزيارة؟",
        a: "سجّل الأعراض ووقت بدايتها وقيود الوصول وأي صور للمنطقة. وفّر ممراً آمناً لموقع العمل وأعد أسئلة للفني.",
      },
    },
  ];
}

function serviceFaqs(nameEn: string, nameAr: string, slug: string): Pair[] {
  const tips: Record<string, { en: string; ar: string }> = {
    "cleaning-services": {
      en: "dust, stains, kitchen/bath hygiene, and post-move residue",
      ar: "الغبار والبقع ونظافة المطبخ/الحمام وبقايا ما بعد النقل",
    },
    "plumbing-maintenance": {
      en: "drips, slow drains, toilet issues, and accessible supply fittings",
      ar: "التسربات والتصريف البطيء ومشاكل المرحاض وتجهيزات التغذية المتاحة",
    },
    "electrical-maintenance": {
      en: "outlets, lighting circuits, and non-energised visual checks only for DIY",
      ar: "المقابس ودوائر الإضاءة والفحوصات البصرية غير المكهربة فقط للأعمال اليدوية",
    },
    "ac-maintenance": {
      en: "weak cooling, filter access, and outdoor-unit clearance",
      ar: "ضعف التبريد ووصول الفلتر وخلو الوحدة الخارجية",
    },
    "painting-services": {
      en: "interior touch-ups, surface prep, and finish matching",
      ar: "اللمسات الداخلية وتحضير الأسطح ومطابقة التشطيب",
    },
    "wall-maintenance": {
      en: "small cracks, patching, and moisture-related surface damage",
      ar: "التشققات الصغيرة والترميم وأضرار الأسطح المرتبطة بالرطوبة",
    },
    "building-maintenance": {
      en: "minor fittings, general upkeep, and multi-trade coordination",
      ar: "التركيبات البسيطة والصيانة العامة وتنسيق عدة تخصصات",
    },
  };
  const tip = tips[slug] ?? {
    en: "assessment and appropriate professional response for related issues",
    ar: "التقييم والاستجابة المهنية المناسبة للمشكلات ذات الصلة",
  };

  return [
    {
      en: {
        q: `What does ${nameEn} typically include?`,
        a: `${nameEn} focuses on ${tip.en}. Exact scope depends on your property and is confirmed during quotation after we understand access and symptoms.`,
      },
      ar: {
        q: `ماذا تشمل عادةً خدمة ${nameAr}؟`,
        a: `تركّز ${nameAr} على ${tip.ar}. يعتمد النطاق الدقيق على عقارك ويُؤكد أثناء عرض السعر بعد فهم الوصول والأعراض.`,
      },
    },
    {
      en: {
        q: `What can I safely check myself before booking ${nameEn}?`,
        a: `Start with non-invasive observation: note when the issue started, what changed, and whether the area is dry and accessible. Follow only published DIY guidance for this service; stop if you smell gas, see sparks, or cannot isolate risk.`,
      },
      ar: {
        q: `ما الذي يمكنني فحصه بأمان قبل حجز ${nameAr}؟`,
        a: `ابدأ بملاحظة غير تدخلية: سجّل متى بدأت المشكلة وما الذي تغيّر وما إذا كانت المنطقة جافة ومتاحة. اتبع فقط إرشادات الأعمال اليدوية المنشورة لهذه الخدمة؛ توقّف إذا شممت غازاً أو رأيت شرراً أو تعذّر عزل الخطر.`,
      },
    },
    {
      en: {
        q: `When should I stop DIY and call for ${nameEn}?`,
        a: `Call when symptoms return quickly, when specialised tools are required, when access is unsafe, or when the root cause is unclear. Hazardous work must not be improvised.`,
      },
      ar: {
        q: `متى أتوقف عن الأعمال اليدوية وأتصل بشأن ${nameAr}؟`,
        a: `اتصل عندما تعود الأعراض بسرعة، أو عند الحاجة لأدوات متخصصة، أو عندما يكون الوصول غير آمن، أو عندما يكون السبب غير واضح. لا تُرتجل الأعمال الخطرة.`,
      },
    },
    {
      en: {
        q: `How are prices set for ${nameEn}?`,
        a: `Pricing depends on scope, materials, access, and site conditions. Request a quote—no instant automated price is authorised on the website.`,
      },
      ar: {
        q: `كيف تُحدد أسعار ${nameAr}؟`,
        a: `يعتمد التسعير على النطاق والمواد وإمكانية الوصول وظروف الموقع. اطلب عرض سعر—ولا يُعتمد سعر فوري آلي على الموقع.`,
      },
    },
    {
      en: {
        q: `Can I book ${nameEn} online?`,
        a: `Yes—you can submit a booking or quote request. Confirmation and scheduling are handled by our team after review.`,
      },
      ar: {
        q: `هل يمكنني حجز ${nameAr} عبر الإنترنت؟`,
        a: `نعم—يمكنك إرسال طلب حجز أو عرض سعر. يتم التأكيد والجدولة من فريقنا بعد المراجعة.`,
      },
    },
    {
      en: {
        q: `What should I tell the team about my ${nameEn} request?`,
        a: `Share property type, location, symptoms, urgency, photos if safe, and any access limits (parking, keys, timing). Clear details reduce repeat visits.`,
      },
      ar: {
        q: `ماذا أخبر الفريق عن طلب ${nameAr}؟`,
        a: `شارك نوع العقار والموقع والأعراض والإلحاح والصور إن كانت آمنة وأي قيود وصول (مواقف، مفاتيح، التوقيت). التفاصيل الواضحة تقلل الزيارات المتكررة.`,
      },
    },
  ];
}

function diyFaqs(titleEn: string, titleAr: string, risk: string): Pair[] {
  const safetyEn =
    risk === "green"
      ? "This guide is intended for low-risk checks when conditions match the published steps."
      : "Treat this topic carefully—do not expand into hazardous procedures beyond what the published guide allows.";
  const safetyAr =
    risk === "green"
      ? "هذا الدليل مخصص لفحوصات منخفضة المخاطر عندما تطابق الظروف الخطوات المنشورة."
      : "تعامل مع هذا الموضوع بحذر—ولا توسّع إلى إجراءات خطرة خارج ما يسمح به الدليل المنشور.";

  return [
    {
      en: {
        q: `Who is “${titleEn}” for?`,
        a: `Home or facility users who need clear, educational steps for this issue. ${safetyEn}`,
      },
      ar: {
        q: `لمن موجّه دليل «${titleAr}»؟`,
        a: `لمستخدمي المنازل أو المرافق الذين يحتاجون خطوات تعليمية واضحة لهذه المشكلة. ${safetyAr}`,
      },
    },
    {
      en: {
        q: `What should I prepare before starting “${titleEn}”?`,
        a: `Read the full guide, gather listed tools, ensure good lighting, and confirm you can stop safely. Keep children and pets away from the work area.`,
      },
      ar: {
        q: `ماذا أحضّر قبل بدء «${titleAr}»؟`,
        a: `اقرأ الدليل بالكامل، واجمع الأدوات المذكورة، وتأكد من الإضاءة الجيدة، وتأكد أنك تستطيع التوقف بأمان. أبعد الأطفال والحيوانات عن منطقة العمل.`,
      },
    },
    {
      en: {
        q: `When must I stop this DIY and call a professional?`,
        a: `Stop for gas smell, flooding you cannot control, live electrical exposure, structural movement, or any step that requires specialised certification or forced parts.`,
      },
      ar: {
        q: `متى يجب أن أتوقف عن الأعمال اليدوية وأتصل بمحترف؟`,
        a: `توقف عند رائحة الغاز أو فيضان لا تسيطر عليه أو تعرّض كهربائي حي أو حركة إنشائية أو أي خطوة تتطلب اعتماداً متخصصاً أو فك أجزاء بالقوة.`,
      },
    },
    {
      en: {
        q: `Does finishing “${titleEn}” mean the root cause is fixed?`,
        a: `Not always. DIY can clear simple contributing factors. Recurring symptoms usually need professional assessment and a quotation.`,
      },
      ar: {
        q: `هل إنهاء «${titleAr}» يعني أن السبب الجذري قد أُصلح؟`,
        a: `ليس دائماً. قد تزيل الأعمال اليدوية عوامل مساهمة بسيطة. الأعراض المتكررة عادة تحتاج تقييماً مهنياً وعرض سعر.`,
      },
    },
    {
      en: {
        q: `Are materials and times in the guide guarantees?`,
        a: `No. Estimated time and materials are guidance only. Site conditions vary; adjust carefully or escalate if unsure.`,
      },
      ar: {
        q: `هل المواد والأوقات في الدليل ضمانات؟`,
        a: `لا. الوقت والمواد تقديران إرشاديان فقط. تختلف ظروف الموقع؛ عدّل بحذر أو ارفع الطلب إذا كنت غير متأكد.`,
      },
    },
    {
      en: {
        q: `How do I request help after reading “${titleEn}”?`,
        a: `Use Get a Quote, describe what you already checked, and attach safe photos. Mention this guide so the team can focus on remaining risks.`,
      },
      ar: {
        q: `كيف أطلب المساعدة بعد قراءة «${titleAr}»؟`,
        a: `استخدم طلب عرض سعر، ووصف ما فحصته، وأرفق صوراً آمنة. اذكر هذا الدليل حتى يركز الفريق على المخاطر المتبقية.`,
      },
    },
  ];
}

function slFaqs(serviceEn: string, serviceAr: string, locEn: string, locAr: string): Pair[] {
  return [
    {
      en: {
        q: `Is ${serviceEn} available in ${locEn}?`,
        a: `This page is published only where coverage for ${serviceEn} in ${locEn} is marked covered in our operational data. Request a quote to confirm timing and access for your exact address.`,
      },
      ar: {
        q: `هل تتوفر ${serviceAr} في ${locAr}؟`,
        a: `تُنشر هذه الصفحة فقط عندما تكون تغطية ${serviceAr} في ${locAr} مُعلَّمة كمغطاة في بياناتنا التشغيلية. اطلب عرض سعر لتأكيد التوقيت والوصول لعنوانك تحديداً.`,
      },
    },
    {
      en: {
        q: `What local details help a ${serviceEn} visit in ${locEn}?`,
        a: `Share community or building name, parking/access notes, preferred windows, and whether the property is villa, apartment, or commercial in ${locEn}.`,
      },
      ar: {
        q: `ما التفاصيل المحلية التي تساعد زيارة ${serviceAr} في ${locAr}؟`,
        a: `شارك اسم الحي أو المبنى وملاحظات المواقف/الوصول والأوقات المفضلة وما إذا كان العقار فيلا أو شقة أو تجارياً في ${locAr}.`,
      },
    },
    {
      en: {
        q: `What can I safely check myself for ${serviceEn} in ${locEn}?`,
        a: `Use the DIY/self-help section on this page for low-risk checks. Do not invent procedures, and stop if conditions in ${locEn} make access unsafe.`,
      },
      ar: {
        q: `ما الذي يمكنني فحصه بأمان لـ ${serviceAr} في ${locAr}؟`,
        a: `استخدم قسم الأعمال اليدوية/ساعد نفسك في هذه الصفحة للفحوصات منخفضة المخاطر. لا تخترع إجراءات، وتوقف إذا جعلت ظروف ${locAr} الوصول غير آمن.`,
      },
    },
    {
      en: {
        q: `How fast can someone attend ${serviceEn} in ${locEn}?`,
        a: `Scheduling depends on demand, access, and confirmed scope. We do not publish guaranteed same-day promises; the team confirms after reviewing your request.`,
      },
      ar: {
        q: `ما مدى سرعة حضور ${serviceAr} في ${locAr}؟`,
        a: `تعتمد الجدولة على الطلب وإمكانية الوصول والنطاق المؤكد. لا ننشر وعوداً مضمونة لنفس اليوم؛ يؤكد الفريق بعد مراجعة طلبك.`,
      },
    },
    {
      en: {
        q: `Does this ${locEn} page replace a site inspection?`,
        a: `No. Local information supports planning. Final recommendations and pricing for ${serviceEn} still depend on what technicians find on site.`,
      },
      ar: {
        q: `هل تغني صفحة ${locAr} عن معاينة الموقع؟`,
        a: `لا. المعلومات المحلية تدعم التخطيط. التوصيات النهائية والتسعير لـ ${serviceAr} ما زالا يعتمدان على ما يجده الفنيون في الموقع.`,
      },
    },
    {
      en: {
        q: `How do I request ${serviceEn} for a property in ${locEn}?`,
        a: `Use Get a Quote, select ${serviceEn}, mention ${locEn}, and include symptoms plus access notes. A person reviews before confirmation.`,
      },
      ar: {
        q: `كيف أطلب ${serviceAr} لعقار في ${locAr}؟`,
        a: `استخدم طلب عرض سعر، واختر ${serviceAr}، واذكر ${locAr}، وأضف الأعراض وملاحظات الوصول. يراجع شخص قبل التأكيد.`,
      },
    },
  ];
}

function blogFaqs(titleEn: string, titleAr: string): Pair[] {
  return [
    {
      en: {
        q: `What is this article (“${titleEn}”) meant to help with?`,
        a: `It explains practical signs, safe checks, and when to escalate—so you can decide next steps without unsafe guessing.`,
      },
      ar: {
        q: `بماذا يساعد مقال «${titleAr}»؟`,
        a: `يشرح علامات عملية وفحوصات آمنة ومتى ينبغي التصعيد—لتقرر الخطوة التالية دون تخمين غير آمن.`,
      },
    },
    {
      en: {
        q: `Is the advice in “${titleEn}” a substitute for a technician?`,
        a: `No. Editorial guidance is educational. Persistent, hazardous, or unclear issues need professional assessment.`,
      },
      ar: {
        q: `هل يغني محتوى «${titleAr}» عن الفني؟`,
        a: `لا. الإرشاد التحريري تعليمي. المشكلات المستمرة أو الخطرة أو غير الواضحة تحتاج تقييماً مهنياً.`,
      },
    },
    {
      en: {
        q: `What self-checks are safe after reading this article?`,
        a: `Only the low-risk observations described in the article’s DIY/self-help section. Skip any step that needs forced access, live power, or gas work.`,
      },
      ar: {
        q: `ما الفحوصات الذاتية الآمنة بعد قراءة هذا المقال؟`,
        a: `فقط الملاحظات منخفضة المخاطر المذكورة في قسم الأعمال اليدوية/ساعد نفسك. تجاوز أي خطوة تحتاج وصولاً قسرياً أو كهرباء حية أو أعمال غاز.`,
      },
    },
    {
      en: {
        q: `When should I get a quote after reading “${titleEn}”?`,
        a: `When symptoms repeat, safety is uncertain, specialised tools are needed, or you want a documented professional plan.`,
      },
      ar: {
        q: `متى أطلب عرض سعر بعد قراءة «${titleAr}»؟`,
        a: `عندما تتكرر الأعراض، أو تكون السلامة غير مؤكدة، أو تُحتاج أدوات متخصصة، أو تريد خطة مهنية موثقة.`,
      },
    },
    {
      en: {
        q: `Are examples in the article based on fake local statistics?`,
        a: `No. We avoid invented job counts, rankings, or branch claims. Use the related service and DIY links for verified next actions.`,
      },
      ar: {
        q: `هل أمثلة المقال مبنية على إحصاءات محلية وهمية؟`,
        a: `لا. نتجنب أعداد الأعمال المخترعة أو التصنيفات أو ادعاءات الفروع. استخدم روابط الخدمة والأعمال اليدوية ذات الصلة للخطوات التالية الموثقة.`,
      },
    },
    {
      en: {
        q: `Where can I go next from this article?`,
        a: `Open related services or DIY guides linked on the page, or submit Get a Quote with what you already observed.`,
      },
      ar: {
        q: `إلى أين أذهب بعد هذا المقال؟`,
        a: `افتح الخدمات أو أدلة الأعمال اليدوية المرتبطة في الصفحة، أو أرسل طلب عرض سعر بما لاحظته بالفعل.`,
      },
    },
  ];
}

async function rewriteGlobal() {
  const pairs = take6(globalFaqs());
  await prisma.faq.deleteMany({ where: { serviceId: null, locationId: null } });
  for (const [i, p] of pairs.entries()) {
    await prisma.faq.create({
      data: {
        sortOrder: i,
        status: "published",
        translations: {
          create: [
            { locale: "en", question: p.en.q, answer: p.en.a },
            { locale: "ar", question: p.ar.q, answer: p.ar.a },
          ],
        },
      },
    });
  }
  return pairs.length;
}

async function rewriteServices() {
  const services = await prisma.service.findMany({
    where: { status: "active" },
    include: { translations: true },
  });
  let n = 0;
  for (const s of services) {
    const en = s.translations.find((t) => t.locale === "en");
    const ar = s.translations.find((t) => t.locale === "ar");
    if (!en || !ar) continue;
    const pairs = take6(serviceFaqs(en.name, ar.name, s.slug));
    await prisma.serviceI18n.update({
      where: { id: en.id },
      data: { faq: store(pairs.map((p) => p.en)) },
    });
    await prisma.serviceI18n.update({
      where: { id: ar.id },
      data: { faq: store(pairs.map((p) => p.ar)) },
    });
    n++;
  }
  return n;
}

async function rewriteDiy() {
  const guides = await prisma.diyGuide.findMany({
    where: { status: "published", indexable: true },
    include: { translations: true },
  });
  let n = 0;
  for (const g of guides) {
    const en = g.translations.find((t) => t.locale === "en");
    const ar = g.translations.find((t) => t.locale === "ar");
    if (!en || !ar) continue;
    const pairs = take6(diyFaqs(en.title, ar.title, g.riskLevel));
    await prisma.diyGuideI18n.update({
      where: { id: en.id },
      data: { faq: store(pairs.map((p) => p.en)) },
    });
    await prisma.diyGuideI18n.update({
      where: { id: ar.id },
      data: { faq: store(pairs.map((p) => p.ar)) },
    });
    n++;
  }
  return n;
}

async function rewriteSl() {
  const rows = await prisma.serviceLocation.findMany({
    where: {
      covered: true,
      indexable: true,
      coverageStatus: "published",
      service: { status: "active", indexable: true },
      location: { status: "active", indexable: true, serves: true },
    },
    include: {
      translations: true,
      service: { include: { translations: true } },
      location: { include: { translations: true } },
    },
  });
  let n = 0;
  for (const row of rows) {
    const serviceEn = row.service.translations.find((t) => t.locale === "en")?.name || row.service.slug;
    const serviceAr = row.service.translations.find((t) => t.locale === "ar")?.name || serviceEn;
    const locEn = row.location.translations.find((t) => t.locale === "en")?.name || row.location.slug;
    const locAr = row.location.translations.find((t) => t.locale === "ar")?.name || locEn;
    const pairs = take6(slFaqs(serviceEn, serviceAr, locEn, locAr));
    const enFaq = store(pairs.map((p) => p.en));
    const arFaq = store(pairs.map((p) => p.ar));
    await prisma.$transaction([
      ...row.translations
        .filter((t) => t.locale === "en" || t.locale === "ar")
        .map((t) =>
          prisma.serviceLocationI18n.update({
            where: { id: t.id },
            data: { faq: t.locale === "ar" ? arFaq : enFaq },
          }),
        ),
    ]);
    const revs = await prisma.serviceLocationRevision.findMany({
      where: { serviceLocationId: row.id, status: "published" },
    });
    for (const rev of revs) {
      try {
        const snap = JSON.parse(rev.snapshotJson) as Record<string, unknown>;
        snap.faq = rev.locale === "ar" ? arFaq : enFaq;
        await prisma.serviceLocationRevision.update({
          where: { id: rev.id },
          data: { snapshotJson: JSON.stringify(snap) },
        });
      } catch {
        /* ignore */
      }
    }
    n++;
  }
  return n;
}

async function rewriteBlog() {
  const articles = await prisma.article.findMany({
    where: { status: "published", indexable: true },
    include: { translations: true },
  });
  let n = 0;
  for (const a of articles) {
    const en = a.translations.find((t) => t.locale === "en");
    const ar = a.translations.find((t) => t.locale === "ar");
    if (!en || !ar) continue;
    const pairs = take6(blogFaqs(en.title, ar.title));
    await prisma.articleI18n.update({
      where: { id: en.id },
      data: { faq: store(pairs.map((p) => p.en)) },
    });
    await prisma.articleI18n.update({
      where: { id: ar.id },
      data: { faq: store(pairs.map((p) => p.ar)) },
    });
    n++;
  }
  return n;
}

async function rewriteLocations() {
  const locs = await prisma.location.findMany({
    where: { status: "active", serves: true },
    include: { translations: true },
  });
  let n = 0;
  for (const loc of locs) {
    const en = loc.translations.find((t) => t.locale === "en");
    const ar = loc.translations.find((t) => t.locale === "ar");
    if (!en || !ar) continue;
    const pairs = take6([
      {
        en: {
          q: `What services can I request in ${en.name}?`,
          a: `Browse active services and submit a quote mentioning ${en.name}. Public Service × Location pages appear only where coverage is verified.`,
        },
        ar: {
          q: `ما الخدمات التي يمكنني طلبها في ${ar.name}؟`,
          a: `تصفح الخدمات المفعّلة وأرسل عرض سعر مع ذكر ${ar.name}. تظهر صفحات الخدمة × الموقع العامة فقط حيث تكون التغطية مؤكدة.`,
        },
      },
      {
        en: {
          q: `Do you have a branch office listed for ${en.name}?`,
          a: `This site does not invent branch addresses. Contact details and licences are listed on the company pages; scheduling is confirmed after your request.`,
        },
        ar: {
          q: `هل لديكم فرع معلن في ${ar.name}؟`,
          a: `لا يخترع هذا الموقع عناوين فروع. تفاصيل الاتصال والرخص مذكورة في صفحات الشركة؛ وتُؤكد الجدولة بعد طلبك.`,
        },
      },
      {
        en: {
          q: `How should I describe my property in ${en.name}?`,
          a: `Include villa/apartment/commercial, community or building name, parking notes, and preferred timing for safer planning.`,
        },
        ar: {
          q: `كيف أصف عقاري في ${ar.name}؟`,
          a: `اذكر فيلا/شقة/تجاري واسم الحي أو المبنى وملاحظات المواقف والتوقيت المفضل لتخطيط أكثر أماناً.`,
        },
      },
      {
        en: {
          q: `Are same-day visits guaranteed in ${en.name}?`,
          a: `No. Timing depends on demand, access, and confirmed scope. The team confirms after reviewing your request.`,
        },
        ar: {
          q: `هل الزيارات في نفس اليوم مضمونة في ${ar.name}؟`,
          a: `لا. يعتمد التوقيت على الطلب وإمكانية الوصول والنطاق المؤكد. يؤكد الفريق بعد مراجعة طلبك.`,
        },
      },
      {
        en: {
          q: `Can DIY guides help before a visit in ${en.name}?`,
          a: `Yes—use published GREEN DIY guides for low-risk checks, then escalate via Get a Quote if symptoms continue.`,
        },
        ar: {
          q: `هل تساعد أدلة الأعمال اليدوية قبل الزيارة في ${ar.name}؟`,
          a: `نعم—استخدم أدلة الأعمال اليدوية الخضراء المنشورة للفحوصات منخفضة المخاطر، ثم صعّد عبر طلب عرض سعر إذا استمرت الأعراض.`,
        },
      },
      {
        en: {
          q: `How do I start a request for work in ${en.name}?`,
          a: `Open Get a Quote, name the service, mention ${en.name}, and add symptoms plus access notes for a human review.`,
        },
        ar: {
          q: `كيف أبدأ طلباً للعمل في ${ar.name}؟`,
          a: `افتح طلب عرض سعر، واسم الخدمة، واذكر ${ar.name}، وأضف الأعراض وملاحظات الوصول لمراجعة بشرية.`,
        },
      },
    ]);
    await prisma.locationI18n.update({
      where: { id: en.id },
      data: { faq: store(pairs.map((p) => p.en)) },
    });
    await prisma.locationI18n.update({
      where: { id: ar.id },
      data: { faq: store(pairs.map((p) => p.ar)) },
    });
    n++;
  }
  return n;
}

async function main() {
  const report = {
    at: new Date().toISOString(),
    targetPerPage: TARGET,
    global: await rewriteGlobal(),
    services: await rewriteServices(),
    diy: await rewriteDiy(),
    serviceLocation: await rewriteSl(),
    blog: await rewriteBlog(),
    locations: await rewriteLocations(),
  };
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
