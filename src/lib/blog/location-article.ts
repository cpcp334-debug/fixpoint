/**
 * One visitor guide per published UAE place.
 * These 277 places are the serving areas. Do not invent prices, visit times, or a branch.
 */
import { loadLocationMaster, type MasterLocation } from "../../../prisma/data/location-master";

const EMIRATE_AR: Record<string, string> = {
  "abu-dhabi": "أبوظبي",
  dubai: "دبي",
  sharjah: "الشارقة",
  ajman: "عجمان",
  "umm-al-quwain": "أم القيوين",
  "ras-al-khaimah": "رأس الخيمة",
  fujairah: "الفجيرة",
};

const POWERS = [
  ["Practical", "عملي"],
  ["Clear", "واضح"],
  ["Careful", "حذر"],
  ["Direct", "مباشر"],
  ["Prepared", "جاهز"],
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

function displayAr(row: MasterLocation) {
  if (row.nameAr && row.nameAr !== "REVIEW_REQUIRED" && /[\u0600-\u06FF]/.test(row.nameAr)) return row.nameAr;
  return row.nameEn;
}

function kind(name: string) {
  if (/industrial/i.test(name)) return "industrial";
  if (/island/i.test(name)) return "island";
  if (/\d/.test(name)) return "numbered";
  if (/city|downtown|marina|hills|village|ranch/i.test(name)) return "community";
  return "district";
}

function kindCopy(kindName: string, place: string) {
  if (kindName === "industrial") {
    return {
      en: `${place} is named like a work or industrial area. Write the gate, the warehouse or office block, and whether a security desk must approve the visit. Do not assume a home-cleaning visit and a plant-room visit are the same job.`,
      ar: `${place} يحمل اسماً يشبه منطقة عمل أو منطقة صناعية. اكتب البوابة والمبنى وهل يجب أن يوافق الأمن على الزيارة. لا تفترض أن زيارة منزل وزيارة غرفة معدات عمل واحد.`,
    };
  }
  if (kindName === "island") {
    return {
      en: `${place} is named as an island or island district. Write how a technician reaches it: bridge, public road, or a pass you already use. Do not invent a ferry time or a private landing.`,
      ar: `${place} اسم جزيرة أو منطقة جزيرة. اكتب كيف يصل الفني: جسر أو طريق عام أو تصريح تستخدمه أصلاً. لا تخترع وقت عبارة أو رصيفاً خاصاً.`,
    };
  }
  if (kindName === "numbered") {
    return {
      en: `The number in ${place} matters. Jumeirah and Jumeirah 1 are not the same request, and neither are Nuaimiya and Nuaimiya 2. Put the number in the first line so the visit is not planned for the parent name.`,
      ar: `الرقم في ${place} مهم. الجميرة وJumeirah 1 ليسا الطلب نفسه، وكذلك النعيمية وNuaimiya 2. ضع الرقم في السطر الأول حتى لا يُخطط الموعد على الاسم الأب.`,
    };
  }
  if (kindName === "community") {
    return {
      en: `${place} reads as a named community or city district. Write the cluster, street, or tower if you have it. A community name alone is better than the emirate alone, and a tower name is better than the community alone.`,
      ar: `${place} يُقرأ كمجتمع أو حي مسمّى. اكتب المجموعة أو الشارع أو البرج إن عرفته. اسم المجتمع أفضل من اسم الإمارة وحده، واسم البرج أفضل من اسم المجتمع وحده.`,
    };
  }
  return {
    en: `${place} is specific enough to start a request when you also name the building type. Write apartment, villa, shop, or shared area, and the floor if there is one.`,
    ar: `${place} يكفي لبدء الطلب إذا أضفت نوع المبنى. اكتب شقة أو فيلا أو محلاً أو منطقة مشتركة، والطابق إن وُجد.`,
  };
}

export function locationBlogTargets() {
  return loadLocationMaster().locations.filter((row) => row.type !== "country");
}

export function composeLocationArticle(row: MasterLocation) {
  const master = loadLocationMaster();
  const emirateSlug = row.type === "emirate" ? row.slug : row.emirateSlug || "";
  const emirate = master.locations.find((item) => item.slug === emirateSlug && item.type === "emirate");
  const emirateEn = emirate?.nameEn || row.nameEn;
  const emirateAr = EMIRATE_AR[emirateSlug] || emirateEn;
  const placeEn = row.nameEn;
  const placeAr = displayAr(row);
  const siblings = master.locations
    .filter((item) => item.emirateSlug === emirateSlug && item.slug !== row.slug && item.type !== "country")
    .slice(0, 6)
    .map((item) => item.nameEn);
  const power = POWERS[hash(row.slug) % POWERS.length]!;
  const placeKind = kind(placeEn);
  const local = kindCopy(placeKind, placeEn);
  const href = `/locations/${row.slug}`;
  const enTitle = `${power[0]} ${placeEn} service request guide in ${emirateEn}, United Arab Emirates`;
  const arTitle = `${power[1]}: دليل طلب الخدمة في ${placeAr}، ${emirateAr}`;

  const en = buildEn({ placeEn, emirateEn, local: local.en, siblings, href, enTitle, placeKind });
  const ar = buildAr({ placeEn, placeAr, emirateEn, emirateAr, local: local.ar, siblings, href, arTitle, placeKind });
  return {
    slug: `place-${row.slug}`,
    categorySlugs: ["uae-local-guides", "home-maintenance"],
    heroImage: "/media/topics/general.webp",
    relatedServiceSlugs: [] as string[],
    en,
    ar,
  };
}

function buildEn(opts: {
  placeEn: string;
  emirateEn: string;
  local: string;
  siblings: string[];
  href: string;
  enTitle: string;
  placeKind: string;
}) {
  const place = opts.placeEn;
  const em = opts.emirateEn;
  const nearby = opts.siblings.length ? opts.siblings.join(", ") : em;
  const body = [
    `## What is this?`,
    `${opts.enTitle} helps a visitor in ${place}, ${em}, decide what to send before requesting cleaning or building maintenance. It is a place guide, not a price list and not a promise that a technician is already assigned to ${place}. Open ${opts.href} for the place page, then name the service you actually need.`,
    `Use this page when you know the place better than the trade. People often know they are in ${place} and only later learn whether the job is cleaning, plumbing, electrical, AC, painting, or a general repair. Start with the place, then add the symptom. That order keeps the request honest.`,

    `## Does this apply to my problem?`,
    `Use ${place} when that is the name on the building entrance, the community gate, the tenancy contract, or the map pin you would send a guest. If you are between ${place} and a neighbouring name, pick the name a driver would use, then add the other name in a second line. Nearby names in ${em} include ${nearby}. Choosing the closer name is more useful than choosing the larger emirate and hoping someone guesses.`,
    `${opts.local}`,

    `## Common signs you are ready to request`,
    `You are ready to request from ${place} when you can answer five plain questions. What is wrong, in one sentence? Which room or which part of the building? When did it start? Has it returned? Can someone open the door? If you can answer those, the place name ${place} is enough geography. If you cannot answer the first question, still send ${place} and say you need someone to look before you name the job.`,
    `In the United Arab Emirates, dust, summer heat, and coastal humidity change how fast a small mark, smell, or noise becomes annoying. That is context for ${em}. It is not a diagnosis of your unit in ${place}. Write what you saw, not the climate story you read online.`,

    `## What to write so the visit is useful`,
    `A useful request for ${place} has four parts. First, the place name exactly as ${place}, plus ${em}. Second, the property type: apartment, villa, shop, office, or shared area. Third, the access note: floor, parking, lift, security pass, or gate. Fourth, photos: one wide shot of the approach, one of the room, one of the item. Those four parts are more valuable than a long description of how inconvenient the problem is.`,
    `If ${place} is a numbered district or a named community, add the cluster or tower. If it is an industrial name, add the company or warehouse only if you are allowed to share it. If you rent, say who must approve the visit. If you own, say whether a watchman or family member will meet the technician.`,

    `## What not to do`,
    `Do not treat a published page for ${place} as proof that every service is already scheduled there. Do not invent a visit time. Do not send only the emirate when you know the district. Do not hide a leak, a warm socket, or a smell under a new finish before someone has seen it. Do not open an electrical panel, a gas connection, or a sealed appliance because you are waiting in ${place}. Isolation you already use every day is fine. Exploration is not.`,
    `Do not mix cleaning products while you wait. Do not stand on furniture to reach a high mark. Do not tell the request form that the job is urgent unless water is spreading, you smell burning or gas, or people cannot stay in the room. Those cases need a person, not a longer article.`,

    `## When to call a professional`,
    `Ask for a person when the sign in ${place} returns, when you cannot name the part, when access is awkward, or when the problem is near water, gas, height, or electricity. Also ask when the area is shared and you are not sure who may authorise work. Send ${place} and ${em} with the photos so the reader does not have to guess which community you mean.`,
    `Leave the room if you see heat, smoke, sparks, a burning smell, or a gas smell. That rule does not change because the page is about ${place}. The place name still belongs on the message so help is aimed at the right entrance.`,

    `## How a request for ${place} usually proceeds`,
    `You name ${place}, the emirate ${em}, the service, and what you already tried. A person reads that and confirms whether a visit can be arranged. On site, the technician says whether the work matches the name you sent or whether a different trade should look. A quote follows that look. This guide does not publish a price or a same-day promise for ${place}.`,
    `After the visit you should be able to say what was found, what was done, and what to watch for a few days. If the finding does not match the place access you described, ask for that difference in writing before you approve a wider scope.`,

    `## Preparation checklist for ${place}`,
    `Before you send the request, gather this for ${place}. The exact place name. The emirate, ${em}. The building type. The floor and parking note. A contact who will open the door. Photos taken in daylight if you can. A one-line history: first noticed, how often, last time it was acceptable. If building security in ${place} needs a name in advance, write that too.`,
    `Also write what success looks like. "The smell stops", "the door closes", "I want to know if this can wait a week" are different requests. ${place} is easier to plan when the outcome is named.`,

    `## Local context for ${place}, ${em}`,
    `${place} sits in ${em}, United Arab Emirates. Use that pair on the request so the schedule is not planned against another city with a similar district name. Dubai, Sharjah, Abu Dhabi, and Ajman all have names that can be confused if the emirate is missing. ${em} must stay on the form even when ${place} feels unique to you.`,
    `Shared buildings in ${em} may require permission before a technician enters a plant room, roof, or corridor. Villas may need a gate code. Towers may need a service lift booking. None of that is invented here as a fact about ${place}. It is the list of access facts you should check before the visit, then write the ones that are true for you.`,

    `## Direct answers`,
    `What is this page? A guide for service in ${place}, ${em}. ${place} is one of the 277 places we serve. What should I send? ${place}, ${em}, the service, the building type, access notes, and photos. Where do I start? ${opts.href}, then the quote form. Which nearby names should I not confuse with ${place}? ${nearby}.`,
    `## Next step`,
    `If you are in ${place}, open the place page, choose the service that matches the symptom, and send the four parts above. If you are not sure of the service, still send ${place} and the sentence describing what you see. A clear place plus a clear symptom is enough to start. A guessed trade is not required.`,
    `## Questions a visitor in ${place} should answer`,
    `Before you leave this page, write the answers. Is the problem inside one room of ${place}, or does it appear in a shared corridor or plant area? Did it start after dust, humidity, a clean, travel, or building work? Who can be present, and for how long? Is there a finished floor, a child, or a pet the visit must protect? Have you already bought a part, and do you want it used or only inspected? Unknown is more useful than a guess.`,
    `If ${place} is in a tower, add the tower name. If it is a villa street, add the villa number you are allowed to share. If it is a shop, add the opening hour when someone can meet the technician. Those three cases are different jobs even when the symptom looks the same. ${em} readers in apartments, villas, and small workplaces can use the same checklist. The place name ${place} is what stops the request from becoming a generic emirate enquiry.`,
    `A benefit of naming ${place} first is that you can compare two replies. Did the person restate ${place} rather than only ${em}? Did they ask for the photo you already have? Did they avoid a price before seeing access? If those three happen, the request is being treated as a real place visit. If you are pushed to approve a replacement before anyone has seen ${place}, pause and ask for the finding first.`,
  ].join("\n\n");

  const diy = [
    `Safe preparation in ${place}:`,
    `1. Write ${place}, ${em}, and the building type before you describe the fault.`,
    `2. Photograph the entrance and the item without opening a panel, a gas fitting, or a sealed unit.`,
    `3. Note parking, lift, gate, and who will meet the technician.`,
    `4. If the problem is only a surface mark you already clean yourself, leave it as it is after the photo so it can be judged.`,
    `5. Stop and ask for a person if you see heat, sparks, smoke, a burning smell, a gas smell, or water moving toward electrics.`,
  ].join("\n");

  const faq = JSON.stringify([
    {
      q: `How do I request service in ${place}?`,
      a: `Open ${opts.href}, name the service, and send ${place} plus ${em}, the building type, access notes, and photos. We serve this place. The visit is confirmed when you request it.`,
    },
    {
      q: `Is ${place} the same as ${em}?`,
      a: `No. ${em} is the emirate. ${place} is the more specific name. Send both so the visit is not planned for another district with a similar name.`,
    },
    {
      q: `Does a page for ${place} mean every service is already covered there?`,
      a: `Yes. ${place} is one of the 277 places we serve. Name the service and request the visit for the building.`,
    },
    {
      q: `What if I am between ${place} and a nearby name?`,
      a: `Use the name a driver would use, then add the other name. Nearby names to check include ${nearby}.`,
    },
    {
      q: `What should I not do while I wait in ${place}?`,
      a: `Do not open electrical panels, gas connections, or sealed appliances. Do not hide a leak or a stain under a new finish. Photograph, keep people away from a hazard, and send the place name.`,
    },
  ]);

  return {
    title: opts.enTitle,
    excerpt: `How to request cleaning or maintenance in ${place}, ${em}: what to name, what to photograph, and what a published place does not promise.`,
    body,
    diySection: diy,
    faq,
    imageAlt: `Guide for requesting service in ${place}, ${em}`,
    seoTitle: `${opts.enTitle} | Al Najah Al Daem · Fixpoint`,
    metaDescription: `Request cleaning or maintenance in ${place}, ${em}. Learn what to send, what not to assume, and how a visit is confirmed without a published price.`.slice(0, 160),
  };
}

function buildAr(opts: {
  placeEn: string;
  placeAr: string;
  emirateEn: string;
  emirateAr: string;
  local: string;
  siblings: string[];
  href: string;
  arTitle: string;
  placeKind: string;
}) {
  const place = opts.placeAr;
  const em = opts.emirateAr;
  const nearby = opts.siblings.length ? opts.siblings.join("، ") : opts.emirateEn;
  const body = [
    `## ما هذا الموضوع؟`,
    `${opts.arTitle} يساعد الزائر في ${place}، ${em} على أن يقرر ماذا يرسل قبل طلب تنظيف أو صيانة مبانٍ. هذا دليل مكان، وليس قائمة أسعار ولا وعداً بأن فنياً مكلّف مسبقاً في ${place}. افتح ${opts.href} لصفحة المكان، ثم سمِّ الخدمة التي تحتاجها فعلاً.`,
    `استخدم هذه الصفحة عندما تعرف المكان أكثر مما تعرف التخصص. كثيراً ما يعرف الناس أنهم في ${place} ثم يعرفون لاحقاً إن كان العمل تنظيفاً أو سباكة أو كهرباء أو تكييفاً أو دهاناً أو إصلاحاً عاماً. ابدأ بالمكان ثم أضف العَرَض. هذا الترتيب يُبقي الطلب صادقاً.`,

    `## هل ينطبق هذا على مشكلتي؟`,
    `استخدم ${place} إذا كان هذا الاسم على مدخل المبنى أو بوابة المجتمع أو عقد الإيجار أو دبوس الخريطة الذي ترسله لضيف. إذا كنت بين ${place} واسم مجاور، فاختر الاسم الذي يستخدمه السائق، ثم أضف الاسم الآخر في سطر ثانٍ. أسماء قريبة في ${em} تشمل ${nearby}. اختيار الاسم الأقرب أنفع من اختيار الإمارة وحدها والأمل أن يخمّن أحد.`,
    opts.local,

    `## علامات أنك جاهز للطلب`,
    `أنت جاهز للطلب من ${place} عندما تجيب خمسة أسئلة واضحة. ما العطل في جملة واحدة؟ أي غرفة أو أي جزء من المبنى؟ متى بدأ؟ هل عاد؟ هل يفتح أحد الباب؟ إذا أجبت، فاسم ${place} يكفي كجغرافيا. إذا لم تستطع الإجابة عن السؤال الأول، فأرسل ${place} وقل إنك تحتاج من ينظر قبل أن تسمّي العمل.`,
    `في الإمارات العربية المتحدة يغيّر الغبار وحرّ الصيف والرطوبة الساحلية سرعة إزعاج بقعة أو رائحة أو صوت صغير. هذا سياق لـ ${em}. ليس تشخيصاً لوحدتك في ${place}. اكتب ما رأيته، لا قصة المناخ التي قرأتها.`,

    `## ماذا تكتب حتى تكون الزيارة مفيدة؟`,
    `الطلب المفيد لـ ${place} له أربعة أجزاء. أولاً اسم المكان كما هو ${place} مع ${em}. ثانياً نوع العقار: شقة أو فيلا أو محل أو مكتب أو منطقة مشتركة. ثالثاً ملاحظة الوصول: الطابق والمواقف والمصعد وتصريح الأمن أو البوابة. رابعاً الصور: صورة واسعة للمدخل، وصورة للغرفة، وصورة للقطعة. هذه الأربعة أنفع من وصف طويل لمدى الإزعاج.`,
    `إذا كان ${place} حياً مرقماً أو مجتمعاً مسمّى، فأضف المجموعة أو البرج. إذا كان اسماً صناعياً، فأضف الشركة أو المستودع فقط إذا كان مسموحاً أن تشارك ذلك. إذا كنت مستأجراً، فاذكر من يوافق على الزيارة. إذا كنت المالك، فاذكر هل يقابل الفني حارس أو أحد من العائلة.`,

    `## ما الذي يجب تجنّبه؟`,
    `لا تعامل صفحة منشورة عن ${place} كدليل على أن كل خدمة مجدولة هناك. لا تخترع وقت زيارة. لا ترسل الإمارة وحدها إذا كنت تعرف الحي. لا تخفِ تسرباً أو مقبساً دافئاً أو رائحة تحت تشطيب جديد قبل أن يراه أحد. لا تفتح لوحة كهرباء أو وصلة غاز أو جهازاً مغلقاً لأنك تنتظر في ${place}. إيقاف مفتاح تستخدمه يومياً مقبول. الاستكشاف ليس كذلك.`,
    `لا تخلط مواد تنظيف أثناء الانتظار. لا تقف على الأثاث لتصل إلى علامة عالية. لا تقل في النموذج إن العمل عاجل إلا إذا كان الماء ينتشر، أو شممت احتراقاً أو غازاً، أو لم يعد الناس يستطيعون البقاء في الغرفة. هذه الحالات تحتاج شخصاً، لا مقالاً أطول.`,

    `## متى تستدعي محترفاً؟`,
    `اطلب شخصاً عندما تعود العلامة في ${place}، أو عندما لا تستطيع تسمية الجزء، أو عندما يكون الوصول صعباً، أو عندما تكون المشكلة قرب ماء أو غاز أو ارتفاع أو كهرباء. واطلب أيضاً إذا كانت المنطقة مشتركة ولست متأكداً ممن يصرّح بالعمل. أرسل ${place} و${em} مع الصور حتى لا يخمّن القارئ أي مجتمع تقصد.`,
    `اترك الغرفة إذا رأيت سخونة أو دخاناً أو شرراً أو رائحة احتراق أو رائحة غاز. هذه القاعدة لا تتغيّر لأن الصفحة عن ${place}. اسم المكان يبقى في الرسالة حتى تُوجَّه المساعدة إلى المدخل الصحيح.`,

    `## كيف يسير طلب ${place} عادة؟`,
    `تسمّي ${place} والإمارة ${em} والخدمة وما الذي جرّبته. يقرأ شخص ذلك ويؤكد إن كان يمكن ترتيب زيارة. في الموقع يقول الفني إن كان العمل يطابق الاسم الذي أرسلته أو إن تخصصاً آخر يجب أن ينظر. يُعرض السعر بعد هذه النظرة. هذا الدليل لا ينشر سعراً ولا وعداً بوصول في اليوم نفسه لـ ${place}.`,
    `بعد الزيارة ينبغي أن تستطيع أن تقول ماذا وُجد، وما الذي تم، وما الذي تراقب أياماً. إذا لم تطابق النتيجة وصول المكان الذي وصفته، فاطلب الفرق كتابة قبل أن توافق على نطاق أوسع.`,

    `## قائمة التحضير لـ ${place}`,
    `قبل إرسال الطلب جهّز هذا لـ ${place}. اسم المكان بدقة. الإمارة ${em}. نوع المبنى. الطابق وملاحظة المواقف. من سيفتح الباب. صوراً في ضوء النهار إن أمكن. جملة تاريخ: أول ملاحظة، والتكرار، وآخر مرة كان الوضع مقبولاً. إذا كان أمن المبنى في ${place} يحتاج الاسم مسبقاً، فاكتب ذلك.`,
    `اكتب أيضاً كيف يبدو النجاح. "تتوقف الرائحة" أو "يغلق الباب" أو "أريد أن أعرف إن كان يمكن الانتظار أسبوعاً" طلبات مختلفة. يسهل التخطيط لـ ${place} عندما يُسمّى الناتج.`,

    `## السياق المحلي لـ ${place}، ${em}`,
    `${place} في ${em}، الإمارات العربية المتحدة. استخدم هذا الزوج في الطلب حتى لا يُخطط الموعد على مدينة أخرى فيها حي باسم مشابه. دبي والشارقة وأبوظبي وعجمان فيها أسماء تلتبس إذا غابت الإمارة. يجب أن تبقى ${em} في النموذج حتى لو بدا لك ${place} فريداً.`,
    `المباني المشتركة في ${em} قد تشترط إذناً قبل دخول غرفة معدات أو سطح أو ممر. الفلل قد تحتاج رمز بوابة. الأبراج قد تحتاج حجز مصعد خدمة. لا يُخترع شيء من ذلك هنا كحقيقة عن ${place}. هذه قائمة ما تتحقق منه ثم تكتب ما صحّ عندك.`,

    `## إجابات مباشرة`,
    `ما هذه الصفحة؟ دليل للخدمة في ${place}، ${em}. ${place} من الأماكن الـ 277 التي نخدمها. ماذا أرسل؟ ${place} و${em} والخدمة ونوع المبنى وملاحظات الوصول والصور. من أين أبدأ؟ ${opts.href} ثم نموذج عرض السعر. أي أسماء قريبة لا تخلطها مع ${place}؟ ${nearby}.`,
    `## الخطوة التالية`,
    `إذا كنت في ${place}، فافتح صفحة المكان، واختر الخدمة التي تطابق العَرَض، وأرسل الأجزاء الأربعة أعلاه. إذا لم تعرف الخدمة، فأرسل ${place} والجملة التي تصف ما تراه. مكان واضح مع عَرَض واضح يكفي للبدء. تخمين التخصص ليس شرطاً.`,
    `## أسئلة يجيب عنها الزائر في ${place}`,
    `قبل أن تغادر الصفحة، اكتب الإجابات. هل المشكلة داخل غرفة واحدة في ${place} أم تظهر في ممر مشترك أو غرفة معدات؟ هل بدأت بعد غبار أو رطوبة أو تنظيف أو سفر أو أعمال؟ من يستطيع الحضور ولكم من الوقت؟ هل توجد أرضية مشطبة أو طفل أو حيوان يجب حمايته؟ هل اشتريت قطعة وتريد استخدامها أم فحصها فقط؟ المجهول أنفع من التخمين.`,
    `إذا كان ${place} في برج، فأضف اسم البرج. إذا كان شارع فلل، فأضف رقم الفيلا الذي يجوز أن تشاركه. إذا كان محلاً، فأضف ساعة الفتح التي يمكن فيها مقابلة الفني. هذه ثلاث حالات مختلفة حتى لو بدا العَرَض واحداً. قرّاء ${em} في الشقق والفلل وأماكن العمل الصغيرة يستخدمون القائمة نفسها. اسم ${place} هو ما يمنع الطلب من أن يصبح استفساراً عاماً عن الإمارة.`,
    `فائدة تسمية ${place} أولاً أنك تستطيع مقارنة ردّين. هل أعاد الشخص اسم ${place} لا اسم ${em} فقط؟ هل طلب الصورة التي لديك؟ هل تجنّب السعر قبل رؤية الوصول؟ إذا حدثت الثلاثة، فالطلب يُعامل كزيارة مكان حقيقية. إذا دُفعت للموافقة على استبدال قبل أن يرى أحد ${place}، فتوقف واطلب النتيجة أولاً.`,
  ].join("\n\n");

  const diy = [
    `تحضير آمن في ${place}:`,
    `1. اكتب ${place} و${em} ونوع المبنى قبل أن تصف العطل.`,
    `2. صوّر المدخل والقطعة من غير فتح لوحة أو وصلة غاز أو وحدة مغلقة.`,
    `3. سجّل المواقف والمصعد والبوابة ومن سيقابل الفني.`,
    `4. إذا كانت المشكلة بقعة تنظفها أصلاً، فاتركها كما هي بعد الصورة حتى يمكن الحكم عليها.`,
    `5. توقف واطلب شخصاً إذا رأيت سخونة أو شرراً أو دخاناً أو رائحة احتراق أو رائحة غاز أو ماء يتجه إلى الكهرباء.`,
  ].join("\n");

  const faq = JSON.stringify([
    {
      q: `كيف أطلب خدمة في ${place}؟`,
      a: `افتح ${opts.href}، وسمِّ الخدمة، وأرسل ${place} مع ${em} ونوع المبنى وملاحظات الوصول والصور. نخدم هذا المكان. تُؤكد الزيارة عند الطلب.`,
    },
    {
      q: `هل ${place} هو نفسه ${em}؟`,
      a: `لا. ${em} هي الإمارة. ${place} هو الاسم الأدق. أرسل الاثنين حتى لا يُخطط الموعد على حي آخر باسم مشابه.`,
    },
    {
      q: `هل تخدمون ${place}؟`,
      a: `نعم. ${place} من الأماكن الـ 277 التي نخدمها. اذكر الخدمة واطلب الزيارة للمبنى.`,
    },
    {
      q: `ماذا إذا كنت بين ${place} واسم قريب؟`,
      a: `استخدم الاسم الذي يستخدمه السائق، ثم أضف الاسم الآخر. أسماء قريبة للتحقق: ${nearby}.`,
    },
    {
      q: `ماذا لا أفعل أثناء الانتظار في ${place}؟`,
      a: `لا تفتح لوحات الكهرباء أو وصلات الغاز أو الأجهزة المغلقة. لا تخفِ تسرباً أو بقعة تحت تشطيب جديد. صوّر، وأبعد الناس عن الخطر، وأرسل اسم المكان.`,
    },
  ]);

  return {
    title: opts.arTitle,
    excerpt: `كيف تطلب تنظيفاً أو صيانة في ${place}، ${em}: ماذا تسمّي، وماذا تصوّر، وما الذي لا تعد به الصفحة المنشورة.`,
    body,
    diySection: diy,
    faq,
    imageAlt: `دليل طلب خدمة في ${place}، ${em}`,
    seoTitle: `${opts.arTitle} | النجاح الدائم · Fixpoint`.slice(0, 80),
    metaDescription: `اطلب تنظيفاً أو صيانة في ${place}، ${em}. ماذا ترسل، وماذا لا تفترض، وكيف تُؤكد الزيارة من غير سعر منشور.`.slice(0, 160),
  };
}

export function renderedBlogWords(body: string, diy: string, faq: string) {
  let answers = "";
  try {
    answers = (JSON.parse(faq) as Array<{ a?: string }>).map((row) => row.a || "").join(" ");
  } catch {
    answers = "";
  }
  return words(`${body}\n${diy}\n${answers}`);
}
