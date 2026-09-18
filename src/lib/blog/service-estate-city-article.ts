/**
 * Blog article for one service × estate (community) × city triple.
 * Title/slug pattern: {service} + {estate} + {city}
 */
import { topicWebpForServiceSlug } from "@/lib/media/topic-webp";
import { buildArabicSecSlug } from "@/lib/slug/arabic-slug";

export type SecInput = {
  serviceSlug: string;
  serviceNameEn: string;
  serviceNameAr: string;
  categorySlug: string;
  estateSlug: string;
  estateNameEn: string;
  estateNameAr: string;
  citySlug: string;
  cityNameEn: string;
  cityNameAr: string;
};

export type SecArticle = {
  slug: string;
  categorySlugs: string[];
  heroImage: string;
  relatedServiceSlugs: string[];
  en: LocaleFields;
  ar: LocaleFields;
};

type LocaleFields = {
  title: string;
  excerpt: string;
  body: string;
  diySection: string;
  faq: string;
  imageAlt: string;
  seoTitle: string;
  metaDescription: string;
};

const BRAND_EN = "Al Najah Al Daem · Fixpoint";

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function words(text: string) {
  return text.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Primary public SEC slug is Arabic Unicode: {خدمة}-{منطقة}-{مدينة}.
 * Latin legacy URLs are intentionally not redirected (404).
 */
export function buildSecSlug(serviceNameAr: string, estateNameAr: string, cityNameAr: string) {
  const base = buildArabicSecSlug(serviceNameAr, estateNameAr, cityNameAr);
  if (base.length <= 180) return base;
  const h = hash(`${serviceNameAr}|${estateNameAr}|${cityNameAr}`).toString(36);
  return `${base.slice(0, 170)}-${h}`;
}

function blogCategory(categorySlug: string) {
  if (categorySlug === "cleaning" || categorySlug === "gym" || categorySlug === "sauna") return "cleaning";
  if (categorySlug === "plumbing" || categorySlug === "water-tank") return "plumbing";
  if (categorySlug === "electrical") return "electrical";
  if (categorySlug === "ac") return "air-conditioning";
  if (categorySlug === "painting" || categorySlug === "walls") return "painting-walls";
  if (categorySlug === "general-maintenance") return "building-maintenance";
  return "home-maintenance";
}

function padToWords(body: string, min: number, extra: string) {
  let out = body;
  let n = 0;
  while (words(out) < min && n < 6) {
    out = `${out}\n\n${extra}`;
    n += 1;
  }
  return out;
}

export function composeServiceEstateCityArticle(input: SecInput): SecArticle {
  const slug = buildSecSlug(input.serviceNameAr, input.estateNameAr, input.cityNameAr);
  const enTitle = `${input.serviceNameEn} in ${input.estateNameEn}, ${input.cityNameEn}`;
  const arTitle = `${input.serviceNameAr} في ${input.estateNameAr}، ${input.cityNameAr}`;
  const climateSeed = hash(`${input.serviceSlug}|${input.estateSlug}|${input.citySlug}`);
  const climate = [
    "coastal humidity",
    "summer heat",
    "fine dust on finishes",
    "closed apartment air",
  ][climateSeed % 4]!;
  const climateAr = ["رطوبة ساحلية", "حرّ الصيف", "غبار ناعم على الأسطح", "هواء شقق مغلقة"][climateSeed % 4]!;

  const enBodyCore = [
    `## What is this?`,
    `${enTitle} is a local visitor guide for people who need ${input.serviceNameEn} in ${input.estateNameEn}, ${input.cityNameEn}, United Arab Emirates. It explains the job in plain language, what you can safely notice on site, what to leave alone, and how to send a useful request. Naming this estate and city does not invent a price, a same-day promise, or coverage that has not been confirmed for your building.`,
    `Use this page when the problem is in ${input.estateNameEn} and the job name matches ${input.serviceNameEn}. If the issue is wider than one room or one system, say so on the request so the first visit is planned correctly.`,

    `## Does this apply to my problem?`,
    `Apply ${input.serviceNameEn} in ${input.estateNameEn} when the visible issue matches the job name, not only a broad category. Ask three questions. Is the problem limited to one point in ${input.estateNameEn}? Has it appeared once or returned? Can you describe it without opening sealed covers? If you cannot answer the third safely, stop and request a technician visit instead of exploring.`,
    `This guide is written for ${input.cityNameEn} homes and small workplaces, including apartments and villas in ${input.estateNameEn}. Nearby emirates share the same climate patterns, but your access notes should still name ${input.cityNameEn} and the estate.`,

    `## Common signs in ${input.estateNameEn}`,
    `People usually request ${input.serviceNameEn} after the result looks uneven, noisy, stained, slow, or simply different from last month. In ${input.estateNameEn}, ${climate} can make the same fault look worse without changing what the job actually is. Write the sign in plain words, then add the job name so the request is not only a symptom.`,
    `Record where it is, which room, whether it affects one point or several, whether it started after cleaning, rain, travel, a new appliance, or building work, and whether anyone already tried a reset or a wipe. Those details change the visit in ${input.cityNameEn}.`,

    `## Common causes, without a remote diagnosis`,
    `${input.serviceNameEn} is needed because wear, dirt, a loose fitting, a blocked path, a finish that was covered too soon, or a previous repair that did not match the part can fail in repeatable ways. ${climate.charAt(0).toUpperCase()}${climate.slice(1)} in the UAE is context, not a remote diagnosis. Do not decide the cause from a chat photo alone.`,
    `If several rooms in ${input.estateNameEn} show the same sign, say so. That may mean inspection first. If only one item failed after a known event, name the event. That sentence often saves a second visit in ${input.cityNameEn}.`,

    `## What not to do`,
    `Do not strip a large area to see what happens. Do not mix cleaning products. Do not stand on furniture for height. Do not hide a stain, crack, or leak under a new finish before someone has seen it in ${input.estateNameEn}. Do not open electrical, gas, or sealed cooling parts from a general video. Isolation you already use every day is fine. Exploration is not.`,

    `## When to call a professional`,
    `Call for ${input.serviceNameEn} in ${input.estateNameEn} when the sign returns, when access is awkward, or when the problem is near water, gas, height, or electricity. Also call when the item is in a shared building area and you are not sure who may authorise work. Send photos and the exact job name plus ${input.estateNameEn}, ${input.cityNameEn}.`,
    `Emergency signs override this article. Heat, smoke, sparks, a burning smell, a gas smell, water spreading toward electrics, or a crack that is widening are reasons to leave the area and ask for a person.`,

    `## How ${input.serviceNameEn} usually proceeds`,
    `A useful request names ${input.serviceNameEn}, the property type, ${input.estateNameEn}, ${input.cityNameEn}, and what you already tried. The next step is a review of that information, then a technician visit if the job is accepted for that location. On site, the person confirms whether the work matches the title or a different trade. A quote follows that assessment. This page does not publish a price.`,

    `## What to prepare in ${input.cityNameEn}`,
    `Before you request ${input.serviceNameEn} in ${input.estateNameEn}, gather access notes (floor, parking, lift, security), photos (wide, close, any visible label), a short timeline, and who must approve the visit if the unit is rented. Also write what success looks like for you so the visit is not priced against a different outcome.`,

    `## Local context`,
    `Readers in ${input.cityNameEn} should expect ${climate} to affect how fast marks, smells, and small mechanical faults show up in ${input.estateNameEn}. Shared buildings may require permission before a technician enters a plant room, roof, or corridor. This guide does not invent a branch map. Confirm the visit for your building when you enquire.`,

    `## Direct answers`,
    `What is ${input.serviceNameEn} in ${input.estateNameEn}, ${input.cityNameEn}? It is a location-specific visitor guide for that job and place. Can I start it myself? You can prepare, photograph, and isolate using controls you already use. You should not repair sealed or hazardous systems from this page. What should I send? Photos, the room, ${input.estateNameEn}, ${input.cityNameEn}, and the sentence "${input.serviceNameEn}". What happens next? A person reviews the request and confirms whether that job can be scheduled.`,
  ].join("\n\n");

  const enExtra = [
    `## Questions before you book ${input.serviceNameEn} in ${input.estateNameEn}`,
    `Which room is it in, and is that room used every day? Did the problem start after dust, humidity, a clean, or building work? Is only one item affected? Who can open the door? Is there a pet, a child, or a finished floor that the visit must protect? Have you already bought a part? Readers across ${input.cityNameEn} can use the same list; put the estate name on the request so the schedule is not planned against the wrong community.`,
    `## How to judge the first reply`,
    `Did the person restate ${input.serviceNameEn} rather than a broader category? Did they ask for the photo you already have? Did they avoid a price before seeing access in ${input.estateNameEn}? If those happen, the request is being treated as a real job for ${input.cityNameEn}.`,
  ].join("\n\n");

  const arBodyCore = [
    `## ما هذا؟`,
    `${arTitle} دليل محلي للزائر الذي يحتاج ${input.serviceNameAr} في ${input.estateNameAr}، ${input.cityNameAr}، الإمارات العربية المتحدة. يشرح العمل بلغة واضحة، وما يمكن ملاحظته بأمان، وما يجب تركه، وكيف ترسل طلباً مفيداً. ذكر هذه المنطقة والمدينة لا يخترع سعراً أو وعداً بنفس اليوم أو تغطية غير مؤكدة لمبناك.`,
    `استخدم هذه الصفحة عندما تكون المشكلة في ${input.estateNameAr} واسم العمل يطابق ${input.serviceNameAr}. إذا كانت المشكلة أوسع من غرفة أو نظام واحد، اذكر ذلك في الطلب.`,

    `## هل ينطبق على مشكلتي؟`,
    `طبّق ${input.serviceNameAr} في ${input.estateNameAr} عندما تطابق العلامة الظاهرة اسم العمل لا الفئة العامة فقط. اسأل ثلاثة أسئلة. هل المشكلة محدودة بنقطة واحدة؟ هل ظهرت مرة أم عادت؟ هل تصفها دون فتح أغطية محكمة؟ إذا لم تستطع الإجابة بأمان عن الثالثة، توقف واطلب فنياً.`,
    `هذا الدليل لمنازل وأماكن عمل صغيرة في ${input.cityNameAr}، بما في ذلك الشقق والفلل في ${input.estateNameAr}.`,

    `## علامات شائعة في ${input.estateNameAr}`,
    `غالباً يُطلب ${input.serviceNameAr} بعد أن يبدو الناتج غير متساوٍ أو صاخباً أو متسخاً أو بطيئاً أو مختلفاً عن الشهر الماضي. في ${input.estateNameAr}، ${climateAr} قد تجعل العطل يبدو أسوأ دون تغيير طبيعة العمل. اكتب العلامة بكلام بسيط ثم أضف اسم العمل.`,
    `سجّل المكان والغرفة وهل تؤثر على نقطة واحدة أو عدة نقاط، وهل بدأت بعد تنظيف أو مطر أو سفر أو جهاز جديد أو أعمال بناء.`,

    `## أسباب شائعة دون تشخيص عن بعد`,
    `يُحتاج ${input.serviceNameAr} بسبب التآكل أو الأوساخ أو وصلة مرتخية أو مسار مسدود أو تشطيب غُطي مبكراً أو إصلاح سابق غير مطابق. ${climateAr} في الإمارات سياق وليست تشخيصاً عن بعد. لا تقرر السبب من صورة دردشة وحدها.`,

    `## ما الذي لا تفعله`,
    `لا تُجرّد مساحة كبيرة لتجربة النتيجة. لا تخلط مواد التنظيف. لا تقف على الأثاث للوصول لارتفاع. لا تُخفِ بقعة أو شقاً أو تسرباً تحت تشطيب جديد قبل أن يراه أحد في ${input.estateNameAr}. لا تفتح أجزاء كهربائية أو غاز أو تبريد محكمة من فيديو عام.`,

    `## متى تستدعي محترفاً`,
    `اطلب ${input.serviceNameAr} في ${input.estateNameAr} عندما تعود العلامة، أو يصعب الوصول، أو تكون المشكلة قرب ماء أو غاز أو ارتفاع أو كهرباء. أرسل صوراً واسم العمل مع ${input.estateNameAr} و${input.cityNameAr}.`,
    `علامات الطوارئ تلغي هذا المقال: حرارة أو دخان أو شرر أو رائحة حريق أو غاز أو ماء يقترب من الكهرباء أو شق يتسع.`,

    `## كيف يسير العمل عادة`,
    `الطلب المفيد يسمي ${input.serviceNameAr} ونوع العقار و${input.estateNameAr} و${input.cityNameAr} وما جرّبته. الخطوة التالية مراجعة المعلومات ثم زيارة إن قُبل العمل لذلك الموقع. في الموقع يؤكد الفني إن العمل يطابق العنوان أو يحتاج حرفة أخرى. العرض يأتي بعد المعاينة. هذه الصفحة لا تنشر سعراً.`,

    `## ماذا تجهّز في ${input.cityNameAr}`,
    `قبل طلب ${input.serviceNameAr} في ${input.estateNameAr} اجمع ملاحظات الوصول والصور وخطّاً زمنياً قصيراً ومن يعتمد الزيارة إن كانت الوحدة مستأجرة. اكتب أيضاً كيف يبدو النجاح بالنسبة لك.`,

    `## السياق المحلي`,
    `في ${input.cityNameAr} يُتوقع أن تؤثر ${climateAr} على سرعة ظهور العلامات في ${input.estateNameAr}. المباني المشتركة قد تتطلب إذناً قبل دخول غرفة معدات أو سطح أو ممر. أكّد الزيارة لمبناك عند الاستفسار.`,

    `## إجابات مباشرة`,
    `ما هو ${input.serviceNameAr} في ${input.estateNameAr}، ${input.cityNameAr}؟ دليل زائر محلي لذلك العمل والمكان. هل أبدأ بنفسي؟ يمكنك التحضير والتصوير والعزل بأدوات تستخدمها يومياً. لا تُصلح أنظمة محكمة أو خطرة من هذه الصفحة. ماذا أرسل؟ صوراً والغرفة و${input.estateNameAr} و${input.cityNameAr} والجملة "${input.serviceNameAr}".`,
  ].join("\n\n");

  const arExtra = [
    `## أسئلة قبل الحجز في ${input.estateNameAr}`,
    `أي غرفة؟ هل تُستخدم يومياً؟ هل بدأت المشكلة بعد غبار أو رطوبة أو تنظيف أو بناء؟ هل تأثر عنصر واحد فقط؟ من يفتح الباب؟ هل هناك حيوان أو طفل أو أرضية نهائية يجب حمايتها؟ ضع اسم المنطقة على الطلب حتى لا يُجدول الموعد لحيّ خاطئ في ${input.cityNameAr}.`,
    `## كيف تقيّم أول رد`,
    `هل أعاد الشخص صياغة ${input.serviceNameAr} بدل فئة أوسع؟ هل طلب الصورة التي لديك؟ هل تجنب السعر قبل رؤية الوصول في ${input.estateNameAr}؟ إن حدث ذلك فالطالب يُعامل كعمل حقيقي لـ${input.cityNameAr}.`,
  ].join("\n\n");

  const enDiy = [
    `Safe next actions for ${input.serviceNameEn} in ${input.estateNameEn}:`,
    `1. Clear a path and note floor, parking, and security for ${input.estateNameEn}.`,
    `2. Photograph one wide shot, one close shot, and any visible label.`,
    `3. Write when the problem started and whether it is getting worse in ${input.cityNameEn}.`,
    `4. Use only switches or taps you already use every day; do not open sealed covers.`,
    `5. Stop if you see heat, smoke, sparks, gas smell, or water near electrics.`,
  ].join("\n");

  const arDiy = [
    `خطوات آمنة لـ${input.serviceNameAr} في ${input.estateNameAr}:`,
    `1. مهّد المسار وسجّل الطابق والموقف والأمن لـ${input.estateNameAr}.`,
    `2. صوّر لقطة واسعة وأخرى قريبة وأي ملصق ظاهر.`,
    `3. اكتب متى بدأت المشكلة وهل تزداد سوءاً في ${input.cityNameAr}.`,
    `4. استخدم فقط المفاتيح أو الحنفيات التي تستخدمها يومياً؛ لا تفتح أغطية محكمة.`,
    `5. توقف عند حرارة أو دخان أو شرر أو رائحة غاز أو ماء قرب الكهرباء.`,
  ].join("\n");

  const enFaq = JSON.stringify([
    {
      q: `What does ${input.serviceNameEn} in ${input.estateNameEn} cover?`,
      a: `It starts from the sign you can describe in ${input.estateNameEn}, ${input.cityNameEn}. A technician then says whether the next step is inspection, cleaning, repair, or replacement. The title is not a fixed package or a price.`,
    },
    {
      q: `Can I do ${input.serviceNameEn} myself in ${input.estateNameEn}?`,
      a: `You may prepare, photograph, and isolate using controls you already use. Opening sealed systems or following a generic repair video is not a home task for this job.`,
    },
    {
      q: `Does this page mean you already cover every building in ${input.cityNameEn}?`,
      a: `Name the estate ${input.estateNameEn} and your building on the request. Coverage and timing are confirmed for that address, not assumed from the article title alone.`,
    },
    {
      q: `What should I photograph before requesting ${input.serviceNameEn}?`,
      a: `One wide photo of the room in ${input.estateNameEn}, one close photo of the item, and one of any label already visible. Add when it started and whether it is getting worse in ${input.cityNameEn}.`,
    },
    {
      q: `Which service should I open after this guide?`,
      a: `Open the service page for ${input.serviceSlug}, then send a quote request that repeats ${input.serviceNameEn}, ${input.estateNameEn}, and ${input.cityNameEn}.`,
    },
  ]);

  const arFaq = JSON.stringify([
    {
      q: `ماذا يغطي ${input.serviceNameAr} في ${input.estateNameAr}؟`,
      a: `يبدأ من العلامة التي تصفها في ${input.estateNameAr}، ${input.cityNameAr}. ثم يقول الفني إن الخطوة التالية معاينة أو تنظيف أو إصلاح أو استبدال. العنوان ليس باقة ثابتة ولا سعراً.`,
    },
    {
      q: `هل أنفّذ ${input.serviceNameAr} بنفسي في ${input.estateNameAr}؟`,
      a: `يمكنك التحضير والتصوير والعزل بأدوات تستخدمها يومياً. فتح أنظمة محكمة أو اتباع فيديو إصلاح عام ليس مهمة منزلية لهذا العمل.`,
    },
    {
      q: `هل تعني الصفحة تغطية كل مبنى في ${input.cityNameAr}؟`,
      a: `اذكر المنطقة ${input.estateNameAr} ومبناك في الطلب. التغطية والوقت يُؤكدان لذلك العنوان ولا يُفترضان من عنوان المقال وحده.`,
    },
    {
      q: `ماذا أصوّر قبل طلب ${input.serviceNameAr}؟`,
      a: `لقطة واسعة للغرفة في ${input.estateNameAr} ولقطة قريبة وأي ملصق ظاهر. أضف وقت البداية وهل تزداد سوءاً في ${input.cityNameAr}.`,
    },
    {
      q: `أي صفحة خدمة أفتح بعد هذا الدليل؟`,
      a: `افتح صفحة الخدمة ${input.serviceSlug} ثم أرسل طلب عرض يكرر ${input.serviceNameAr} و${input.estateNameAr} و${input.cityNameAr}.`,
    },
  ]);

  const enBody = padToWords(enBodyCore, 1000, enExtra);
  const arBody = padToWords(arBodyCore, 1000, arExtra);

  const enSeoBase = `${enTitle} | ${BRAND_EN}`;
  const enSeo =
    enSeoBase.length <= 70
      ? enSeoBase
      : `${input.serviceNameEn.slice(0, 28)} in ${input.estateNameEn.slice(0, 16)} | ${BRAND_EN}`.slice(0, 70);
  const enSeoFinal = enSeo.includes("Fixpoint") ? enSeo : `${input.serviceNameEn.slice(0, 40)} | ${BRAND_EN}`.slice(0, 70);

  const arSeo = `${arTitle} | النجاح الدائم · فكس بوينت`.slice(0, 90);
  const enMeta =
    `${input.serviceNameEn} in ${input.estateNameEn}, ${input.cityNameEn}: signs, what not to touch, what to photograph, and how to request the job without assuming a price.`.slice(
      0,
      160,
    );
  const arMeta =
    `${input.serviceNameAr} في ${input.estateNameAr}، ${input.cityNameAr}: العلامات وما لا تلمسه وما تصوّره وكيف تطلب العمل دون افتراض سعر.`.slice(
      0,
      160,
    );

  return {
    slug,
    categorySlugs: [blogCategory(input.categorySlug || "general-maintenance"), "uae-local-guides", "service-location"],
    heroImage: topicWebpForServiceSlug(input.serviceSlug) || "/media/topics/general.webp",
    relatedServiceSlugs: [input.serviceSlug],
    en: {
      title: enTitle,
      excerpt: `${input.serviceNameEn} for visitors in ${input.estateNameEn}, ${input.cityNameEn}: what the job is, what to notice, and how to request it.`,
      body: enBody,
      diySection: enDiy,
      faq: enFaq,
      imageAlt: `${input.serviceNameEn} guide image for ${input.estateNameEn}, ${input.cityNameEn}`,
      seoTitle: enSeoFinal,
      metaDescription: enMeta.length >= 70 ? enMeta : `${enMeta} Request a quote with estate and photos.`.slice(0, 160),
    },
    ar: {
      title: arTitle,
      excerpt: `${input.serviceNameAr} للزوار في ${input.estateNameAr}، ${input.cityNameAr}: ما العمل وما تلاحظه وكيف تطلبه.`,
      body: arBody,
      diySection: arDiy,
      faq: arFaq,
      imageAlt: `صورة توضيحية لـ${input.serviceNameAr} في ${input.estateNameAr}، ${input.cityNameAr}`,
      seoTitle: arSeo,
      metaDescription: arMeta.length >= 40 ? arMeta : `${arMeta} اطلب عرضاً مع اسم المنطقة.`,
    },
  };
}
