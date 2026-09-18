/**
 * Visitor DIY / stop-and-observe guide for one approved offering.
 * Hazardous work does not include repair steps.
 */
import { buildVisitorServiceCopy } from "@/lib/catalog/service-visitor-copy";

export type ServiceGuideInput = {
  slug: string;
  nameEn: string;
  categorySlug: string;
  categoryNameEn: string;
  href: string;
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

function words(text: string) {
  return text.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

function hazardous(categorySlug: string, name: string) {
  if (HAZARD.has(categorySlug)) return true;
  return /\b(gas|refrigerant|heater|electrical|compressor|chemical)\b/i.test(name);
}

export function composeServiceDiyGuide(input: ServiceGuideInput) {
  const copy = buildVisitorServiceCopy({
    slug: input.slug,
    nameEn: input.nameEn,
    categorySlug: input.categorySlug,
    categoryNameEn: input.categoryNameEn,
    categoryNameAr: "الخدمة",
  });
  const danger = hazardous(input.categorySlug, input.nameEn);
  const en = buildEn(input, danger);
  const ar = buildAr(input, copy.nameAr, danger);
  return {
    slug: `diy-${input.slug}`,
    categorySlug: input.categorySlug,
    danger,
    riskLevel: danger ? "red" : "yellow",
    schemaType: "article",
    en,
    ar,
  };
}

function placeLine(job: string) {
  return `${job} at the address you would send a guest`;
}

function buildEn(input: ServiceGuideInput, danger: boolean) {
  const job = input.nameEn;
  const place = "United Arab Emirates";
  const steps = danger
    ? [
        `In ${place}, start by naming ${job} and the room. Do not remove a cover, a panel, or a hose to learn the name. The useful first step is a sentence a neighbour would understand, plus the emirate.`,
        `Photograph the outside only: one wide shot of the room in Dubai, Sharjah, Abu Dhabi, or Ajman, one close shot of the item, and one of any label you can read without tools. If the label is behind a cover, leave it.`,
        `If you already use a normal switch or tap for this area, leave it in the safe position you use every day. Do not hunt for a hidden isolator, and do not reset a breaker more than once.`,
        `Write what you smelled, heard, or saw, and whether it is one point or several. A burning smell, sparks, smoke, or a gas smell means leave the room. This guide does not continue into a repair for that sign.`,
        `Keep children and visitors out of the immediate area. Do not use the waiting time to follow a video that opens ${job}. The benefit of this page is a clear request, not a home repair.`,
        `Send the photos with ${job}, the property type, the floor, and who will open the door. A listed service is not a scheduled visit until that request is confirmed.`,
        `Add whether the sign is in one apartment, a villa room, a shop, or a shared corridor. In the UAE that difference changes access: a tower may need a service lift, a villa may need a gate note, and a shop may need an opening hour. Write the one that is true for you. Do not invent a branch or a license for the emirate.`,
        `If you already tried a reset or a wipe, say so once. Repeating it while you wait does not add information and can hide the original sign. Leave ${job} as it is after the photos unless staying in the room is unsafe.`,
      ]
    : [
        `Clear a path in the room and move items you do not want touched. This preparation is the homeowner part of ${job}. It is not the full job if the fault is behind a finish or a fitting.`,
        `Photograph before you move anything, then note when ${job} last looked acceptable. In a UAE apartment or villa, dust and humidity can make an old mark look new. Write the date you first noticed it.`,
        `If you already clean this surface yourself, use only the product you already use. Stop if the finish softens, smells strongly, or the mark returns at once. Do not mix products. Do not stand on furniture.`,
        `Write the place the way a driver would find it: emirate, community or tower, floor, and parking. ${job} is easier to confirm when the access note is specific.`,
        `If the problem is only visual and not spreading, waiting after the photos is reasonable. If it worsens, if water appears, or if you find heat near the area, stop the home check and ask for a person.`,
        `Send ${job} with the photos and say what success looks like: the mark gone, the smell stopped, or a check that it can wait. Do not approve a wider scope before someone has seen it.`,
        `Name the emirate even if the community feels unique. Dubai, Sharjah, Abu Dhabi, and Ajman have names that collide if the emirate is missing. The benefit of this guide is a request a person can confirm, not a guessed cause.`,
        `If the building is rented, write who must approve the visit. If you own it, write who will meet the technician. Those two sentences save a wasted trip more often than another description of the symptom.`,
      ];

  const problem = danger
    ? `${job} needs a decision before anyone touches it. This guide tells a visitor in the United Arab Emirates what to notice, what to leave closed, and how to send a useful request. It does not give repair steps.`
    : `${job} starts with preparation a visitor can do safely. This guide covers what to clear, what to photograph, and when the job has left the surface and needs a technician in the UAE.`;

  const quickAnswer = danger
    ? `Do not repair ${job} from this page. Record the symptom, keep people away, and request a professional look. We serve 277 places across the seven emirates. Name your place on the request.`
    : `You can prepare the area and make a gentle check you already know how to do. Stop if ${job} needs tools inside a wall, a height, or a chemical mix. Then send photos and the place name.`;

  const safety = danger
    ? `Stop if you see heat, sparks, smoke, a burning smell, a gas smell, or water on an electrical item. Do not open a distribution board, a gas hose, a refrigerant port, or a sealed appliance. Isolation you already use is enough. Exploration is not a home task for ${job}.`
    : `Stop if you find an electrical hazard, a leak you cannot isolate with a tap you already know, or a finish that fails under a product you normally use. Do not mix cleaners. Keep children away from wet products.`;

  const whenToStop = danger
    ? `Stop at the first sign that ${job} is more than a label you can read from outside. Repeated breaker trips, a warm faceplate, a smell after you stopped using the item, or a noise from a sealed unit are reasons to leave the how-to and send a request. Do not keep testing to see if it returns. Also stop if you would need a ladder, a chemical, or a tool you do not already own. Buying a tool to continue is not part of this guide.`
    : `Stop when a wipe, a cleared path, and a photo are no longer enough. If ${job} needs a part you cannot match, a ladder, or opening a fitting, the next step is a person, not another attempt. Also stop if you would need a ladder, a chemical, or a tool you do not already own. Buying a tool to continue is not part of this guide.`;

  const fallback = `Request ${job} from ${input.href} or the quote form. Send the emirate, the building type, access notes, and the photos from this guide. Availability is confirmed on the request. This page does not publish a price or a visit-time promise.

Before you send, read the request once as if you were the person arriving. Can they find the entrance in ${placeLine(job)}? Can they tell whether this is one room or a shared area? Can they tell what you already tried? If any answer is no, add that line. That reread is the last useful homeowner step for ${job}. It takes less time than a second visit booked because the first note was only the symptom.

Write the service name ${job} as it appears on the page, not a vague line such as "something is wrong." Add the emirate, then the city or community if you know it. Say whether the place is an apartment, a villa, a shop, or an office. Attach the wide photo, the close photo, and the visible label. Do not delete an older photo just because the sign faded. If the sign returns, that photo is still the useful record.`;

  const checkWork = `${danger
    ? `A good result from this guide is a message someone else can act on: ${job}, the room, the emirate, and three photos. It is not a repaired item. If the room is safe to remain in and the sign is not spreading, you have done the homeowner part.`
    : `You are finished with the homeowner part when the path is clear, the photos show the same spot before and after a gentle check, and you have named ${job} without guessing a hidden cause.`}

How to use this guide for ${job}. Read the stop rule before the steps. If the stop rule already matches what you see, skip the steps and send the request. If the sign is mild, complete the steps in order and stop at the first one you cannot do safely. Do not treat a later step as permission to ignore an earlier stop.

A visitor in an apartment should add the tower and floor. A visitor in a villa should add the gate note. A visitor in a shop or office should add the hour someone can meet the technician. Those three are the most common ways a correct ${job} request still fails, because the place is right and the access is missing.

Compare the reply you receive. Did the person restate ${job}? Did they ask for the photo you already took? Did they avoid a price before seeing access? If yes, the guide did its job. If you are asked to approve a replacement before anyone has seen the item, pause and ask for the finding first. This applies in Dubai, Sharjah, Abu Dhabi, Ajman, and the other emirates. The emirate name stays on the form even when ${job} feels specific enough on its own.

Write one sentence on what changed since the last acceptable day, and one sentence on what you already tried. Then stop writing. Extra theories about the cause do not help as much as those two sentences. If you do not know the cause, say that. Unknown is more useful than a guess for ${job}.`;

  const faq = [
    { q: `Can I do ${job} myself?`, a: danger ? `No repair steps are published for ${job}. You can record, isolate with a control you already use, and ask for a technician.` : `You can prepare and do a light check you already do. Stop if the problem is deeper than the surface.` },
    { q: `Does this guide mean ${job} is available in my area?`, a: `We serve 277 places across the seven emirates. Name the emirate and the building, and request the visit.` },
    { q: `What should I photograph?`, a: `One wide photo, one close photo, and one of any label already visible. Do not remove a cover to reach a label.` },
    { q: `What if I smell burning or gas?`, a: `Leave the room and request a person. Do not keep reading steps and do not open the item.` },
    { q: `Where do I send the request?`, a: `Use ${input.href} or the quote form. Repeat the name ${job} so the request is not only a symptom.` },
  ];

  return {
    title: danger ? `Before you book: ${job} in UAE homes` : `What you can safely do for ${job} in UAE homes`,
    problem,
    quickAnswer,
    difficulty: danger ? "Stop and observe" : "Prepare only",
    estimatedTime: danger ? "10 minutes to record" : "15–30 minutes to prepare",
    tools: danger ? ["Phone camera", "Note of the room and time"] : ["Cloth you already use", "Phone camera", "The product you already use on this surface"],
    materials: danger ? ["None. Do not buy a part before a look."] : ["Only a product you already use. Do not buy a chemical mix for this guide."],
    safety,
    steps,
    checkWork,
    whenToStop,
    professionalFallback: fallback,
    seoTitle: `${job} homeowner guide | Al Najah Al Daem · Fixpoint`.slice(0, 70),
    metaDescription: danger
      ? `What to notice and when to stop for ${job} in the UAE. No repair steps. Send photos and confirm the visit on the request.`
      : `Safe preparation for ${job} in the UAE. What you can do, when to stop, and how to request the rest of the job.`,
    faq,
  };
}

function buildAr(input: ServiceGuideInput, nameAr: string, danger: boolean) {
  const job = nameAr;
  const steps = danger
    ? [
        `في الإمارات ابدأ بتسمية ${job} والغرفة. لا تفك غطاءً أو لوحة أو خرطوماً لتعرف الاسم. الخطوة المفيدة جملة يفهمها جار، مع اسم الإمارة.`,
        `صوّر الخارج فقط: صورة واسعة للغرفة، وصورة قريبة، وصورة لأي ملصق تقرأه بلا أدوات. إذا كان الملصق خلف غطاء، فاتركه.`,
        `إذا كنت تستخدم مفتاحاً أو محبساً عادياً لهذه المنطقة، فاتركه في الوضع الآمن الذي تستخدمه يومياً. لا تبحث عن عازل مخفي، ولا تعد ضبط القاطع أكثر من مرة.`,
        `اكتب ما شممته أو سمعته أو رأيته، وهل هو نقطة واحدة أم عدة نقاط. رائحة احتراق أو شرر أو دخان أو رائحة غاز تعني أن تترك الغرفة. هذا الدليل لا يكمل إلى إصلاح لتلك العلامة.`,
        `أبعد الأطفال والزوّار عن المكان المباشر. لا تستخدم وقت الانتظار لتجربة مقطع يفتح ${job}. فائدة هذه الصفحة طلب واضح، لا إصلاح منزلي.`,
        `أرسل الصور مع ${job} ونوع العقار والطابق ومن سيفتح الباب. الخدمة المنشورة ليست زيارة مجدولة حتى يُؤكد الطلب.`,
        `أضف إن كانت العلامة في شقة واحدة أو غرفة فيلا أو محل أو ممر مشترك. في الإمارات يغيّر ذلك الوصول: البرج قد يحتاج مصعد خدمة، والفيلا قد تحتاج ملاحظة بوابة، والمحل قد يحتاج ساعة فتح. اكتب ما صحّ عندك. لا تخترع فرعاً أو رخصة للإمارة.`,
        `إذا جربت إعادة ضبط أو مسحاً، فاذكر ذلك مرة. تكراره أثناء الانتظار لا يضيف معلومة وقد يخفي العلامة الأصلية. اترك ${job} كما هو بعد الصور إلا إذا كان البقاء في الغرفة غير آمن.`,
      ]
    : [
        `أفسح طريقاً في الغرفة وأبعد ما لا تريد أن يُلمس. هذا التحضير هو جزء صاحب المنزل من ${job}. ليس العمل كاملاً إذا كان العطل خلف تشطيب أو وصلة.`,
        `صوّر قبل أن تحرّك شيئاً، ثم سجّل متى كان ${job} مقبولاً آخر مرة. في شقة أو فيلا في الإمارات قد يجعل الغبار والرطوبة علامة قديمة تبدو جديدة. اكتب تاريخ أول ملاحظة.`,
        `إذا كنت تنظف هذا السطح أصلاً، فاستخدم المادة التي تستخدمها فقط. توقف إذا لان التشطيب أو ظهرت رائحة قوية أو عادت العلامة فوراً. لا تخلط المواد. لا تقف على الأثاث.`,
        `اكتب المكان كما يجده السائق: الإمارة، والمجتمع أو البرج، والطابق، والمواقف. يسهل تأكيد ${job} عندما تكون ملاحظة الوصول محددة.`,
        `إذا كانت المشكلة ظاهرة فقط ولا تنتشر، فالانتظار بعد الصور معقول. إذا ساءت، أو ظهر ماء، أو وجدت سخونة قرب المكان، فأوقف الفحص المنزلي واطلب شخصاً.`,
        `أرسل ${job} مع الصور وقل كيف يبدو النجاح: تزول العلامة، أو تتوقف الرائحة، أو فحص يمكن أن ينتظر. لا توافق على نطاق أوسع قبل أن يراه أحد.`,
        `سمِّ الإمارة حتى لو بدا المجتمع فريداً. دبي والشارقة وأبوظبي وعجمان فيها أسماء تلتبس إذا غابت الإمارة. فائدة هذا الدليل طلب يستطيع شخص أن يؤكده، لا سبب مخمّن.`,
        `إذا كانت الوحدة مستأجرة، فاكتب من يوافق على الزيارة. إذا كنت المالك، فاكتب من سيقابل الفني. هاتان الجملتان توفران زيارة ضائعة أكثر من وصف إضافي للعَرَض.`,
      ];

  const faq = [
    { q: `هل أؤدي ${job} بنفسي؟`, a: danger ? `لا تُنشر خطوات إصلاح لـ ${job}. يمكنك التسجيل والعزل بمفتاح تستخدمه وطلب فني.` : `يمكنك التجهيز وفحصاً لطيفاً تقوم به أصلاً. توقف إذا كانت المشكلة أعمق من السطح.` },
    { q: `هل هذا الدليل يعني أن ${job} متاح في منطقتي؟`, a: `نخدم 277 مكاناً في الإمارات السبع. اذكر الإمارة والمبنى، واطلب الزيارة.` },
    { q: `ماذا أصور؟`, a: `صورة واسعة وصورة قريبة وصورة لأي ملصق ظاهر. لا تفك غطاءً لتصل إلى ملصق.` },
    { q: `ماذا إذا شممت احتراقاً أو غازاً؟`, a: `اترك الغرفة واطلب شخصاً. لا تتابع الخطوات ولا تفتح القطعة.` },
    { q: `أين أرسل الطلب؟`, a: `استخدم ${input.href} أو نموذج عرض السعر. كرّر اسم ${job} حتى لا يبقى الطلب عرضاً فقط.` },
  ];

  return {
    title: danger ? `قبل الحجز: ${job} في منازل الإمارات` : `ما يمكنك فعله بأمان لـ ${job} في منازل الإمارات`,
    problem: danger
      ? `${job} يحتاج قراراً قبل أن يلمسه أحد. هذا الدليل يقول للزائر في الإمارات ماذا يلاحظ، وما يتركه مغلقاً، وكيف يرسل طلباً مفيداً. لا يعطي خطوات إصلاح.`
      : `${job} يبدأ بتجهيز يستطيع الزائر القيام به بأمان. هذا الدليل يشرح ماذا تُفسح، وماذا تصوّر، ومتى يخرج العمل عن السطح ويحتاج فنياً في الإمارات.`,
    quickAnswer: danger
      ? `لا تُصلح ${job} من هذه الصفحة. سجّل العَرَض، وأبعد الناس، واطلب نظرة مهنية. نخدم 277 مكاناً في الإمارات السبع. اذكر مكانك في الطلب.`
      : `يمكنك تجهيز المكان وإجراء فحص لطيف تعرفه. توقف إذا احتاج ${job} أدوات داخل جدار أو ارتفاعاً أو خلط مواد. ثم أرسل الصور واسم المكان.`,
    difficulty: danger ? "توقف ولاحظ" : "تجهيز فقط",
    estimatedTime: danger ? "10 دقائق للتسجيل" : "15–30 دقيقة للتجهيز",
    tools: danger ? ["كاميرا الهاتف", "ملاحظة الغرفة والوقت"] : ["قماش تستخدمه أصلاً", "كاميرا الهاتف", "المادة التي تستخدمها على هذا السطح"],
    materials: danger ? ["لا شيء. لا تشترِ قطعة قبل نظرة."] : ["مادة تستخدمها أصلاً فقط. لا تشترِ خلطاً كيميائياً لهذا الدليل."],
    safety: danger
      ? `توقف إذا رأيت سخونة أو شرراً أو دخاناً أو رائحة احتراق أو رائحة غاز أو ماء على قطعة كهربائية. لا تفتح لوحة توزيع أو خرطوم غاز أو منفذ وسيط تبريد أو جهازاً مغلقاً. العزل الذي تستخدمه يكفي. الاستكشاف ليس عملاً منزلياً لـ ${job}.`
      : `توقف إذا وجدت خطراً كهربائياً، أو تسرباً لا تعزله بصنبور تعرفه، أو تشطيباً يفشل تحت مادة تستخدمها عادة. لا تخلط المنظفات. أبعد الأطفال عن المواد المبللة.`,
    steps,
    checkWork: `${danger
      ? `النتيجة الجيدة من هذا الدليل رسالة يستطيع غيرها أن يتصرف بناءً عليها: ${job} والغرفة والإمارة وثلاث صور. ليست قطعة مُصلحة. إذا كانت الغرفة آمنة للبقاء والعلامة لا تنتشر، فقد أتممت جزء صاحب المنزل.`
      : `ينتهي جزء صاحب المنزل عندما يكون الطريق مفتوحاً، والصور تُظهر المكان نفسه قبل الفحص اللطيف وبعده، وقد سمّيت ${job} من غير تخمين سبب مخفي.`}

كيف تستخدم هذا الدليل لـ ${job}. اقرأ قاعدة التوقف قبل الخطوات. إذا طابقت ما تراه، فتجاوز الخطوات وأرسل الطلب. إذا كانت العلامة خفيفة، فأكمل الخطوات بالترتيب وتوقف عند أول خطوة لا تستطيع أداءها بأمان. لا تعامل خطوة لاحقة كإذن لتجاهل توقف سابق.

الزائر في شقة يضيف البرج والطابق. الزائر في فيلا يضيف ملاحظة البوابة. الزائر في محل أو مكتب يضيف الساعة التي يمكن فيها مقابلة الفني. هذه الثلاث هي أكثر أسباب فشل طلب صحيح لـ ${job}: المكان صحيح والوصول ناقص.

قارن الرد الذي يصلك. هل أعاد الشخص اسم ${job}؟ هل طلب الصورة التي التقطتها؟ هل تجنّب السعر قبل رؤية الوصول؟ إذا نعم، فقد أدى الدليل عمله. إذا طُلب منك الموافقة على استبدال قبل أن يرى أحد القطعة، فتوقف واطلب النتيجة أولاً. هذا ينطبق في دبي والشارقة وأبوظبي وعجمان وبقية الإمارات. اسم الإمارة يبقى في النموذج حتى لو بدا ${job} محدداً بما يكفي وحده.

اكتب جملة واحدة عما تغيّر منذ آخر يوم مقبول، وجملة واحدة عما جربته. ثم توقف عن الكتابة. النظريات الإضافية عن السبب لا تساعد بقدر هاتين الجملتين. إذا لم تعرف السبب، فاكتب أنك لا تعرفه. المجهول أنفع من التخمين لـ ${job}.`,
    whenToStop: danger
      ? `توقف عند أول علامة أن ${job} أكثر من ملصق تقرأه من الخارج. تعثر القاطع المتكرر، أو وجه دافئ، أو رائحة بعد أن توقفت عن الاستخدام، أو صوت من وحدة مغلقة أسباب لترك الدليل وإرسال طلب. لا تواصل الاختبار لترى إن عاد. توقف أيضاً إذا احتجت سلماً أو مادة كيميائية أو أداة لا تملكها. شراء أداة للمتابعة ليس جزءاً من هذا الدليل. إذا شعرت بالتعب أو الدوخة، فاخرج واترك الصفحة. لا تكمل ${job} من الغرفة التي لا ترتاح للتنفس فيها. أعد القراءة غداً فقط إذا بقيت العلامة كما هي ولم تزد الحرارة أو الرائحة أو الماء. إذا بقيت كما هي، فالطلب ما زال أنفع من الانتظار بصمت.`
      : `توقف عندما لا يكفي المسح والطريق المفتوح والصورة. إذا احتاج ${job} قطعة لا تطابقها، أو سلماً، أو فتح وصلة، فالخطوة التالية شخص، لا محاولة أخرى. توقف أيضاً إذا احتجت سلماً أو مادة كيميائية أو أداة لا تملكها. شراء أداة للمتابعة ليس جزءاً من هذا الدليل. إذا شعرت بالتعب أو الدوخة، فاخرج واترك الصفحة. لا تكمل ${job} من الغرفة التي لا ترتاح للتنفس فيها. أعد القراءة غداً فقط إذا بقيت العلامة كما هي ولم تزد الحرارة أو الرائحة أو الماء. إذا بقيت كما هي، فالطلب ما زال أنفع من الانتظار بصمت.`,
    professionalFallback: `اطلب ${job} من ${input.href} أو نموذج عرض السعر. أرسل الإمارة ونوع المبنى وملاحظات الوصول والصور من هذا الدليل. يُؤكد التوفر على الطلب. هذه الصفحة لا تنشر سعراً ولا وعداً بوقت زيارة.

قبل الإرسال اقرأ الطلب كأنك الشخص الذي سيصل. هل يجد المدخل؟ هل يعرف إن كانت المشكلة غرفة واحدة أو منطقة مشتركة؟ هل يعرف ما الذي جربته؟ إذا كانت أي إجابة لا، فأضف ذلك السطر. هذه القراءة الأخيرة هي آخر خطوة مفيدة لصاحب المنزل في ${job}. تأخذ وقتاً أقل من زيارة ثانية حُجزت لأن الملاحظة الأولى كانت العَرَض فقط.

إذا كنت في دبي أو الشارقة أو أبوظبي أو عجمان أو أم القيوين أو رأس الخيمة أو الفجيرة، فالقاعدة واحدة: اسم المكان مع اسم الخدمة ${job} أفضل من وصف عام. لا تخترع سعراً ولا وقت وصول ولا فرعاً. اكتب ما رأيته، ثم توقف. إذا تغيّرت العلامة بعد الصور، فأرسل رسالة متابعة قصيرة بدل تعديل الدليل في ذهنك. الفني يحتاج الفرق بين الصورتين والواقع عند الوصول، لا قصة جديدة كل ساعة.

فائدة هذا الدليل لصاحب المنزل أنه يقلل التخمين. أنت لا تُصلح ${job} من الصفحة. أنت تجعل الطلب قابلاً للتأكيد. هذا هو النفع الذي يستطيع الزائر أن يأخذه اليوم، في أي إمارة، من غير أن يفتح لوحة أو يخلط مادة أو يقف على أثاث.

ما الذي تكتبه في الطلب حتى يستفيد منه الفني. اكتب اسم الخدمة ${job} كما هو في الصفحة، لا وصفاً عاماً مثل «شيء لا يعمل». اكتب الإمارة ثم المدينة أو الحي إذا كنت تعرفه من دليل الأماكن. اكتب إن كان المكان شقة أو فيلا أو محلاً أو مكتباً. اكتب الطابق أو البوابة. اكتب إن كان هناك ماء أو حرارة أو رائحة أو صوت، ومتى بدأ. اكتب ما الذي جربته بالفعل، بما في ذلك أنك لم تجرب شيئاً. أرفق الصورة البعيدة والصورة القريبة وصورة الملصق الظاهر. لا تحذف الصور لأنك تعتقد أن العَرَض اختفى؛ الصورة القديمة ما زالت مفيدة إذا عاد العَرَض.

إذا كنت تنتظر رداً، فلا تفتح القطعة «لكي توفر الوقت». الوقت الذي توفره هو وقت الوصول فقط إذا بقي المكان كما صوّرته. أي فتح أو خلط أو تحريك ثقيل يغيّر الحالة ويجعل الصورة أقل فائدة. ابقَ خارج المنطقة المتأثرة إذا كانت العلامة تنتشر. إذا لم تنتشر وكانت الغرفة مريحة، فانتظر الرد ولا تضف محاولات جديدة. هذا هو الفرق بين زائر يستفيد من الدليل وزائر يحوّل دليلاً آمناً إلى محاولة إصلاح.`,
    seoTitle: `دليل ${job} لصاحب المنزل | النجاح الدائم · فكس بوينت`.slice(0, 80),
    metaDescription: danger
      ? `ماذا تلاحظ ومتى تتوقف في ${job} في الإمارات. لا خطوات إصلاح. أرسل الصور وأكّد الزيارة على الطلب.`
      : `تجهيز آمن لـ ${job} في الإمارات. ماذا تستطيع، ومتى تتوقف، وكيف تطلب بقية العمل.`,
    faq,
  };
}

export function renderedDiyWords(locale: {
  problem: string;
  quickAnswer: string;
  safety: string;
  steps: string[];
  checkWork: string;
  whenToStop: string;
  professionalFallback: string;
  faq: Array<{ a: string }>;
}) {
  return words(
    [locale.problem, locale.quickAnswer, locale.safety, locale.steps.join(" "), locale.checkWork, locale.whenToStop, locale.professionalFallback, locale.faq.map((item) => item.a).join(" ")].join(" "),
  );
}
