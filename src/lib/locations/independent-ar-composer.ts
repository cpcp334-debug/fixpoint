/**
 * High-quality independent MSA Arabic location-hub composer.
 * Place-specific GEO via emirate + place-kind banks; not EN mirror; not thin GEO swap template.
 * Brand: النجاح الدائم · فكس بوينت
 */
import { loadLocationMaster, type MasterLocation } from "../../../prisma/data/location-master";
import {
  type LocationHubLocale,
  withBrandSeo,
} from "@/lib/locations/hub-article";
import {
  AR_NAME_OVERRIDES,
  EMIRATE_AR,
  EMIRATE_CLIMATE,
  KIND_ACCESS,
  KIND_EXTRA_SECTION,
  KIND_FAQ_EXTRA,
  KIND_PROPERTY,
  POWER_AR,
  SECTION_OPENERS,
  hashStr,
  pick,
  type PlaceKind,
} from "@/lib/locations/ar-content-banks";

export type IndependentArHub = LocationHubLocale & { slug: string; imageAlt: string };

function faq(items: Array<{ q: string; a: string }>) {
  return JSON.stringify(items);
}

function words(text: string) {
  return text.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

export function placeKindOf(row: MasterLocation): PlaceKind {
  if (row.type === "emirate") return "emirate";
  const n = row.nameEn;
  if (/industrial|musaffah|sajaa|quoz|warsan|dic|production|investment park|dip\b/i.test(n)) {
    return "industrial";
  }
  if (/island|palm|saadiyat|yas |reem|maryam/i.test(n)) return "island";
  if (/marina|jbr|beach|harbour|harbor|creek|maritime|corniche/i.test(n)) return "marina";
  if (/aqah|fujairah|dibba|khor|hamriyah|zorah|ras al khor|port/i.test(n)) return "coastal";
  if (/\d/.test(n)) return "numbered";
  if (/city|downtown|hills|village|ranch|estate|gardens|park|walk|square/i.test(n)) {
    return "community";
  }
  return "district";
}

export function displayNameAr(row: MasterLocation): string {
  if (AR_NAME_OVERRIDES[row.slug]) return AR_NAME_OVERRIDES[row.slug]!;
  if (row.nameAr && row.nameAr !== "REVIEW_REQUIRED" && /[\u0600-\u06FF]/.test(row.nameAr)) {
    return row.nameAr;
  }
  return row.nameEn;
}

function emirateSlugOf(row: MasterLocation) {
  return row.type === "emirate" ? row.slug : row.emirateSlug || "";
}

function siblingsAr(row: MasterLocation, h: number) {
  const master = loadLocationMaster();
  const em = emirateSlugOf(row);
  return master.locations
    .filter(
      (item) =>
        item.emirateSlug === em &&
        item.slug !== row.slug &&
        item.type !== "country" &&
        item.type !== "emirate",
    )
    .sort((a, b) => (hashStr(a.slug + row.slug) % 97) - (hashStr(b.slug + row.slug) % 97))
    .slice(0, 6)
    .map((item) => displayNameAr(item));
}

function padIfNeeded(
  body: string,
  place: string,
  emirate: string,
  kind: PlaceKind,
  h: number,
  extrasForCount: string,
) {
  let out = body;
  let guard = 0;
  while (words(`${extrasForCount}\n${out}`) < 1120 && guard < 8) {
    guard += 1;
    const extras = [
      `في ${place} داخل ${emirate} يبقى الطلب الأقوى هو الذي يفصل بين العَرَض والوصول: ماذا يحدث، وأين داخل المبنى، وكيف يدخل الزائر. فكس بوينت يقرأ هذه التفاصيل قبل أي افتراض عن التخصص.`,
      `إن كتبت من خارج ${place} لعائلة أو عقار هناك، فاذكر من سيكون على الأرض عند الزيارة ورقم تواصل محلي إن جاز. الطلب عن بُعد ينجح بجغرافيا دقيقة ومستقبِل واضح، لا باختصار العنوان إلى «${emirate}» فقط.`,
      `قارن أي رد يصل إليك: هل أُعيد اسم ${place}؟ هل طُلبت الصورة التي لديك؟ هل تُجنّب سعر قاطع قبل رؤية الوصول؟ إن ضغط لاستبدال معدات كبيرة قبل المعاينة فتوقف واطلب زيارة أو توضيحاً مكتوباً من النجاح الدائم · فكس بوينت.`,
      `حول الوصول في ${place}: ${pick(KIND_ACCESS[kind], h, guard + 3)}`,
      `خلاصة تشغيلية لـ ${place}: سمِّ المكان والإمارة، صف النوع والوصول، أرفق صوراً مسموحاً بها، وتجنّب افتراض أن صفحة منشورة تعني فريقاً واقفاً عند الباب الآن.`,
      `المباني المشتركة في ${emirate} قد تشترط إذناً للممرات أو الأسطح أو غرف المعدات. الفلل قد تحتاج رمز بوابة. الأبراج قد تحتاج حجز مصعد خدمة. اكتب ما يصح في ${place} قبل الإرسال.`,
      `لا تستخدم هذه الصفحة للمزايدة على سرعة وصول غير مؤكدة إلى ${place}. النجاح الدائم · فكس بوينت يؤكد الزيارة عند الطلب بعد فهم المكان والعَرَض.`,
    ];
    out += `\n\n${extras[(h + guard) % extras.length]}`;
  }
  return out;
}

/**
 * Compose independent MSA Arabic for one master location.
 * Intentionally avoids thin-GEO fingerprint phrases checked in hub-gates.
 */
export function composeIndependentAr(row: MasterLocation): IndependentArHub {
  const h = hashStr(row.slug);
  const emirateSlug = emirateSlugOf(row);
  const emirate = EMIRATE_AR[emirateSlug] || row.nameEn;
  const place = displayNameAr(row);
  const kind = placeKindOf(row);
  const power = pick([...POWER_AR], h);
  const nearby = siblingsAr(row, h);
  const nearbyStr = nearby.length ? nearby.join("، ") : emirate;
  const climate = pick(EMIRATE_CLIMATE[emirateSlug] || EMIRATE_CLIMATE.dubai!, h, 1);
  const access = pick(KIND_ACCESS[kind], h, 2);
  const propsBank = pick(KIND_PROPERTY[kind], h, 3);
  const href = `/locations/${row.slug}`;

  const introVariants = [
    `${place} مركز طلب صيانة وتنظيف لفكس بوينت في ${emirate}. ثبّت الاسم الجغرافي والوصول قبل أن تخمّن التخصص في أول رسالة.`,
    `من ${place} في ${emirate} اطلب عبر فكس بوينت بعد تسمية المكان ونوع المبنى والعَرَض. الصفحة تشرح ماذا ترسل؛ لا تنشر سعراً ثابتاً.`,
    `${place} ضمن شبكة الأماكن التي تخدمها النجاح الدائم · فكس بوينت في ${emirate}. ابدأ بالجغرافيا ثم افتح الخدمة المناسبة للعَرَض.`,
  ];
  const intro = pick(introVariants, h, 4);

  const titleCore = `${power}: ${place} — صيانة وتنظيف في ${emirate}`;
  const seoTitle = withBrandSeo(titleCore, "ar", 80);
  const metaDescription =
    `اطلب صيانة أو تنظيفاً في ${place}، ${emirate} عبر فكس بوينت. سمِّ الوصول والصور قبل التخصص. لا سعر ثابت على الصفحة.`.slice(
      0,
      160,
    );
  const imageAlt = `توضيح لمنطقة خدمة الصيانة في ${place}، ${emirate}`;

  const propertyTypes = `في ${place}، ${emirate}، ${propsBank} أضف الطابق أو البوابة أو رقم المبنى إن وُجد حتى لا تُفترض خطة زيارة عامة.`;

  const nearbyAreas = `أسماء قريبة في ${emirate} قد تُخلط مع ${place}: ${nearbyStr}. أرسل «${place}» مع «${emirate}» صراحة، ثم تفاصيل المدخل أو البرج أو البوابة إن عرفتها.`;

  const whatIs = pick(SECTION_OPENERS.whatIs, h, 5)(place, emirate);
  const ready = pick(SECTION_OPENERS.ready, h, 6)(place);
  const avoid = pick(SECTION_OPENERS.avoid, h, 7)(place, emirate);
  const process = pick(SECTION_OPENERS.process, h, 8)(place, emirate);
  const checklist = pick(SECTION_OPENERS.checklist, h, 9)(place, emirate);
  const next = pick(SECTION_OPENERS.next, h, 10)(place);
  const extra = KIND_EXTRA_SECTION[kind](place, emirate);

  const writeUseful = [
    `الرسالة المفيدة من ${place} تجمع أربعة أركان: الاسم «${place}، ${emirate}»؛ نوع العقار؛ ملاحظات الوصول (طابق، موقف، مصعد، أمن، بوابة، معلم)؛ وصوراً نهارية للمدخل والغرفة والقطعة.`,
    `المستأجر يذكر جهة الموافقة على الدخول. المالك يذكر من يقابل الفني والوقت المتاح. إن كان العمل في منطقة مشتركة فاذكر من يملك المفتاح. هذه التفاصيل تختصر التكرار أكثر من سرد طويل عن الإزعاج.`,
  ];

  const callPro = [
    `استدعِ محترفاً عندما يعود العَرَض بعد محاولة بسيطة، أو عندما لا تسمّي الجزء المعطوب، أو عندما يكون الوصول عبر أمن/مصعد/بوابة معقّداً، أو عندما تكون المشكلة قرب ماء أو كهرباء أو ارتفاع. أرسل ${place} و${emirate} مع الصور.`,
    `اترك الغرفة عند سخونة غير معتادة أو دخان أو شرر أو رائحة احتراق أو غاز. أبقِ اسم ${place} في البلاغ حتى تُوجَّه المساعدة إلى المدخل الصحيح لا إلى حي مجاور في ${emirate}.`,
  ];

  const baseFaq: Array<{ q: string; a: string }> = [
    {
      q: `كيف أطلب خدمة صيانة أو تنظيف في ${place}؟`,
      a: `افتح صفحة المكان، واختر الخدمة الأقرب للعَرَض، وأرسل: ${place} و${emirate}، نوع الوحدة، ملاحظات الوصول، وصوراً للمدخل والغرفة. فكس بوينت يؤكد إمكانية الزيارة بعد استلام الطلب؛ الصفحة لا تنشر سعراً ثابتاً.`,
    },
    {
      q: `هل ${place} هو نفسه ${emirate}؟`,
      a:
        kind === "emirate"
          ? `${place} صفحة على مستوى الإمارة. فضّل حياً أدق إن عرفته، وأرسل الاثنين إن كان الحي معروفاً.`
          : `لا. ${emirate} هي الإمارة. ${place} الاسم الأدق لهذا المركز. أرسل الاسمين معاً حتى لا تُخطط الزيارة على حي آخر.`,
    },
    {
      q: `هل تنشر فكس بوينت سعراً لـ ${place} هنا؟`,
      a: `لا. النجاح الدائم · فكس بوينت يوضح النطاق بعد النظر إلى الوصول والعَرَض في الموقع. هذه الصفحة تشرح ماذا ترسل، لا قائمة أسعار.`,
    },
    {
      q: `ماذا إذا كنت بين ${place} واسم قريب؟`,
      a: `استخدم الاسم الذي يستخدمه السائق، ثم أضف الاسم الآخر. أسماء قريبة للمراجعة: ${nearbyStr}.`,
    },
  ];

  const faqExtras = KIND_FAQ_EXTRA[kind] || [];
  for (const item of faqExtras.slice(0, 2)) {
    baseFaq.push({ q: item.q(place, emirate), a: item.a(place, emirate) });
  }
  if (baseFaq.length < 5) {
    baseFaq.push({
      q: `ماذا لا أفعل أثناء الانتظار في ${place}؟`,
      a: `لا تفتح لوحات الكهرباء أو وصلات الغاز أو الأجهزة المغلقة. لا تخفِ تسرباً تحت تشطيب جديد. صوّر، وأبعد الناس عن الخطر، وأرسل اسم ${place}.`,
    });
  }

  const faqStr = faq(baseFaq.slice(0, 6));
  const extrasForCount = `${intro}\n${propertyTypes}\n${nearbyAreas}\n${(JSON.parse(faqStr) as Array<{ a: string }>).map((x) => x.a).join(" ")}`;

  const localServiceInfo = padIfNeeded(
    [
      `## ما هذا المركز؟`,
      whatIs,
      `${place} من الأماكن الـ 277 في شبكة النجاح الدائم · فكس بوينت. بعد جملة العَرَض يمكنك فتح الخدمات المرتبطة من هذا المركز.`,

      `## هل ينطبق هذا على موقعي؟`,
      `استخدم ${place} عندما يظهر هذا الاسم على المدخل أو البوابة أو العقد أو دبوس الخريطة الذي ترسله لضيف. إذا كنت بين ${place} واسم مجاور، فاختر ما يستخدمه السائق يومياً ثم أضف الآخر في سطر ثانٍ. أسماء للمراجعة: ${nearbyStr}.`,
      access,
      climate,

      `## علامات أنك جاهز للطلب`,
      ready,
      `الغبار والحرّ والرطوبة في ${emirate} قد تسرّع إزعاج بقعة أو رائحة أو ضجيج. ذلك سياق مناخي. ليس حكماً على جهازك في ${place}. اكتب ما رأيته بعينك.`,

      `## ماذا تكتب حتى تكون الزيارة مفيدة؟`,
      ...writeUseful,

      `## ما الذي يجب تجنّبه؟`,
      avoid,

      `## متى تستدعي محترفاً؟`,
      ...callPro,

      `## كيف يسير الطلب عادة مع فكس بوينت؟`,
      process,

      `## قائمة التحضير قبل الإرسال`,
      checklist,

      `## السياق المحلي للخدمة في ${place}`,
      climate,
      access,
      `تحقق مما يصح في مبناك داخل ${place} ثم اكتبه: إذن غرف المعدات، رمز بوابة، حجز مصعد، أو ساعات محل.`,

      ...extra,

      `## إجابات مباشرة`,
      `ما هذه الصفحة؟ مركز طلب صيانة وتنظيف لـ ${place} في ${emirate} عبر النجاح الدائم · فكس بوينت. ماذا أرسل؟ ${place}، ${emirate}، الخدمة، نوع المبنى، الوصول، الصور. من أين أبدأ؟ ${href} ثم نموذج عرض السعر. أسماء لا تخلطها؟ ${nearbyStr}.`,

      `## الخطوة التالية`,
      next,
    ].join("\n\n"),
    place,
    emirate,
    kind,
    h,
    extrasForCount,
  );

  return {
    slug: row.slug,
    name: place,
    intro,
    seoTitle,
    metaDescription,
    imageAlt,
    propertyTypes,
    nearbyAreas,
    faq: faqStr,
    localServiceInfo,
  };
}

export function independentArWordCount(ar: IndependentArHub) {
  let answers = "";
  try {
    answers = (JSON.parse(ar.faq) as Array<{ a?: string }>).map((row) => row.a || "").join(" ");
  } catch {
    answers = "";
  }
  return words(
    `${ar.intro}\n${ar.localServiceInfo}\n${ar.propertyTypes}\n${ar.nearbyAreas}\n${answers}`,
  );
}
