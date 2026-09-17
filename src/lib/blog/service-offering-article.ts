/**
 * One visitor article per approved offering.
 * Hazardous work gets observation and stop rules, not repair procedures.
 */
import { buildVisitorServiceCopy } from "@/lib/catalog/service-visitor-copy";
import { topicWebpForServiceSlug } from "@/lib/media/topic-webp";

export type OfferingArticleInput = {
  slug: string;
  nameEn: string;
  categorySlug: string;
  categoryNameEn: string;
  href: string;
};

export type OfferingArticle = {
  slug: string;
  categorySlugs: string[];
  heroImage: string;
  relatedServiceSlugs: string[];
  en: {
    title: string;
    excerpt: string;
    body: string;
    diySection: string;
    faq: string;
    imageAlt: string;
    seoTitle: string;
    metaDescription: string;
  };
  ar: {
    title: string;
    excerpt: string;
    body: string;
    diySection: string;
    faq: string;
    imageAlt: string;
    seoTitle: string;
    metaDescription: string;
  };
};

const HAZARD = new Set([
  "electrical",
  "burner-cooker",
  "ac",
  "water-heater",
  "microwave",
  "refrigerator",
  "washing-machine",
  "dishwasher",
  "oven",
]);

const POWERS = [
  ["Practical", "عملي"],
  ["Clear", "واضح"],
  ["Careful", "حذر"],
  ["Direct", "مباشر"],
  ["Prepared", "جاهز"],
  ["Observant", "دقيق"],
  ["Focused", "مركّز"],
] as const;

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

function actionOf(name: string) {
  if (/\binspection\b|\btesting\b|\bcheck\b/i.test(name)) return "inspection";
  if (/\bdiagnosis\b|\bfault finding\b|\bdetection\b/i.test(name)) return "diagnosis";
  if (/\breplacement\b/i.test(name)) return "replacement";
  if (/\binstallation\b|\bwiring\b|\bconnection\b/i.test(name)) return "installation";
  if (/\bcleaning\b|\bdisinfection\b|\bsanitization\b/i.test(name)) return "cleaning";
  if (/\brepair\b|\btreatment\b/i.test(name)) return "repair";
  if (/\bmaintenance\b|\bservicing\b|\bbalancing\b/i.test(name)) return "maintenance";
  return "service";
}

