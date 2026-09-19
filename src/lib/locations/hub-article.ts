/**
 * Location hub content for /locations/{slug} (EN + AR).
 * Stores long-form on LocationI18n (intro + localServiceInfo + propertyTypes + nearbyAreas + faq).
 * Deterministic GEO-aware composer; OpenAI path is optional via publish script.
 */
import { TOPIC_WEBP } from "@/lib/media/topic-webp";
import { loadLocationMaster, type MasterLocation } from "../../../prisma/data/location-master";

export type LocationHubLocale = {
  name: string;
  intro: string;
  localServiceInfo: string;
  propertyTypes: string;
  nearbyAreas: string;
  faq: string;
  seoTitle: string;
  metaDescription: string;
  imageAlt: string;
};

export type LocationHubPackage = {
  slug: string;
  coverImage: string;
  en: LocationHubLocale;
  ar: LocationHubLocale;
};

const EMIRATE_AR: Record<string, string> = {
  "abu-dhabi": "أبوظبي",
  dubai: "دبي",
  sharjah: "الشارقة",
  ajman: "عجمان",
  "umm-al-quwain": "أم القيوين",
  "ras-al-khaimah": "رأس الخيمة",
  fujairah: "الفجيرة",
};

const EMIRATE_EN: Record<string, string> = {
  "abu-dhabi": "Abu Dhabi",
  dubai: "Dubai",
  sharjah: "Sharjah",
  ajman: "Ajman",
  "umm-al-quwain": "Umm Al Quwain",
  "ras-al-khaimah": "Ras Al Khaimah",
  fujairah: "Fujairah",
};

type PlaceKind = "industrial" | "island" | "coastal" | "marina" | "numbered" | "community" | "district" | "emirate";

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

function placeKind(row: MasterLocation): PlaceKind {
  if (row.type === "emirate") return "emirate";
  const n = row.nameEn;
  if (/industrial|musaffah|sajaa|quoz|warsan|dic|production/i.test(n)) return "industrial";
  if (/island|palm|saadiyat|yas |reem|maryam/i.test(n)) return "island";
  if (/marina|jbr|beach|harbour|harbor|creek|maritime/i.test(n)) return "marina";
  if (/aqah|fujairah|dibba|khor|hamriyah|zorah|ras al khor/i.test(n)) return "coastal";
  if (/\d/.test(n)) return "numbered";
  if (/city|downtown|hills|village|ranch|estate|gardens|park/i.test(n)) return "community";
  return "district";
}

function coverFor(kind: PlaceKind, emirateSlug: string) {
  if (kind === "industrial") return TOPIC_WEBP.electrical!;
  if (kind === "marina" || kind === "coastal" || kind === "island") return TOPIC_WEBP.pool!;
  if (kind === "community") return TOPIC_WEBP.cleaning!;
  if (emirateSlug === "abu-dhabi") return TOPIC_WEBP.ac!;
  if (emirateSlug === "dubai") return TOPIC_WEBP.general!;
  if (emirateSlug === "sharjah") return TOPIC_WEBP.walls!;
  if (emirateSlug === "fujairah") return TOPIC_WEBP.plumbing!;
  return TOPIC_WEBP.general!;
}

function climateEn(emirateSlug: string) {
  const map: Record<string, string> = {
    "abu-dhabi":
      "Abu Dhabi places often mix dusty inland air, long cooling seasons, and coastal humidity on island and corniche districts. Filters, sealed joints, and outdoor metal finish age differently than in cooler climates.",
    dubai:
      "Dubai places see fine dust, strong summer heat on dark façades, and salt air near the coast and marina belts. High-rise shared plant rooms and villa compounds create different access patterns for the same symptom.",
    sharjah:
      "Sharjah places include dense older districts, newer residential clusters, and industrial belts where workshop dust and traffic grit settle on equipment faster. Industrial gates and residential towers are not the same visit plan.",
    ajman:
      "Ajman places are often mid-rise residential and mixed-use streets with nearby industrial pockets. Access notes (gate, parking, shop hours) matter as much as the trade name.",
    "umm-al-quwain":
      "Umm Al Quwain places are quieter coastal and inland communities. Visits still need an exact place name plus building type; do not treat the emirate name alone as enough geography.",
    "ras-al-khaimah":
      "Ras Al Khaimah places mix coastal humidity, mountain-edge dust, and resort or village access patterns. Write how a technician reaches the door, not only the community name.",
    fujairah:
      "Fujairah places face east-coast humidity, sea air on metal and finishes, and mountain or port access in some districts. Coastal corrosion context is useful; it is not a diagnosis of your unit.",
  };
  return map[emirateSlug] || "United Arab Emirates heat, dust, and humidity change how fast small marks and smells become annoying. Write what you see in this place, not a climate story.";
}

