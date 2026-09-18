/**
 * One published FAQ page per approved offering.
 * Hazardous jobs are observation and stop only. No prices, coverage, or visit-time claims.
 */
import { buildVisitorServiceCopy } from "@/lib/catalog/service-visitor-copy";

export const SERVICE_FAQ_CATEGORY = "service-faq";
export const SERVICE_FAQ_SLUG_PREFIX = "faq-";

export type ServiceFaqInput = {
  slug: string;
  nameEn: string;
  categorySlug: string;
  categoryNameEn: string;
  href: string;
};

export type ServiceFaqLocale = {
  title: string;
  excerpt: string;
  body: string;
  faq: Array<{ q: string; a: string }>;
  seoTitle: string;
  metaDescription: string;
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

export function serviceFaqSlug(serviceSlug: string) {
  return `${SERVICE_FAQ_SLUG_PREFIX}${serviceSlug}`;
}

export function isServiceFaqSlug(slug: string) {
  return slug.startsWith(SERVICE_FAQ_SLUG_PREFIX);
}

export function composeServiceFaq(input: ServiceFaqInput) {
  const copy = buildVisitorServiceCopy({
    slug: input.slug,
    nameEn: input.nameEn,
    categorySlug: input.categorySlug,
    categoryNameEn: input.categoryNameEn,
    categoryNameAr: "الخدمة",
  });
  const danger = hazardous(input.categorySlug, input.nameEn);
  return {
    slug: serviceFaqSlug(input.slug),
    categorySlug: input.categorySlug,
    danger,
    en: buildEn(input, danger),
    ar: buildAr(input, copy.nameAr, danger),
  };
}

export function renderedFaqWords(locale: Pick<ServiceFaqLocale, "excerpt" | "body" | "faq">) {
  return words([locale.excerpt, locale.body, locale.faq.map((item) => `${item.q} ${item.a}`).join(" ")].join(" "));
}

function buildEn(input: ServiceFaqInput, danger: boolean): ServiceFaqLocale {
  const job = input.nameEn;
  const direct = danger
    ? `Do not repair ${job} from this page. Record the room, the emirate, and three photos, then request a professional look. We serve 277 places. This page is not a price.`
    : `You can prepare the area and do a light check you already know how to do for ${job}. Stop if the work needs a wall, a height, or a chemical mix, then send photos and the place name.`;

  const faq = [
    {
      q: `Can I do ${job} myself?`,
      a: danger
        ? `No. This page does not publish repair steps for ${job}. You can name the service, photograph the outside, isolate with a switch or tap you already use, and request a person. Opening a board, a gas hose, a refrigerant port, or a sealed case is not a home task.`
        : `You can prepare the path and repeat a light check you already do. You should not treat that as the full ${job} job if the fault is behind a finish, a fitting, or a height you do not already use safely.`,
    },
    {
      q: `Does this FAQ mean ${job} is available at my address?`,
      a: `No. Listing ${job} and answering questions about it does not mean a visit is available in every community in Dubai, Sharjah, Abu Dhabi, Ajman, Umm Al Quwain, Ras Al Khaimah, or Fujairah. Name the emirate and the building. Availability is confirmed on the request, not on this page.`,
    },
    {
      q: `What should I photograph before I request ${job}?`,
      a: `Take one wide photo of the room, one close photo of the item or the mark, and one of any label you can already read. Do not remove a cover to reach a label. Add the time of day and whether the sign is new or has been there for weeks. Those three photos are more useful than a long theory about the cause.`,
    },
    {
      q: `What should I write so the request for ${job} can be confirmed?`,
      a: `Write the service name ${job}, the emirate, whether the place is an apartment, a villa, a shop, or an office, the floor or gate note, who will open the door, and what you already tried. A tower may need a service lift. A villa may need a gate note. A shop may need an opening hour. Missing access is the usual reason a correct request still fails.`,
    },
    {
      q: `When should I stop and leave the room?`,
      a: `Stop if you smell burning or gas, see sparks, smoke, or water on an electrical item, or if a child, an older adult, or a pet cannot be moved out of the affected room. Do not keep testing to see if ${job} returns. Leave and request a person. Do not stand on furniture or buy a tool to continue.`,
    },
    {
      q: `Will this page tell me the price or the arrival time for ${job}?`,
      a: `No. This page does not publish a price, a visit-time promise, a branch, or a license. A person reviews access and what the photos show before any quotation. Instant automated pricing is not offered from an FAQ.`,
    },
    {
      q: `How is ${job} different from a general home note?`,
      a: `Use the exact name ${job} instead of a vague line such as something is wrong. Add one sentence on what changed since the last acceptable day and one sentence on what you already tried. If you do not know the cause, say that. Unknown is more useful than a guess. The category is ${input.categoryNameEn}, and the request should still name this service, not only the category.`,
    },
    {
      q: `Where do I send the ${job} request?`,
      a: `Use the quote form or the service page at ${input.href}. Repeat the name ${job}. Attach the wide photo, the close photo, and the visible label. If the sign changes after you send the photos, send a short follow-up. Do not rewrite the story every hour.`,
    },
  ];

  const body = [
    `## Direct answer`,
    direct,
    `This page is the FAQ for ${job} only. It is separate from the service page and from any DIY guide. Read the direct answer first. If that already matches what you see, skip the later questions and send the request.`,
    `## What a visitor can do today`,
    danger
      ? `The useful homeowner work for ${job} is observation. Stay outside the cover. Write the room, the time, and whether the sign is one point or several. If you already use a normal switch or tap for this area, leave it in the safe position you use every day. Do not hunt for a hidden isolator, and do not reset a breaker more than once.`
      : `The useful homeowner work for ${job} is preparation. Clear a path. Move items you do not want touched. Photograph before you move anything. If you already clean this surface, use only the product you already use. Stop if the finish softens, smells strongly, or the mark returns at once. Do not mix products.`,
    `In the United Arab Emirates the same service name is not the same job in every building. An apartment in a tower, a villa, a shop, and an office can share the words ${job} and still need different access notes. Write the one that is true for you. Do not invent a branch for the emirate.`,
    `## How to use these answers`,
    `Compare the reply you receive. Did the person restate ${job}? Did they ask for the photo you already took? Did they avoid a price before seeing access? If yes, the FAQ did its job. If you are asked to approve a replacement before anyone has seen the item, pause and ask for the finding first.`,
    `A visitor in Dubai should still write Dubai plus the tower or community. A visitor in Sharjah, Abu Dhabi, Ajman, Umm Al Quwain, Ras Al Khaimah, or Fujairah should do the same with that emirate. The emirate name stays on the form even when ${job} feels specific enough on its own. A listed place on the site is not a promise that this service is covered there.`,
    `## What not to add`,
    `Do not add a guessed cause, a part number you cannot read, or a video that opens the item. Do not delete an older photo because the sign faded. If the sign returns, that photo is still the useful record for ${job}. Do not treat a later answer on this page as permission to ignore an earlier stop rule.`,
    `If the room is no longer comfortable to stay in, leave. The FAQ can be read from another room. Clearing people is more useful than a closer picture. If you are unsure whether the sign is spreading, treat it as spreading.`,
    `## After you send`,
    `Read the request once as if you were the person arriving. Can they find the entrance? Can they tell whether this is one room or a shared area? Can they tell what you already tried? If any answer is no, add that line before you wait. That reread takes less time than a second visit booked because the first note was only the symptom.`,
    `This FAQ does not schedule the visit. The service page for ${job} is ${input.href}. Open that page to request the look. Keep the FAQ open if you need the photo list while you write.`,
  ].join("\n\n");

  return {
    title: danger ? `FAQ before you book ${job}` : `FAQ for ${job} in UAE homes`,
    excerpt: direct,
    body,
    faq,
    seoTitle: `${job} FAQ | Al Najah Al Daem · Fixpoint`.slice(0, 70),
    metaDescription: danger
      ? `Answers for ${job} in the UAE. What to record, when to stop, and how to request a look. No repair steps and no coverage claim.`
      : `Answers for ${job} in the UAE. What you can prepare, when to stop, and how to request the rest of the work.`,
  };
}

function buildAr(input: ServiceFaqInput, nameAr: string, danger: boolean): ServiceFaqLocale {
  const job = nameAr && nameAr !== "REVIEW_REQUIRED" ? nameAr : input.nameEn;
  const direct = danger
    ? `لا تُصلح ${job} من هذه الصفحة. سجّل الغرفة والإمارة وثلاث صور، ثم اطلب نظرة مهنية. نخدم 277 مكاناً. هذه الصفحة ليست سعراً.`
    : `يمكنك تجهيز المكان وإجراء فحص خفيف تعرفه أصلاً لـ ${job}. توقف إذا احتاج العمل جداراً أو ارتفاعاً أو خلطاً كيميائياً، ثم أرسل الصور واسم المكان.`;

  const faq = [
    {
      q: `هل أستطيع تنفيذ ${job} بنفسي؟`,
      a: danger
        ? `لا. هذه الصفحة لا تنشر خطوات إصلاح لـ ${job}. يمكنك تسمية الخدمة وتصوير الخارج والعزل بمفتاح أو صنبور تستخدمه أصلاً، ثم طلب شخص. فتح لوحة أو خرطوم غاز أو منفذ وسيط تبريد أو جسم مغلق ليس عملاً منزلياً.`
        : `يمكنك تجهيز الطريق وتكرار فحص خفيف تعرفه. لا تعامل ذلك على أنه عمل ${job} كاملاً إذا كان العطل خلف تشطيب أو وصلة أو ارتفاع لا تستخدمه بأمان أصلاً.`,
    },
    {
      q: `هل تعني هذه الصفحة أن ${job} متاحة في عنواني؟`,
      a: `لا. إدراج ${job} والإجابة عن أسئلتها لا يعني أن الزيارة متاحة في كل منطقة في دبي أو الشارقة أو أبوظبي أو عجمان أو أم القيوين أو رأس الخيمة أو الفجيرة. اكتب الإمارة والمبنى. يُؤكد التوفر على الطلب، لا على هذه الصفحة.`,
    },
    {
      q: `ماذا أصوّر قبل طلب ${job}؟`,
      a: `التقط صورة بعيدة للغرفة، وصورة قريبة للقطعة أو العلامة، وصورة لأي ملصق تستطيع قراءته أصلاً. لا تنزع غطاءً للوصول إلى ملصق. أضف وقت اليوم وهل العلامة جديدة أم موجودة منذ أسابيع. هذه الصور الثلاث أنفع من نظرية طويلة عن السبب.`,
    },
    {
      q: `ماذا أكتب حتى يمكن تأكيد طلب ${job}؟`,
      a: `اكتب اسم الخدمة ${job}، والإمارة، وهل المكان شقة أو فيلا أو محل أو مكتب، والطابق أو ملاحظة البوابة، ومن سيفتح الباب، وما الذي جربته. البرج قد يحتاج مصعد خدمة. الفيلا قد تحتاج ملاحظة بوابة. المحل قد يحتاج ساعة فتح. نقص الوصول هو السبب المعتاد لفشل طلب صحيح.`,
    },
    {
      q: `متى أتوقف وأغادر الغرفة؟`,
      a: `توقف إذا شممت احتراقاً أو غازاً، أو رأيت شرراً أو دخاناً أو ماء على قطعة كهربائية، أو إذا تعذر إبعاد طفل أو كبير سن أو حيوان من الغرفة المتأثرة. لا تواصل الاختبار لترى إن عاد ${job}. غادر واطلب شخصاً. لا تقف على الأثاث ولا تشترِ أداة للمتابعة.`,
    },
    {
      q: `هل تخبرني هذه الصفحة بسعر ${job} أو وقت الوصول؟`,
      a: `لا. هذه الصفحة لا تنشر سعراً ولا وعداً بوقت زيارة ولا فرعاً ولا رخصة. يراجع شخص الوصول وما تُظهره الصور قبل أي عرض سعر. لا يُقدَّم تسعير فوري آلي من صفحة أسئلة.`,
    },
    {
      q: `كيف يختلف ${job} عن ملاحظة عامة عن المنزل؟`,
      a: `استخدم الاسم الدقيق ${job} بدل سطر عام مثل «شيء لا يعمل». أضف جملة عما تغيّر منذ آخر يوم مقبول وجملة عما جربته. إذا لم تعرف السبب، فاكتب ذلك. المجهول أنفع من التخمين. الفئة هي ${input.categoryNameEn}، ويجب أن يسمّي الطلب هذه الخدمة لا الفئة وحدها.`,
    },
    {
      q: `أين أرسل طلب ${job}؟`,
      a: `استخدم نموذج عرض السعر أو صفحة الخدمة ${input.href}. أعد اسم ${job}. أرفق الصورة البعيدة والصورة القريبة وملصق الظاهر. إذا تغيّرت العلامة بعد إرسال الصور، فأرسل متابعة قصيرة. لا تعد كتابة القصة كل ساعة.`,
    },
  ];

  const body = [
    `## الإجابة المباشرة`,
    direct,
    `هذه الصفحة أسئلة ${job} فقط. هي منفصلة عن صفحة الخدمة وعن أي دليل أعمال منزلية. اقرأ الإجابة المباشرة أولاً. إذا طابقت ما تراه، فتجاوز الأسئلة اللاحقة وأرسل الطلب.`,
    `## ما يستطيع الزائر فعله اليوم`,
    danger
      ? `العمل المفيد لصاحب المنزل في ${job} هو الملاحظة. ابقَ خارج الغطاء. اكتب الغرفة والوقت وهل العلامة نقطة واحدة أو عدة نقاط. إذا كنت تستخدم مفتاحاً أو صنبوراً عادياً لهذه المنطقة، فاتركه في الوضع الآمن الذي تستخدمه كل يوم. لا تبحث عن قاطع مخفي، ولا تعِد ضبط القاطع أكثر من مرة.`
      : `العمل المفيد لصاحب المنزل في ${job} هو التجهيز. افتح طريقاً. أبعد ما لا تريد أن يُلمس. صوّر قبل أن تحرّك شيئاً. إذا كنت تنظف هذا السطح أصلاً، فاستخدم المادة التي تستخدمها فقط. توقف إذا لان التشطيب أو اشتدت الرائحة أو عادت العلامة فوراً. لا تخلط المواد.`,
    `في الإمارات اسم الخدمة نفسه ليس العمل نفسه في كل مبنى. شقة في برج وفيلا ومحل ومكتب قد تشترك في كلمات ${job} وتحتاج ملاحظات وصول مختلفة. اكتب ما ينطبق عليك. لا تخترع فرعاً للإمارة.`,
    `## كيف تستخدم هذه الإجابات`,
    `قارن الرد الذي يصلك. هل أعاد الشخص اسم ${job}؟ هل طلب الصورة التي التقطتها؟ هل تجنّب السعر قبل رؤية الوصول؟ إذا نعم، فقد أدت الصفحة عملها. إذا طُلب منك الموافقة على استبدال قبل أن يرى أحد القطعة، فتوقف واطلب النتيجة أولاً.`,
    `الزائر في دبي يكتب دبي ثم البرج أو المنطقة. والزائر في الشارقة أو أبوظبي أو عجمان أو أم القيوين أو رأس الخيمة أو الفجيرة يفعل الشيء نفسه مع إمارته. اسم الإمارة يبقى في النموذج حتى لو بدا ${job} محدداً بما يكفي. مكان مدرج في الموقع ليس وعداً بأن هذه الخدمة مغطاة هناك.`,
    `## ما لا تضيفه`,
    `لا تضف سبباً مخمّناً، ولا رقم قطعة لا تستطيع قراءته، ولا فيديو يفتح القطعة. لا تحذف صورة قديمة لأن العلامة خفت. إذا عادت العلامة، فتلك الصورة ما زالت السجل المفيد لـ ${job}. لا تعامل إجابة لاحقة في هذه الصفحة كإذن لتجاهل قاعدة توقف سابقة.`,
    `إذا لم تعد الغرفة مريحة للبقاء، فاخرج. يمكن قراءة الأسئلة من غرفة أخرى. إخلاء الأشخاص أنفع من صورة أقرب. إذا لم تتأكد إن كانت العلامة تنتشر، فاعتبرها تنتشر.`,
    `## بعد الإرسال`,
    `اقرأ الطلب كأنك الشخص الذي سيصل. هل يجد المدخل؟ هل يعرف إن كانت المشكلة غرفة واحدة أو منطقة مشتركة؟ هل يعرف ما الذي جربته؟ إذا كانت أي إجابة لا، فأضف ذلك السطر قبل أن تنتظر. هذه القراءة تأخذ وقتاً أقل من زيارة ثانية حُجزت لأن الملاحظة الأولى كانت العَرَض فقط.`,
    `هذه الصفحة لا تحجز الزيارة. صفحة الخدمة لـ ${job} هي ${input.href}. افتحها لطلب النظرة. أبقِ الأسئلة مفتوحة إذا احتجت قائمة الصور وأنت تكتب.`,
    `ما الذي يجعل الطلب قابلاً للتأكيد. اكتب اسم الخدمة كما هو، لا وصفاً عاماً. اكتب الإمارة ثم المدينة أو الحي إذا كنت تعرفه من دليل الأماكن. اكتب نوع المكان والطابق أو البوابة. اكتب إن كان هناك ماء أو حرارة أو رائحة أو صوت، ومتى بدأ. اكتب أنك لم تجرب شيئاً إذا كان ذلك صحيحاً. أرفق الصور الثلاث. لا تفتح القطعة لكي توفر الوقت. الوقت الذي توفره هو وقت الوصول فقط إذا بقي المكان كما صوّرته.`,
    `فائدة هذه الصفحة لصاحب المنزل أنها تقلل التخمين قبل الطلب. أنت لا تُصلح ${job} من الأسئلة. أنت تجعل الطلب قابلاً للتأكيد. هذا هو النفع الذي يستطيع الزائر أن يأخذه اليوم في أي إمارة، من غير أن يفتح لوحة أو يخلط مادة أو يقف على أثاث. إذا شعرت بالتعب أو الدوخة، فاخرج واقرأ الصفحة لاحقاً. لا تكمل الملاحظة من غرفة لا ترتاح للتنفس فيها. إذا بقيت العلامة كما هي في اليوم التالي ولم تزد الحرارة أو الرائحة أو الماء، فالطلب ما زال أنفع من الانتظار بصمت.`,
    `قبل أن تغلق الصفحة راجع ثلاث نقاط فقط. هل اسم الخدمة ${job} مكتوب كما يظهر هنا؟ هل اسم الإمارة موجود؟ هل الصور الثلاث مرفقة؟ إذا نقص أي بند، فأضفه ثم أرسل. لا تضف سعراً متوقعاً ولا وقت وصول ولا رقم رخصة. هذه الصفحة لا تملك تلك الأرقام، وكتابتها من عندك يجعل الطلب أضعف لا أقوى. الزائر في الشارقة أو عجمان أو أبوظبي أو دبي يتبع القاعدة نفسها. المكان الصحيح مع الوصول الصحيح أنفع من وصف طويل للسبب.`,
  ].join("\n\n");

  return {
    title: danger ? `أسئلة قبل طلب ${job}` : `أسئلة ${job} في منازل الإمارات`,
    excerpt: direct,
    body,
    faq,
    seoTitle: `أسئلة ${job} | النجاح الدائم · فكس بوينت`.slice(0, 70),
    metaDescription: danger
      ? `إجابات عن ${job} في الإمارات. ماذا تسجّل، ومتى تتوقف، وكيف تطلب نظرة. لا خطوات إصلاح ولا ادعاء تغطية.`
      : `إجابات عن ${job} في الإمارات. ماذا تجهّز، ومتى تتوقف، وكيف تطلب بقية العمل.`,
  };
}