function objectOf(name: string) {
  return name
    .replace(/\b(inspection|testing|diagnosis|fault finding|detection|replacement|installation|cleaning|disinfection|sanitization|repair|treatment|maintenance|servicing|service)\b/gi, " ")
    .replace(/[/&]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || name;
}

function setting(name: string) {
  if (/villa/i.test(name)) return { en: "a villa", ar: "فيلا" };
  if (/apartment/i.test(name)) return { en: "an apartment", ar: "شقة" };
  if (/office|shop|commercial/i.test(name)) return { en: "a workplace", ar: "مكان عمل" };
  if (/outdoor|garden|balcony|pool/i.test(name)) return { en: "an outdoor area", ar: "منطقة خارجية" };
  if (/common area|building/i.test(name)) return { en: "a shared building area", ar: "منطقة مشتركة" };
  return { en: "a home", ar: "منزل" };
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

function hazardous(categorySlug: string, name: string) {
  if (HAZARD.has(categorySlug)) return true;
  if (/\b(gas|refrigerant|heater|electrical|compressor|chemical)\b/i.test(name)) return true;
  return false;
}

export function composeServiceOfferingArticle(input: OfferingArticleInput): OfferingArticle {
  const copy = buildVisitorServiceCopy({
    slug: input.slug,
    nameEn: input.nameEn,
    categorySlug: input.categorySlug,
    categoryNameEn: input.categoryNameEn,
    categoryNameAr: "الخدمة",
  });
  const action = actionOf(input.nameEn);
  const object = objectOf(input.nameEn);
  const place = setting(input.nameEn);
  const danger = hazardous(input.categorySlug, input.nameEn);
  const power = POWERS[hash(input.slug) % POWERS.length]!;
  const climates = [
    "dust settling on finishes and filters",
    "summer heat that makes small faults feel urgent",
    "coastal humidity that shows stains and corrosion sooner",
    "closed apartments that trap odours and moisture",
  ];
  const climate = climates[hash(input.slug) % climates.length]!;
  const climateAr = ["غبار يستقر على الأسطح والفلاتر", "حرّ الصيف الذي يجعل العطل الصغير عاجلاً", "رطوبة ساحلية تُظهر البقع والتآكل أسرع", "شقق مغلقة تحبس الروائح والرطوبة"][hash(input.slug) % 4]!;

  const enTitle = `${power[0]} ${input.nameEn} in UAE Homes, United Arab Emirates`;
  const arTitle = `${power[1]}: ${copy.nameAr} في منازل الإمارات، الإمارات العربية المتحدة`;
  const en = buildEn({ ...input, action, object, place: place.en, danger, climate, copy, enTitle });
  const ar = buildAr({ ...input, action, object, place: place.ar, danger, climate: climateAr, nameAr: copy.nameAr, arTitle });

  return {
    slug: `guide-${input.slug}`,
    categorySlugs: [blogCategory(input.categorySlug), "uae-local-guides"],
    heroImage: topicWebpForServiceSlug(input.slug) || "/media/topics/general.webp",
    relatedServiceSlugs: input.href.startsWith("/") && !input.href.startsWith("/services/") ? [input.slug] : [],
    en,
    ar,
  };
}

function buildEn(opts: {
  slug: string;
  nameEn: string;
  categoryNameEn: string;
  href: string;
  action: string;
  object: string;
  place: string;
  danger: boolean;
  climate: string;
  copy: ReturnType<typeof buildVisitorServiceCopy>;
  enTitle: string;
}) {
  const job = opts.nameEn;
  const obj = opts.object.toLowerCase();
  const diy = opts.danger
    ? [
        `Do not open covers, panels, sealed units, or gas connections for ${job}.`,
        `If you already use a normal wall switch for this area, leave it off and keep people away.`,
        `Photograph the outside only: the room, any stain, any label you can read without removing a cover, and the time the problem started.`,
        `Write what you smelled, heard, or saw. Do not test with tools, water, or a second appliance plugged into the same point.`,
        `If there is heat, smoke, sparks, a burning smell, or a gas smell, leave that room and request help. This article does not give repair steps for that condition.`,
      ]
    : [
        `Clear a path to the area and move breakable items you do not want touched.`,
        `Note when ${job} last looked acceptable, and what changed since then.`,
        `For a surface you already clean yourself, wipe only with the product you already use, then stop if the finish softens, smells strongly, or the mark returns at once.`,
        `Photograph before you move anything, then photograph the same spot after a gentle clean so a technician can see whether the issue is surface or deeper.`,
        `Stop if you find heat, a leak you cannot isolate with a tap you already know, loose plaster, or anything that needs a ladder, a panel, or a chemical mix.`,
      ];

  const body = [
    `## What is this?`,
    `${opts.enTitle} is a visitor guide for people who need ${job} and want to decide the next step before they book. It sits in ${opts.categoryNameEn}. It explains the problem in plain language, what you can safely notice, what to leave alone, and how to send a useful request. Listing this job is not a promise that a visit is already available in every area of the United Arab Emirates.`,
    `${opts.copy.shortEn} Use this page when the words on a service list are clearer than the problem in the room. If you are looking at ${opts.place} and the issue is ${obj || job.toLowerCase()}, start here rather than guessing a broader trade.`,

    `## Does this apply to my problem?`,
    `Use ${job} when the visible issue matches the name of the job, not merely the category. A visitor in ${opts.place} should ask three questions. Is the problem limited to ${obj || "this item"}? Has it appeared once or come back? Can you describe it without opening anything? If the answer to the first is no, a wider inspection may be the better starting request. If the answer to the third is no, stop and book help instead of exploring.`,
    `This guide applies in Dubai, Sharjah, Abu Dhabi, Ajman, and the other emirates when the building use is similar: apartments, villas, small offices, and shared areas. It does not assign a technician, a price, or a visit time. Those are confirmed on the request.`,

    `## Common signs`,
    `People usually request ${job} after one of these signs. The result is uneven, noisy, stained, slow, or simply not what it was last month. In ${opts.place}, ${opts.climate} can make the same fault look worse without changing what the job actually is. Write the sign in the words you would use to a neighbour, then add the job name so the request is not only a symptom.`,
    `Useful signs to record for ${job}: where it is, which room, whether it affects one point or several, whether it started after cleaning, rain, travel, a new appliance, or building work, and whether anyone already tried a reset or a wipe. Those details change the visit. A vague "it is not working" often produces a quote that has to be rewritten after the first look.`,

    `## Common causes, without a remote diagnosis`,
    `${job} exists because ${obj || "this part of the property"} fails in a few repeatable ways. Wear, dirt, a loose fitting, a blocked path, a finish that was covered too soon, or a previous repair that did not match the part are common. ${opts.climate.charAt(0).toUpperCase()}${opts.climate.slice(1)} in the UAE is context, not a cause you should assume. Do not decide the cause from a photo alone, and do not accept a cause from a chat that has not seen the item.`,
    `If several rooms show the same sign, say so. That is different from one failed point and may mean the right first job is inspection rather than ${opts.action}. If only one item failed after a known event, say what the event was. That single sentence often saves a second visit.`,

    `## What not to do`,
    opts.danger
      ? `Do not treat ${job} as a weekend repair. Do not remove screws "just to look", do not bridge a protection device, do not pour water on a warm fitting, and do not follow a general video that opens a sealed system. A wrong step on ${obj || "this equipment"} can injure someone or turn a small fault into a larger one. Isolation you already use every day is fine. Exploration is not.`
      : `Do not strip a large area to see what happens. Do not mix cleaning products. Do not stand on furniture to reach a high spot. Do not hide a stain, crack, or leak under a new finish before someone has seen it. Covering ${obj || "the problem"} makes ${job} harder and can move the cost onto materials that then have to be removed.`,

    `## When to call a professional`,
    `Call for ${job} when the sign returns, when you cannot name the part with confidence, when access is awkward, or when the problem is near water, gas, height, or electricity. Also call when the item is in a shared area and you are not sure who is allowed to authorise work. Send the request for ${opts.place} with photos and the exact job name so the person reading it does not have to guess between similar services.`,
    `Emergency signs override this article. Heat, smoke, sparks, a burning smell, a gas smell, water spreading toward electrics, or a crack that is widening are reasons to leave the area and ask for a person, not to continue reading.`,

    `## How ${job} usually proceeds`,
    `A useful request names ${job}, the property type, the emirate, and what you already tried. The next step is a look at that information, then a technician visit if the job is accepted for that location. On site, the person confirms whether the work is ${opts.action}, a smaller clean, or a different trade. A quote follows that assessment. This page does not publish a price or a promise of same-day arrival.`,
    `After the work, you should be able to say what was found, what was done, and what you should watch for over the next few days. If the finding does not match the name ${job}, ask for that difference in writing before you approve a wider scope.`,

    `## What to prepare`,
    `Before you request ${job}, gather this. Access notes: floor, parking, lift, and whether a key or security pass is needed. Photos: one wide, one close, one of any label that is already visible. A short timeline: first noticed, how often, last time it was acceptable. Names of products or parts already used. The emirate and whether this is ${opts.place}. If the issue is in a rented unit, note who must approve the visit.`,
    `Also write what success looks like for you. "The stain is gone", "the door closes", "the smell stops", or "I want to know if this is safe to leave until next week" are different requests. ${job} is easier to price when the outcome is named.`,

    `## Local context in the United Arab Emirates`,
    `Readers in the UAE should expect ${opts.climate} to affect how fast marks, smells, and small mechanical faults show up. Apartments in Dubai and Sharjah, villas in Abu Dhabi, and coastal homes in Ajman do not need a different article, but they do need an honest access note. Shared buildings may require permission before a technician enters a plant room, roof, or common corridor. This guide does not invent a branch, a license, or a coverage map. Confirm the visit for your building when you enquire.`,

    `## Direct answers`,
    `What is ${job}? It is a specific ${opts.categoryNameEn} offering for ${obj || "the problem named in the title"}, not a general visit. Can I start it myself? ${opts.danger ? "You can record and isolate using controls you already use. You should not repair it from this page." : "You can prepare the area and make a gentle surface check. Stop if the problem is deeper than the surface."} What should I send? Photos, the room, the emirate, and the sentence "${job}". What happens next? A person reviews the request and confirms whether that job can be scheduled. Where do I start? Open ${opts.href} or send the same details through the quote form.`,
  ].join("\n\n");

  const diySection = [`Safe next actions for ${job}:`, ...diy.map((line, i) => `${i + 1}. ${line}`)].join("\n");

  const faq = JSON.stringify([
    {
      q: `What does ${job} cover?`,
      a: `${job} starts from the sign you can describe. A technician then says whether the next step is inspection, cleaning, repair, or replacement. The name of the job is not a fixed package and not a price.`,
    },
    {
      q: `Can I do ${job} myself in ${opts.place}?`,
      a: opts.danger
        ? `No repair steps are published for ${job}. You may switch off a control you already use, keep people away, and photograph the outside. Opening the item is not a home task.`
        : `Prepare the area and record what changed. A light surface clean you already do is fine. Stop if the problem returns immediately or needs tools, height, or opening a fitting.`,
    },
    {
      q: `Does a page for ${job} mean you already cover my area?`,
      a: `We serve 277 places across the seven emirates. Name the emirate and the building on the request.`,
    },
    {
      q: `What should I photograph before requesting ${job}?`,
      a: `One wide photo of the room, one close photo of ${obj || "the item"}, and one photo of any label that is already visible. Add the time the problem started and whether it is getting worse.`,
    },
    {
      q: `Which page do I open for this job?`,
      a: `The service page is ${opts.href}. Use it after this guide if you want the service description, then send a quote request with the same job name.`,
    },
  ]);

  const excerpt = `${job} for visitors in the UAE: what the job is, what to notice, what to leave alone, and how to request it without guessing a price or a coverage area.`;
  const brandEn = "Al Najah Al Daem · Fixpoint";
  const seoBase = `${opts.enTitle} | ${brandEn}`;
  const seoTitle =
    seoBase.length <= 70
      ? seoBase
      : `${job.slice(0, Math.max(12, 70 - ` in UAE | ${brandEn}`.length))} in UAE | ${brandEn}`.slice(0, 70);
  // Always keep brand suffix visible for publication gates / SERP branding.
  const seoTitleFinal = seoTitle.includes("Fixpoint")
    ? seoTitle
    : `${job.slice(0, 40)} | ${brandEn}`.slice(0, 70);
  const meta = `${job} guide for UAE homes. Learn the signs, what not to touch, what to photograph, and how to request this ${opts.categoryNameEn} job without assuming coverage or a price.`;
  const metaDescription = meta.length >= 70 ? meta.slice(0, 160) : `${meta} Request a quote with your emirate and photos.`.slice(0, 160);

  return {
    title: opts.enTitle,
    excerpt,
    body: body.length && words(body) < 1000 ? `${body}\n\n${extraEn(opts)}` : body,
    diySection,
    faq,
    imageAlt: `${job} guide image for a UAE property`,
    seoTitle: seoTitleFinal,
    metaDescription,
  };
}

function extraEn(opts: { nameEn: string; object: string; place: string; categoryNameEn: string; danger: boolean }) {
  const job = opts.nameEn;
  const obj = opts.object.toLowerCase() || job.toLowerCase();
  return [
    `## Questions to answer before you book ${job}`,
    `A clear request for ${job} answers these in order. Which room is it in, and is that room used every day? Did the problem start after dust, humidity, a clean, or building work? Is ${obj} the only thing affected, or did a nearby item change at the same time? Who can be there to open the door? Is there a pet, a child, or a finished floor that the visit must protect? Have you already bought a part, and do you want that part used or only inspected?`,
    `If you cannot answer one of those, say so. Unknown is more useful than a guess. For ${opts.place}, also say the floor and whether the technician needs building security approval. Readers in Sharjah, Dubai, Abu Dhabi, and Ajman can use the same list. The emirate name belongs on the request so the schedule is not planned against the wrong city.`,
    `## How to judge whether ${job} was the right request`,
    `After the first reply, check three things. Did the person restate ${job} rather than a broader category? Did they ask for the photo you already have, instead of a new diagnosis over chat? Did they avoid a price before seeing the access and the part? If those three happen, the request is being treated as a real job. If you are pushed to approve ${obj} replacement before anyone has seen it, pause and ask for the finding first.`,
    opts.danger
      ? `Keep children and visitors out of the immediate area until ${job} has been assessed. Do not use the waiting time to try a tutorial. The useful work you can do is the note, the photo, and the isolation you already understand.`
      : `While you wait, leave the area as it is after your photos. A second clean, a coat of paint, or a moved piece of furniture makes ${job} harder to judge. If the problem is only visual and not spreading, waiting is reasonable. If it worsens, say that in a follow-up message.`,
  ].join("\n\n");
}

function buildAr(opts: {
  slug: string;
  nameEn: string;
  categoryNameEn: string;
  href: string;
  action: string;
  object: string;
  place: string;
  danger: boolean;
  climate: string;
  nameAr: string;
  arTitle: string;
}) {
  const job = opts.nameAr;
  const body = [
    `## ما هذا الموضوع؟`,
    `${opts.arTitle} دليل للزائر الذي يحتاج ${job} ويريد أن يقرر الخطوة التالية قبل الحجز. الخدمة ضمن ${opts.categoryNameEn}. يشرح المشكلة بلغة واضحة، وما يمكن ملاحظته بأمان، وما يُترك كما هو، وكيف تُرسل طلباً مفيداً. ذكر هذه الخدمة لا يعني أن الزيارة متاحة في كل منطقة من الإمارات العربية المتحدة.`,
    `ابدأ من هنا إذا كان اسم الخدمة أوضح من وصف المشكلة في الغرفة. إذا كنت في ${opts.place} والمشكلة تطابق اسم ${job}، لا تخمّن تخصصاً أوسع قبل أن تقرأ علامات التوقف.`,

    `## هل ينطبق هذا على مشكلتي؟`,
    `استخدم ${job} عندما يطابق ما تراه اسم الخدمة، لا مجرد الفئة. اسأل: هل المشكلة محدودة بهذا الجزء؟ هل ظهرت مرة أم عادت؟ هل تستطيع وصفها دون فتح أي غطاء؟ إذا كانت الإجابة على السؤال الأول لا، فقد يكون الفحص العام بداية أفضل. إذا كانت الإجابة على السؤال الثالث لا، فتوقف واطلب مساعدة بدل الاستكشاف.`,
    `ينطبق الدليل على قرّاء دبي والشارقة وأبوظبي وعجمان وبقية الإمارات عندما يكون استخدام المبنى متشابهاً: شقق، فلل، مكاتب صغيرة، ومناطق مشتركة. لا يعيّن فنياً ولا سعراً ولا وقت زيارة. يُؤكد ذلك على الطلب.`,

    `## العلامات الشائعة`,
    `يطلب الناس ${job} عادة بعد علامة واحدة: نتيجة غير متساوية، أو صوت، أو بقعة، أو بطء، أو فرق واضح عن الشهر الماضي. في ${opts.place}، ${opts.climate} قد يجعل العطل أظهر من غير أن يغيّر نوع العمل. اكتب العلامة كما تصفها لجارك، ثم أضف اسم الخدمة حتى لا يبقى الطلب عرضاً فقط.`,
    `سجّل لـ ${job}: المكان، والغرفة، وهل تأثر نقطة واحدة أم عدة نقاط، وهل بدأ الأمر بعد تنظيف أو مطر أو سفر أو جهاز جديد أو أعمال في المبنى، وهل حاول أحد إعادة ضبط أو مسحاً. هذه التفاصيل تغيّر الزيارة. جملة "لا يعمل" وحدها غالباً تُنتج عرض سعر يُعاد بعد النظرة الأولى.`,

    `## أسباب شائعة من غير تشخيص عن بُعد`,
    `${job} موجود لأن هذا الجزء يتعطل بطرق تتكرر: تآكل، أوساخ، قطعة مرتخية، مسار مسدود، تشطيب غُطّي قبل أن يجف، أو إصلاح سابق لم يطابق القطعة. ${opts.climate} سياق في الإمارات، وليس سبباً تفترضه. لا تقرر السبب من صورة وحدها، ولا تقبل سبباً من محادثة لم ترَ القطعة.`,
    `إذا ظهرت العلامة نفسها في عدة غرف، فاذكر ذلك. هذا يختلف عن نقطة واحدة فاشلة، وقد يعني أن البداية الصحيحة فحص لا ${opts.action}. إذا تعطلت قطعة واحدة بعد حدث معروف، فاذكر الحدث. هذه الجملة كثيراً ما توفر زيارة ثانية.`,

    `## ما الذي يجب تجنّبه؟`,
    opts.danger
      ? `لا تعامل ${job} كإصلاح لنهاية الأسبوع. لا تفك البراغي "للنظر فقط"، ولا تجسر جهاز حماية، ولا تصب ماء على قطعة دافئة، ولا تتبع مقطعاً يفتح نظاماً مغلقاً. خطوة خاطئة قد تؤذي شخصاً أو تحوّل عطلاً صغيراً إلى عطل أكبر. إيقاف مفتاح تستخدمه يومياً مقبول. الاستكشاف ليس كذلك.`
      : `لا تقشّر مساحة واسعة لترى ماذا يحدث. لا تخلط مواد تنظيف. لا تقف على الأثاث للوصول إلى مكان مرتفع. لا تخفِ بقعة أو شرخاً أو تسرباً تحت تشطيب جديد قبل أن يراه أحد. تغطية المشكلة تجعل ${job} أصعب وقد تنقل التكلفة إلى مواد يجب إزالتها لاحقاً.`,

    `## متى تستدعي محترفاً؟`,
    `اطلب ${job} عندما تعود العلامة، أو عندما لا تستطيع تسمية الجزء بثقة، أو عندما يكون الوصول صعباً، أو عندما تكون المشكلة قرب ماء أو غاز أو ارتفاع أو كهرباء. واطلب أيضاً إذا كانت المنطقة مشتركة ولست متأكداً ممن يصرّح بالعمل. أرسل الطلب عن ${opts.place} مع الصور واسم الخدمة حتى لا يخمّن القارئ بين خدمات متشابهة.`,
    `علامات الطوارئ تلغي هذا المقال. سخونة أو دخان أو شرر أو رائحة احتراق أو رائحة غاز أو ماء يتجه إلى الكهرباء أو شرخ يتسع: اترك المكان واطلب شخصاً، ولا تتابع القراءة.`,

    `## كيف يسير ${job} عادة؟`,
    `الطلب المفيد يسمّي ${job} ونوع العقار والإمارة وما الذي جرّبته. الخطوة التالية مراجعة هذه المعلومات، ثم زيارة فني إذا قُبل العمل لذلك الموقع. في الموقع يؤكد الشخص إن كان المطلوب ${opts.action} أو تنظيفاً أصغر أو تخصصاً آخر. يُعرض السعر بعد هذا التقييم. هذه الصفحة لا تنشر سعراً ولا وعداً بوصول في اليوم نفسه.`,
    `بعد العمل ينبغي أن تستطيع أن تقول ماذا وُجد، وما الذي تم، وما الذي تراقب خلال الأيام التالية. إذا لم تطابق النتيجة اسم ${job}، فاطلب الفرق كتابة قبل أن توافق على نطاق أوسع.`,

    `## ماذا تجهّز؟`,
    `قبل طلب ${job} جهّز الآتي. ملاحظات الوصول: الطابق، والمواقف، والمصعد، وهل يلزم مفتاح أو تصريح. صور: صورة واسعة، وصورة قريبة، وصورة لأي ملصق ظاهر من غير فك غطاء. خط زمني قصير: أول ملاحظة، والتكرار، وآخر مرة كان الوضع مقبولاً. أسماء المواد أو القطع المستخدمة. الإمارة وهل هذا ${opts.place}. إذا كانت الوحدة مستأجرة، فاذكر من يوافق على الزيارة.`,
    `اكتب أيضاً كيف يبدو النجاح لك. "تزول البقعة" أو "يغلق الباب" أو "تتوقف الرائحة" أو "أريد أن أعرف إن كان يمكن تركه إلى الأسبوع القادم" طلبات مختلفة. يسهل تسعير ${job} عندما يُسمّى الناتج.`,

    `## السياق المحلي في الإمارات العربية المتحدة`,
    `ينبغي أن يتوقع القارئ في الإمارات أن ${opts.climate} يؤثر في سرعة ظهور البقع والروائح والأعطال الصغيرة. الشقق في دبي والشارقة، والفلل في أبوظبي، والبيوت الساحلية في عجمان لا تحتاج مقالاً مختلفاً، لكنها تحتاج ملاحظة وصول صادقة. المباني المشتركة قد تشترط إذناً قبل دخول غرفة معدات أو سطح أو ممر مشترك. هذا الدليل لا يخترع فرعاً ولا رخصة ولا خريطة تغطية. أكّد الزيارة لمبناك عند الاستفسار.`,

    `## إجابات مباشرة`,
    `ما هو ${job}؟ خدمة محددة ضمن ${opts.categoryNameEn}، وليست زيارة عامة. هل أبدأ بنفسي؟ ${opts.danger ? "يمكنك التسجيل والعزل بمفاتيح تستخدمها أصلاً. لا تُصلح من هذه الصفحة." : "يمكنك تجهيز المكان وإجراء فحص سطحي لطيف. توقف إذا كانت المشكلة أعمق من السطح."} ماذا أرسل؟ صوراً، والغرفة، والإمارة، وجملة "${job}". ماذا بعد؟ يراجع شخص الطلب ويؤكد إن كان يمكن جدولة هذه الخدمة. من أين أبدأ؟ افتح ${opts.href} أو أرسل التفاصيل نفسها في نموذج عرض السعر.`,

    `## أسئلة تجيب عنها قبل حجز ${job}`,
    `الطلب الواضح لـ ${job} يجيب بالترتيب. في أي غرفة، وهل تُستخدم كل يوم؟ هل بدأ الأمر بعد غبار أو رطوبة أو تنظيف أو أعمال؟ هل هذا الجزء وحده المتأثر أم تغيّر شيء قريب في الوقت نفسه؟ من سيفتح الباب؟ هل يوجد طفل أو حيوان أو أرضية يجب حمايتها؟ هل اشتريت قطعة وتريد استخدامها أم فحصها فقط؟`,
    `إذا لم تعرف إجابة، فاكتب أنك لا تعرف. المجهول أنفع من التخمين. لـ ${opts.place} اذكر الطابق وهل يحتاج الفني موافقة أمن المبنى. قرّاء الشارقة ودبي وأبوظبي وعجمان يستخدمون القائمة نفسها. اسم الإمارة يكون في الطلب حتى لا يُخطط الموعد على مدينة خاطئة.`,
    `## كيف تحكم أن ${job} كان الطلب الصحيح؟`,
    `بعد أول رد، راجع ثلاثة أمور. هل أعاد الشخص اسم ${job} لا اسم الفئة فقط؟ هل طلب الصورة التي لديك بدل تشخيص في المحادثة؟ هل تجنّب السعر قبل رؤية الوصول والقطعة؟ إذا حدثت الثلاثة، فالطلب يُعامل كعمل حقيقي. إذا دُفعت للموافقة على استبدال قبل أن يرى أحد القطعة، فتوقف واطلب النتيجة أولاً.`,
    opts.danger
      ? `أبقِ الأطفال والزوّار خارج المكان المباشر إلى أن يُقيَّم ${job}. لا تستخدم وقت الانتظار لتجربة درس مصوّر. العمل المفيد الذي يمكنك القيام به هو الملاحظة والصورة والعزل الذي تفهمه أصلاً.`
      : `أثناء الانتظار اترك المكان كما هو بعد الصور. تنظيف ثانٍ أو طبقة دهان أو تحريك قطعة أثاث يجعل الحكم على ${job} أصعب. إذا كانت المشكلة ظاهرة فقط ولا تنتشر، فالانتظار معقول. إذا ساءت، فاذكر ذلك في رسالة متابعة.`,
  ].join("\n\n");

  const diy = opts.danger
    ? [
        `لا تفتح أغطية أو لوحات أو وحدات مغلقة أو وصلات غاز من أجل ${job}.`,
        `إذا كنت تستخدم مفتاح حائط عادياً لهذه المنطقة، فاتركه مغلقاً وأبعد الناس.`,
        `صوّر الخارج فقط: الغرفة، وأي بقعة، وأي ملصق تقرأه من غير فك غطاء، ووقت بدء المشكلة.`,
        `اكتب ما شممته أو سمعته أو رأيته. لا تختبر بأدوات أو ماء أو جهاز ثانٍ على النقطة نفسها.`,
        `إذا كانت هناك سخونة أو دخان أو شرر أو رائحة احتراق أو رائحة غاز، فاترك الغرفة واطلب مساعدة. هذا المقال لا يعطي خطوات إصلاح لهذه الحالة.`,
      ]
    : [
        `أفسح طريقاً إلى المكان وأبعد ما لا تريد أن يُلمس.`,
        `سجّل متى كان ${job} مقبولاً آخر مرة، وما الذي تغيّر بعده.`,
        `للسطح الذي تنظفه أصلاً، امسح فقط بالمادة التي تستخدمها، وتوقف إذا لان التشطيب أو ظهرت رائحة قوية أو عادت العلامة فوراً.`,
        `صوّر قبل أن تحرّك شيئاً، ثم صوّر المكان نفسه بعد مسح لطيف حتى يرى الفني إن كانت المشكلة سطحية أم أعمق.`,
        `توقف إذا وجدت سخونة، أو تسرباً لا تعزله بصنبور تعرفه، أو لياسة مرتخية، أو شيئاً يحتاج سلماً أو لوحة أو خلط مواد.`,
      ];

  const faq = JSON.stringify([
    {
      q: `ماذا يشمل ${job}؟`,
      a: `${job} يبدأ من العلامة التي تصفها. ثم يقول الفني إن كانت الخطوة فحصاً أو تنظيفاً أو إصلاحاً أو استبدالاً. اسم الخدمة ليس باقة ثابتة ولا سعراً.`,
    },
    {
      q: `هل أؤدي ${job} بنفسي في ${opts.place}؟`,
      a: opts.danger
        ? `لا تُنشر خطوات إصلاح لـ ${job}. يمكنك إيقاف مفتاح تستخدمه، وإبعاد الناس، وتصوير الخارج. فتح القطعة ليس عملاً منزلياً.`
        : `جهّز المكان وسجّل ما تغيّر. المسح السطحي الذي تقوم به أصلاً مقبول. توقف إذا عادت المشكلة فوراً أو احتاجت أدوات أو ارتفاعاً أو فتح وصلة.`,
    },
    {
      q: `هل صفحة ${job} تعني أن المنطقة مغطاة؟`,
      a: `نخدم 277 مكاناً في الإمارات السبع. اذكر الإمارة والمبنى في الطلب.`,
    },
    {
      q: `ماذا أصور قبل طلب ${job}؟`,
      a: `صورة واسعة للغرفة، وصورة قريبة للجزء، وصورة لأي ملصق ظاهر. أضف وقت بدء المشكلة وهل تزداد.`,
    },
    {
      q: `أي صفحة أفتح لهذه الخدمة؟`,
      a: `صفحة الخدمة هي ${opts.href}. افتحها بعد هذا الدليل إذا أردت وصف الخدمة، ثم أرسل طلب عرض سعر بالاسم نفسه.`,
    },
  ]);

  const brandAr = "النجاح الدائم · Fixpoint";
  let arSeo = `${opts.arTitle} | ${brandAr}`;
  if (arSeo.length > 80) {
    arSeo = `${job.slice(0, Math.max(8, 80 - ` | ${brandAr}`.length))} | ${brandAr}`.slice(0, 80);
  }
  if (!arSeo.includes("Fixpoint")) arSeo = `${job.slice(0, 40)} | ${brandAr}`.slice(0, 80);
  const arMeta = `دليل ${job} لمنازل الإمارات. العلامات، وما لا يُلمس، وما يُصوَّر، وكيف تطلب الخدمة من غير افتراض تغطية أو سعر.`;
  const arMetaFinal =
    arMeta.trim().length >= 40 ? arMeta.slice(0, 160) : `${arMeta} اذكر الإمارة والصور في الطلب.`.slice(0, 160);

  return {
    title: opts.arTitle,
    excerpt: `${job} لزوّار الإمارات: ما الخدمة، وما تلاحظه، وما تتركه، وكيف تطلبها من غير تخمين سعر أو تغطية.`,
    body,
    diySection: [`إجراءات آمنة تالية لـ ${job}:`, ...diy.map((line, i) => `${i + 1}. ${line}`)].join("\n"),
    faq,
    imageAlt: `صورة دليل ${job} لعقار في الإمارات`,
    seoTitle: arSeo,
    metaDescription: arMetaFinal,
  };
}

export function renderedWordCount(body: string, diy: string, faq: string) {
  let answers = "";
  try {
    const rows = JSON.parse(faq) as Array<{ a?: string }>;
    answers = rows.map((r) => r.a || "").join(" ");
  } catch {
    answers = "";
  }
  return words(`${body}\n${diy}\n${answers}`);
}