function climateAr(emirateSlug: string) {
  const map: Record<string, string> = {
    "abu-dhabi":
      "أماكن أبوظبي تجمع غالباً غبار الداخل، وموسم تبريد طويل، ورطوبة ساحلية في الجزر والكورنيش. الفلاتر والمفاصل المعدنية والواجهات تتقدم بشكل مختلف عن المناخ الأبرد.",
    dubai:
      "أماكن دبي ترى غباراً ناعماً وحرّاً صيفياً على الواجهات الداكنة وهواءً مالحاً قرب الساحل والمارينا. غرف المعدات المشتركة في الأبراج ومجمعات الفلل تخلق وصولاً مختلفاً لنفس العَرَض.",
    sharjah:
      "أماكن الشارقة تشمل أحياء قديمة كثيفة وتجمعات سكنية أحدث وأحزمة صناعية حيث يستقر غبار الورش على المعدات أسرع. بوابة صناعية وبرج سكني ليسا خطة زيارة واحدة.",
    ajman:
      "أماكن عجمان غالباً سكنية متوسطة الارتفاع وشوارع مختلطة مع جيوب صناعية قريبة. ملاحظات الوصول (بوابة، مواقف، ساعات المحل) تهم بقدر اسم التخصص.",
    "umm-al-quwain":
      "أماكن أم القيوين مجتمعات ساحلية وداخلية أهدأ. الزيارة ما زالت تحتاج اسم مكان دقيق مع نوع المبنى؛ لا تعامل اسم الإمارة وحده كجغرافيا كافية.",
    "ras-al-khaimah":
      "أماكن رأس الخيمة تمزج رطوبة ساحلية وغبار حافة الجبل وأنماط وصول منتجعات أو قرى. اكتب كيف يصل الفني إلى الباب، لا اسم المجتمع فقط.",
    fujairah:
      "أماكن الفجيرة تواجه رطوبة الساحل الشرقي وهواء البحر على المعادن والتشطيبات ووصولاً جبلياً أو ميناء في بعض الأحياء. سياق التآكل الساحلي مفيد؛ ليس تشخيصاً لوحدتك.",
  };
  return map[emirateSlug] || "حرّ الإمارات والغبار والرطوبة يغيّران سرعة إزعاج العلامات الصغيرة. اكتب ما تراه في هذا المكان، لا قصة مناخ عامة.";
}

function kindParagraphEn(kind: PlaceKind, place: string) {
  switch (kind) {
    case "industrial":
      return `${place} reads as a work or industrial area. Write the gate, the warehouse or office block, company name if allowed, and whether security must approve the visit. Do not assume a home-cleaning visit and a plant-room visit are the same job.`;
    case "island":
      return `${place} is named as an island or island district. Write how a technician reaches it: bridge, public road, or a pass you already use. Do not invent a ferry schedule or a private landing.`;
    case "marina":
      return `${place} sits in a marina or waterfront belt. Towers, promenade retail, and service-lift bookings are common access facts to check. Salt air is context for finishes and outdoor units; it is not a diagnosis.`;
    case "coastal":
      return `${place} is coastal enough that humidity and sea air matter for outdoor metal, AC condensers, and painted surfaces. Still write the building type and access before guessing a trade.`;
    case "numbered":
      return `The number in ${place} matters. Parent names without the number are different requests. Put the number in the first line so the visit is not planned for the parent name alone.`;
    case "community":
      return `${place} reads as a named community or estate. Write the cluster, street, or tower if you have it. A community name is better than the emirate alone, and a tower name is better than the community alone.`;
    case "emirate":
      return `${place} is an emirate-level hub. Prefer a more specific community when you know it. Use this page to start only when the place you need is the emirate name itself or you are choosing among its published places.`;
    default:
      return `${place} is specific enough to start a request when you also name the building type. Write apartment, villa, shop, office, or shared area, and the floor if there is one.`;
  }
}

function kindParagraphAr(kind: PlaceKind, place: string) {
  switch (kind) {
    case "industrial":
      return `${place} يُقرأ كمنطقة عمل أو صناعية. اكتب البوابة والمبنى والشركة إن جاز، وهل يجب أن يوافق الأمن. لا تفترض أن زيارة منزل وزيارة غرفة معدات عمل واحد.`;
    case "island":
      return `${place} اسم جزيرة أو منطقة جزيرة. اكتب كيف يصل الفني: جسر أو طريق عام أو تصريح تستخدمه. لا تخترع جدول عبارة أو رصيفاً خاصاً.`;
    case "marina":
      return `${place} في حزام مارينا أو واجهة بحرية. الأبراج ومحال الكورنيش وحجز مصعد الخدمة حقائق وصول شائعة. هواء الملح سياق للتشطيبات والوحدات الخارجية؛ ليس تشخيصاً.`;
    case "coastal":
      return `${place} ساحلي بما يكفي لتهم الرطوبة وهواء البحر للمعادن الخارجية ووحدات التكييف والدهان. اكتب نوع المبنى والوصول قبل تخمين التخصص.`;
    case "numbered":
      return `الرقم في ${place} مهم. الاسم الأب بلا رقم طلب مختلف. ضع الرقم في السطر الأول حتى لا يُخطط الموعد على الاسم الأب وحده.`;
    case "community":
      return `${place} مجتمع أو تجمع مسمّى. اكتب المجموعة أو الشارع أو البرج إن عرفته. اسم المجتمع أفضل من الإمارة وحدها، واسم البرج أفضل من المجتمع وحده.`;
    case "emirate":
      return `${place} صفحة على مستوى الإمارة. فضّل مجتمعاً أدق إن عرفته. استخدم هذه الصفحة فقط إذا كان المكان المطلوب اسم الإمارة نفسه أو لاختيار أماكنها المنشورة.`;
    default:
      return `${place} يكفي لبدء الطلب إذا أضفت نوع المبنى. اكتب شقة أو فيلا أو محل أو مكتب أو منطقة مشتركة، والطابق إن وُجد.`;
  }
}

function propertyTypesEn(kind: PlaceKind, place: string, em: string) {
  if (kind === "industrial") {
    return `In ${place}, ${em}, property types often include warehouses, workshops, offices attached to yards, and staff facilities. Name the block and whether the job is inside a conditioned room or an open bay.`;
  }
  if (kind === "marina" || kind === "island") {
    return `In ${place}, expect apartments, hotel-serviced units, retail along the water, and shared plant areas. Towers need lift and security notes; waterfront retail needs opening hours.`;
  }
  if (kind === "emirate") {
    return `Across ${place}, property types range from apartments and villas to shops, offices, and industrial units. Name the type on every request so the visit is not planned as a generic home call.`;
  }
  return `In ${place}, ${em}, common property types include apartments, villas, townhouses, shops, and small offices. Shared corridors, roofs, and plant rooms need permission notes before a technician enters.`;
}

function propertyTypesAr(kind: PlaceKind, place: string, em: string) {
  if (kind === "industrial") {
    return `في ${place}، ${em}، أنواع العقارات غالباً مستودعات وورش ومكاتب ملحقة وساحات ومرافق للعاملين. سمِّ المبنى وهل العمل داخل غرفة مكيّفة أو مساحة مفتوحة.`;
  }
  if (kind === "marina" || kind === "island") {
    return `في ${place} توقّع شققاً ووحدات فندقية ومحالّاً على الماء ومناطق معدات مشتركة. الأبراج تحتاج ملاحظات المصعد والأمن؛ المحال تحتاج ساعات الفتح.`;
  }
  if (kind === "emirate") {
    return `عبر ${place} تتراوح أنواع العقارات بين الشقق والفلل والمحال والمكاتب والوحدات الصناعية. اذكر النوع في كل طلب حتى لا تُخطط الزيارة كزيارة منزل عامة.`;
  }
  return `في ${place}، ${em}، الأنواع الشائعة تشمل الشقق والفلل والمنازل المتلاصقة والمحال والمكاتب الصغيرة. الممرات والأسطح وغرف المعدات تحتاج إذن دخول.`;
}

export function locationHubTargets() {
  return loadLocationMaster().locations.filter((row) => row.type !== "country");
}

export function composeLocationHub(row: MasterLocation): LocationHubPackage {
  const master = loadLocationMaster();
  const emirateSlug = row.type === "emirate" ? row.slug : row.emirateSlug || "";
  const emirateEn = EMIRATE_EN[emirateSlug] || row.nameEn;
  const emirateAr = EMIRATE_AR[emirateSlug] || emirateEn;
  const placeEn = row.nameEn;
  const placeAr = displayAr(row);
  const kind = placeKind(row);
  const siblings = master.locations
    .filter((item) => item.emirateSlug === emirateSlug && item.slug !== row.slug && item.type !== "country" && item.type !== "emirate")
    .sort((a, b) => (hash(a.slug + row.slug) % 97) - (hash(b.slug + row.slug) % 97))
    .slice(0, 6)
    .map((item) => item.nameEn);
  const siblingsAr = master.locations
    .filter((item) => item.emirateSlug === emirateSlug && item.slug !== row.slug && item.type !== "country" && item.type !== "emirate")
    .sort((a, b) => (hash(a.slug + row.slug) % 97) - (hash(b.slug + row.slug) % 97))
    .slice(0, 6)
    .map((item) => displayAr(item));
  const href = `/locations/${row.slug}`;
  const coverImage = coverFor(kind, emirateSlug);
  const power = (["Practical", "Clear", "Careful", "Direct", "Prepared"] as const)[hash(row.slug) % 5]!;
  const powerAr = ({ Practical: "عملي", Clear: "واضح", Careful: "حذر", Direct: "مباشر", Prepared: "جاهز" } as const)[power];

  const nearbyEn = siblings.length ? siblings.join(", ") : emirateEn;
  const nearbyAr = siblingsAr.length ? siblingsAr.join("، ") : emirateAr;
  const localEn = kindParagraphEn(kind, placeEn);
  const localAr = kindParagraphAr(kind, placeAr);
  const climateE = climateEn(emirateSlug);
  const climateA = climateAr(emirateSlug);
  const propsEn = propertyTypesEn(kind, placeEn, emirateEn);
  const propsAr = propertyTypesAr(kind, placeAr, emirateAr);

  const enTitle = `${power} ${placeEn} hub, ${emirateEn}`;
  const arTitle = `${powerAr}: مركز ${placeAr}، ${emirateAr}`;

  const enBody = [
    `## What is this hub?`,
    `${enTitle} is the Fixpoint location page for ${placeEn} in ${emirateEn}, United Arab Emirates. It helps a visitor name geography before naming a trade. It is not a price list, not a branch directory, and not a promise that a technician is already standing in ${placeEn}.`,
    `${placeEn} is one of the 277 places we serve. Open related services from this hub after you can describe the symptom in one sentence. Brand: Al Najah Al Daem · Fixpoint.`,

    `## Does this apply to my building?`,
    `Use ${placeEn} when that name is on the entrance, gate, tenancy contract, or map pin you would send a guest. If you are between ${placeEn} and a neighbour, pick the name a driver would use, then add the other name in a second line. Nearby names include ${nearbyEn}.`,
    localEn,
    climateE,

    `## Common signs you are ready to request`,
    `You are ready when you can answer: what is wrong in one sentence, which room or part of the building, when it started, whether it returned, and who can open the door. If you cannot name the trade yet, still send ${placeEn} and the symptom. Guessing a trade is optional; guessing the place is not.`,
    `Dust, summer heat, and humidity in ${emirateEn} change how fast a small mark, smell, or noise becomes annoying. That is context. It is not a diagnosis of your unit in ${placeEn}. Write what you saw.`,

    `## What to write so the visit is useful`,
    `A useful request for ${placeEn} has four parts: the place name exactly as ${placeEn} plus ${emirateEn}; the property type; access notes (floor, parking, lift, security, gate); and photos (approach, room, item). Those four beat a long story about inconvenience.`,
    `If ${placeEn} is numbered or named as a community, add cluster or tower. If industrial, add company or warehouse only when allowed. If you rent, say who must approve. If you own, say who meets the technician.`,

    `## What not to do`,
    `Do not treat this published hub as proof that every trade is already scheduled today in ${placeEn}. Do not invent a visit time. Do not send only ${emirateEn} when you know ${placeEn}. Do not hide a leak, warm socket, or smell under a new finish before someone has seen it.`,
    `Do not open electrical panels, gas connections, or sealed appliances while you wait. Isolation you already use every day is fine. Exploration is not. Do not mix cleaning chemicals. Do not stand on furniture to reach a high mark. Call a person if water is spreading, you smell burning or gas, or people cannot stay in the room.`,

    `## When to call a professional`,
    `Ask for a person when the sign returns, when you cannot name the part, when access is awkward, or when the problem is near water, gas, height, or electricity. Also ask when the area is shared and authority is unclear. Send ${placeEn} and ${emirateEn} with photos.`,
    `Leave the room for heat, smoke, sparks, burning smell, or gas smell. The place name still belongs on the message so help aims at the right entrance in ${placeEn}.`,

    `## How a request usually proceeds`,
    `You name ${placeEn}, ${emirateEn}, the service, and what you already tried. A person confirms whether a visit can be arranged. On site, the technician says whether the work matches the name you sent or whether another trade should look. A quote follows that look. This hub does not publish a price or a same-day promise for ${placeEn}.`,
    `After the visit you should know what was found, what was done, and what to watch for a few days. If findings do not match the access you described, ask for that difference in writing before a wider scope.`,

    `## Preparation checklist`,
    `Gather: exact place ${placeEn}; emirate ${emirateEn}; building type; floor and parking; door contact; daylight photos if possible; one-line history; security name-in-advance if required; what success looks like ("smell stops", "door closes", "can this wait a week").`,
    `A benefit of naming ${placeEn} first is comparing replies: did they restate ${placeEn} rather than only ${emirateEn}? Did they ask for the photo you have? Did they avoid a price before seeing access? If you are pushed to approve a replacement before anyone has seen ${placeEn}, pause.`,

    `## Local service context`,
    localEn,
    climateE,
    `Shared buildings in ${emirateEn} may require permission for plant rooms, roofs, or corridors. Villas may need a gate code. Towers may need a service lift booking. Check what is true for your building in ${placeEn}, then write those facts.`,

    `## Direct answers (AEO)`,
    `What is this page? A maintenance and cleaning request hub for ${placeEn}, ${emirateEn}. Who is the brand? Al Najah Al Daem · Fixpoint. What should I send? ${placeEn}, ${emirateEn}, service, building type, access, photos. Where do I start? ${href}, then the quote form. Which nearby names should I not confuse with ${placeEn}? ${nearbyEn}.`,

    `## Next step`,
    `If you are in ${placeEn}, choose the service that matches the symptom and send the four parts above. If unsure of the service, still send ${placeEn} and one clear sentence about what you see. A clear place plus a clear symptom is enough to start.`,
    `Before you leave, answer: is the problem in one room or a shared area of ${placeEn}? Did it start after dust, humidity, cleaning, travel, or building work? Who can be present and for how long? Is there a finished floor, child, or pet to protect? Unknown is more useful than a guess.`,
  ].join("\n\n");

  const arBody = [
    `## ما هذا المركز؟`,
    `${arTitle} هي صفحة فكس بوينت للمكان ${placeAr} في ${emirateAr}، الإمارات العربية المتحدة. تساعد الزائر على تسمية الجغرافيا قبل التخصص. ليست قائمة أسعار ولا دليل فروع ولا وعداً بأن فنياً يقف الآن في ${placeAr}.`,
    `${placeAr} من الأماكن الـ 277 التي نخدمها. افتح الخدمات المرتبطة من هذا المركز بعد أن تصف العَرَض في جملة. العلامة: النجاح الدائم · فكس بوينت.`,

    `## هل ينطبق هذا على مبناي؟`,
    `استخدم ${placeAr} إذا كان الاسم على المدخل أو البوابة أو عقد الإيجار أو دبوس الخريطة. إذا كنت بين ${placeAr} واسم مجاور، فاختر ما يستخدمه السائق ثم أضف الآخر. أسماء قريبة: ${nearbyAr}.`,
    localAr,
    climateA,

    `## علامات أنك جاهز للطلب`,
    `أنت جاهز عندما تجيب: ما العطل في جملة، أي غرفة أو جزء، متى بدأ، هل عاد، ومن يفتح الباب. إذا لم تعرف التخصص بعد، فأرسل ${placeAr} والعَرَض. تخمين التخصص اختياري؛ تخمين المكان ليس كذلك.`,
    `الغبار وحرّ الصيف والرطوبة في ${emirateAr} يغيّران سرعة إزعاج علامة أو رائحة أو صوت. هذا سياق. ليس تشخيصاً لوحدتك في ${placeAr}. اكتب ما رأيته.`,

    `## ماذا تكتب حتى تكون الزيارة مفيدة؟`,
    `الطلب المفيد لـ ${placeAr} له أربعة أجزاء: الاسم ${placeAr} مع ${emirateAr}؛ نوع العقار؛ ملاحظات الوصول؛ وصور (المدخل، الغرفة، القطعة). هذه الأربعة أنفع من قصة طويلة عن الإزعاج.`,
    `إذا كان ${placeAr} مرقماً أو مجتمعاً مسمّى فأضف المجموعة أو البرج. إذا كان صناعياً فأضف الشركة أو المستودع عند الجواز. إن كنت مستأجراً فاذكر من يوافق. إن كنت مالكاً فاذكر من يقابل الفني.`,

    `## ما الذي يجب تجنّبه؟`,
    `لا تعامل هذا المركز المنشور كدليل على أن كل تخصص مجدول اليوم في ${placeAr}. لا تخترع وقت زيارة. لا ترسل ${emirateAr} وحدها وأنت تعرف ${placeAr}. لا تخفِ تسرباً أو مقبساً دافئاً أو رائحة تحت تشطيب جديد.`,
    `لا تفتح لوحات كهرباء أو وصلات غاز أو أجهزة مغلقة أثناء الانتظار. الإيقاف الذي تستخدمه يومياً مقبول. الاستكشاف ليس كذلك. لا تخلط مواد التنظيف. لا تقف على الأثاث. اطلب شخصاً إذا انتشر الماء أو شممت احتراقاً أو غازاً أو تعذّر البقاء في الغرفة.`,

    `## متى تستدعي محترفاً؟`,
    `اطلب شخصاً عندما تعود العلامة، أو عندما لا تسمّي الجزء، أو عندما يكون الوصول صعباً، أو عندما تكون المشكلة قرب ماء أو غاز أو ارتفاع أو كهرباء. وأرسل ${placeAr} و${emirateAr} مع الصور.`,
    `اترك الغرفة عند السخونة أو الدخان أو الشرر أو رائحة الاحتراق أو الغاز. اسم المكان يبقى في الرسالة حتى تُوجَّه المساعدة إلى مدخل ${placeAr}.`,

    `## كيف يسير الطلب عادة؟`,
    `تسمّي ${placeAr} و${emirateAr} والخدمة وما جرّبته. يؤكد شخص إمكانية الزيارة. في الموقع يقول الفني إن العمل يطابق الاسم أو يحتاج تخصصاً آخر. يُعرض السعر بعد النظرة. هذه الصفحة لا تنشر سعراً ولا وعداً بنفس اليوم لـ ${placeAr}.`,
    `بعد الزيارة ينبغي أن تعرف ماذا وُجد وما تم وما تراقب أياماً. إذا لم تطابق النتيجة وصف الوصول، فاطلب الفرق كتابة قبل نطاق أوسع.`,

    `## قائمة التحضير`,
    `جهّز: المكان ${placeAr}؛ الإمارة ${emirateAr}؛ نوع المبنى؛ الطابق والمواقف؛ من يفتح الباب؛ صوراً نهارية إن أمكن؛ جملة تاريخ؛ اسم الأمن مسبقاً إن لزم؛ وكيف يبدو النجاح.`,
    `فائدة تسمية ${placeAr} أولاً مقارنة الردود: هل أعادوا ${placeAr} لا ${emirateAr} فقط؟ هل طلبوا صورتك؟ هل تجنّبوا السعر قبل رؤية الوصول؟ إذا دُفعت لاستبدال قبل أن يرى أحد ${placeAr} فتوقف.`,

    `## السياق المحلي للخدمة`,
    localAr,
    climateA,
    `المباني المشتركة في ${emirateAr} قد تشترط إذناً لغرف المعدات أو الأسطح أو الممرات. الفلل قد تحتاج رمز بوابة. الأبراج قد تحتاج حجز مصعد خدمة. تحقق مما يصح في مبناك بـ ${placeAr} ثم اكتبه.`,

    `## إجابات مباشرة`,
    `ما هذه الصفحة؟ مركز طلب صيانة وتنظيف لـ ${placeAr}، ${emirateAr}. ما العلامة؟ النجاح الدائم · فكس بوينت. ماذا أرسل؟ ${placeAr} و${emirateAr} والخدمة ونوع المبنى والوصول والصور. من أين أبدأ؟ ${href} ثم نموذج عرض السعر. أسماء قريبة لا تخلطها؟ ${nearbyAr}.`,

    `## الخطوة التالية`,
    `إذا كنت في ${placeAr} فاختر الخدمة التي تطابق العَرَض وأرسل الأجزاء الأربعة. إذا لم تعرف الخدمة فأرسل ${placeAr} وجملة واضحة عما ترى. مكان واضح مع عَرَض واضح يكفي للبدء.`,
    `قبل المغادرة أجب: هل المشكلة في غرفة واحدة أم منطقة مشتركة في ${placeAr}؟ هل بدأت بعد غبار أو رطوبة أو تنظيف أو سفر أو أعمال؟ من يحضر ولكم؟ هل توجد أرضية مشطبة أو طفل أو حيوان للحماية؟ المجهول أنفع من التخمين.`,
  ].join("\n\n");

  const enFaq = JSON.stringify([
    {
      q: `How do I request service in ${placeEn}?`,
      a: `Open ${href}, name the service, and send ${placeEn} plus ${emirateEn}, building type, access notes, and photos. ${placeEn} is one of the 277 places we serve. The visit is confirmed when you request it.`,
    },
    {
      q: `Is ${placeEn} the same as ${emirateEn}?`,
      a: `No. ${emirateEn} is the emirate. ${placeEn} is the more specific name on this hub. Send both so the visit is not planned for another district with a similar name.`,
    },
    {
      q: `Does Fixpoint publish a price for ${placeEn} on this page?`,
      a: `No. Al Najah Al Daem · Fixpoint confirms scope after a look at access and the symptom. This hub explains what to send, not a fixed price.`,
    },
    {
      q: `What if I am between ${placeEn} and a nearby name?`,
      a: `Use the name a driver would use, then add the other name. Nearby names to check include ${nearbyEn}.`,
    },
    {
      q: `What should I not do while I wait in ${placeEn}?`,
      a: `Do not open electrical panels, gas connections, or sealed appliances. Do not hide a leak under a new finish. Photograph, keep people away from a hazard, and send the place name.`,
    },
  ]);

  const arFaq = JSON.stringify([
    {
      q: `كيف أطلب خدمة في ${placeAr}؟`,
      a: `افتح ${href}، وسمِّ الخدمة، وأرسل ${placeAr} مع ${emirateAr} ونوع المبنى وملاحظات الوصول والصور. ${placeAr} من الأماكن الـ 277 التي نخدمها. تُؤكد الزيارة عند الطلب.`,
    },
    {
      q: `هل ${placeAr} هو نفسه ${emirateAr}؟`,
      a: `لا. ${emirateAr} هي الإمارة. ${placeAr} هو الاسم الأدق في هذا المركز. أرسل الاثنين حتى لا يُخطط الموعد على حي آخر باسم مشابه.`,
    },
    {
      q: `هل تنشر فكس بوينت سعراً لـ ${placeAr} في هذه الصفحة؟`,
      a: `لا. النجاح الدائم · فكس بوينت يؤكد النطاق بعد النظر إلى الوصول والعَرَض. هذا المركز يشرح ماذا ترسل، لا سعراً ثابتاً.`,
    },
    {
      q: `ماذا إذا كنت بين ${placeAr} واسم قريب؟`,
      a: `استخدم الاسم الذي يستخدمه السائق، ثم أضف الاسم الآخر. أسماء قريبة: ${nearbyAr}.`,
    },
    {
      q: `ماذا لا أفعل أثناء الانتظار في ${placeAr}؟`,
      a: `لا تفتح لوحات الكهرباء أو وصلات الغاز أو الأجهزة المغلقة. لا تخفِ تسرباً تحت تشطيب جديد. صوّر، وأبعد الناس عن الخطر، وأرسل اسم المكان.`,
    },
  ]);

  return {
    slug: row.slug,
    coverImage,
    en: {
      name: placeEn,
      intro: `${placeEn} is a Fixpoint maintenance hub in ${emirateEn}, UAE. Name the place, the building type, and the symptom before you guess a trade.`,
      localServiceInfo: enBody,
      propertyTypes: propsEn,
      nearbyAreas: `Nearby names in ${emirateEn} to distinguish from ${placeEn}: ${nearbyEn}. Always send ${placeEn} with ${emirateEn} on the request.`,
      faq: enFaq,
      seoTitle: withBrandSeo(enTitle, "en", 70),
      metaDescription: `Request cleaning or building maintenance in ${placeEn}, ${emirateEn}. What to send, what not to assume, and how Fixpoint confirms a visit.`.slice(0, 160),
      imageAlt: `Maintenance service area illustration for ${placeEn}, ${emirateEn}`,
    },
    ar: {
      name: placeAr,
      intro: `${placeAr} مركز صيانة لفكس بوينت في ${emirateAr}، الإمارات. سمِّ المكان ونوع المبنى والعَرَض قبل أن تخمّن التخصص.`,
      localServiceInfo: arBody,
      propertyTypes: propsAr,
      nearbyAreas: `أسماء قريبة في ${emirateAr} للتمييز عن ${placeAr}: ${nearbyAr}. أرسل دائماً ${placeAr} مع ${emirateAr} في الطلب.`,
      faq: arFaq,
      seoTitle: withBrandSeo(arTitle, "ar", 80),
      metaDescription: `اطلب تنظيفاً أو صيانة مبانٍ في ${placeAr}، ${emirateAr}. ماذا ترسل، وماذا لا تفترض، وكيف تؤكد فكس بوينت الزيارة.`.slice(0, 160),
      imageAlt: `صورة توضيحية لمنطقة خدمة الصيانة في ${placeAr}، ${emirateAr}`,
    },
  };
}

/** Ensure brand suffix always survives SEO title length limits. */
export function withBrandSeo(titleCore: string, locale: "en" | "ar", max = 70) {
  const brand = locale === "en" ? "Al Najah Al Daem · Fixpoint" : "النجاح الدائم · فكس بوينت";
  const full = `${titleCore} | ${brand}`;
  if (full.length <= max) return full;
  const room = Math.max(12, max - brand.length - 3);
  return `${titleCore.slice(0, room).trim()} | ${brand}`;
}

export function renderedHubWords(locale: LocationHubLocale) {
  let answers = "";
  try {
    answers = (JSON.parse(locale.faq) as Array<{ a?: string }>).map((row) => row.a || "").join(" ");
  } catch {
    answers = "";
  }
  return words(
    `${locale.intro}\n${locale.localServiceInfo}\n${locale.propertyTypes}\n${locale.nearbyAreas}\n${answers}`,
  );
}
