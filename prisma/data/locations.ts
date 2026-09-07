import type { LocaleCopy } from "./shared";

export const locationTree = {
  uae: {
    slug: "uae",
    type: "country" as const,
    sortOrder: 0,
    name: { en: "United Arab Emirates", ar: "دولة الإمارات العربية المتحدة" } satisfies LocaleCopy,
  },
  emirates: [
    {
      slug: "dubai",
      sortOrder: 1,
      name: { en: "Dubai", ar: "دبي" } satisfies LocaleCopy,
      climate:
        "Dubai combines dense high-rise districts with villa communities. Summer cooling loads are high, and coastal humidity around harbour and marina areas affects AC coils, paint, and external finishes more than inland neighbourhoods.",
      climateAr:
        "تجمع دبي بين الأبراج العالية ومجتمعات الفلل. أحمال التبريد صيفاً مرتفعة، والرطوبة الساحلية حول المرسى والمناطق البحرية تؤثر على ملفات التكييف والطلاء والتشطيبات الخارجية أكثر من الأحياء الداخلية.",
      properties:
        "Typical stock includes apartments in towers, hotel apartments, villas, and mixed-use buildings. Common-area cleaning and building maintenance requests often come from facilities teams as well as residents.",
      propertiesAr:
        "يشمل المخزون الشائع شقق الأبراج وشقق الفندقية والفلل والمباني متعددة الاستخدام. غالباً ما تأتي طلبات تنظيف المناطق المشتركة وصيانة المباني من فرق المرافق ومن السكان.",
      local:
        "ALNAJAH ALDAEM can receive cleaning and maintenance enquiries for Dubai. This page does not claim a Dubai trade license. Public licenses currently listed are Sharjah (internal building cleaning, 925212) and Ajman (building maintenance, 132954).",
      localAr:
        "يمكن للنجاح الدائم استلام طلبات التنظيف والصيانة في دبي. هذه الصفحة لا تدّعي وجود رخصة تجارية في دبي. الرخص المعروضة للعامة حالياً هي الشارقة (تنظيف المباني الداخلي 925212) وعجمان (صيانة المباني 132954).",
      nearby:
        "Community-level pages (for example Deira, Bur Dubai, Al Barsha, Marina, JLT) stay unpublished until each area has unique, useful content. Use this emirate page or name your community in the quote form.",
      nearbyAr:
        "صفحات الأحياء (مثل ديرة وبر دبي والبرشاء والمارينا وجي إل تي) تبقى غير منشورة حتى يتوفر محتوى مفيد لكل منطقة. استخدم صفحة الإمارة أو اذكر مجتمعك في نموذج عرض السعر.",
    },
    {
      slug: "abu-dhabi",
      sortOrder: 2,
      name: { en: "Abu Dhabi", ar: "أبوظبي" } satisfies LocaleCopy,
      climate:
        "Abu Dhabi City is coastal and humid; inland areas including Al Ain are hotter and drier. That difference matters for AC servicing, exterior paint, and waterproofing around gardens and irrigation.",
      climateAr:
        "مدينة أبوظبي ساحلية ورطبة؛ والمناطق الداخلية ومنها العين أشد حرارة وجفافاً. هذا الفرق مهم لصيانة التكييف وطلاء الواجهات والعزل حول الحدائق والري.",
      properties:
        "Typical properties include island apartments, villa compounds, government and commercial offices, and inland family homes. Al Ain is a city in Abu Dhabi Emirate, not a separate emirate.",
      propertiesAr:
        "تشمل العقارات الشائعة شقق الجزر ومجمعات الفلل والمكاتب الحكومية والتجارية ومنازل داخلية. العين مدينة ضمن إمارة أبوظبي وليست إمارة مستقلة.",
      local:
        "We accept Abu Dhabi and Al Ain enquiries for active services. We do not claim an Abu Dhabi trade license on this website. Licensing shown publicly remains Sharjah cleaning 925212 and Ajman maintenance 132954.",
      localAr:
        "نستقبل طلبات أبوظبي والعين للخدمات المفعّلة. لا ندّعي رخصة تجارية في أبوظبي على هذا الموقع. الرخص المعروضة تبقى تنظيف الشارقة 925212 وصيانة عجمان 132954.",
      nearby:
        "Areas such as Khalifa City, MBZ, Yas Island, Saadiyat, Reem, and Al Ain can be named on a quote request. Dedicated community pages are not published yet.",
      nearbyAr:
        "يمكن ذكر مناطق مثل مدينة خليفة ومحمد بن زايد وياس والسعادة والريم والعين في طلب العرض. صفحات الأحياء غير منشورة بعد.",
    },
    {
      slug: "sharjah",
      sortOrder: 3,
      name: { en: "Sharjah", ar: "الشارقة" } satisfies LocaleCopy,
      climate:
        "Sharjah has a dense mix of older apartments and newer residential clusters. Shared stacks, water tanks, and split AC units are common maintenance topics in buildings around Al Nahda, Al Majaz, and University City corridors.",
      climateAr:
        "تتميز الشارقة بمزيج كثيف من الشقق الأقدم والتجمعات السكنية الأحدث. شبكات الصرف المشتركة وخزانات المياه ووحدات التكييف المنفصلة مواضيع صيانة شائعة في مباني النهدة والمجاز ومدينة الجامعة.",
      properties:
        "Apartments, villas, and mixed buildings are typical. Internal building cleaning is a licensed activity here under ALNAJAH ALDAEM BUILDING CLEANING SERVICES, license 925212.",
      propertiesAr:
        "الشقق والفلل والمباني المختلطة شائعة. تنظيف المباني الداخلي نشاط مرخّص هنا باسم ALNAJAH ALDAEM BUILDING CLEANING SERVICES برقم 925212.",
      local:
        "Sharjah is one of two emirates where a public license is listed: Internal Building Cleaning Services, license 925212. Building maintenance enquiries are still accepted; maintenance licensing shown on this site is the Ajman license 132954.",
      localAr:
        "الشارقة إحدى إمارتين تظهر فيهما رخصة عامة: تنظيف المباني الداخلي رقم 925212. ما زلنا نستقبل طلبات صيانة المباني؛ رخصة الصيانة المعروضة على الموقع هي رخصة عجمان 132954.",
      nearby:
        "Al Majaz, Al Nahda, Al Khan, Al Taawun, Muwailih, University City, and Al Juraina can be specified on a request. Community pages remain draft until they have unique local notes.",
      nearbyAr:
        "يمكن تحديد المجاز والنهدة والخان والتعاون ومريصيص ومدينة الجامعة والجرايينة في الطلب. صفحات الأحياء تبقى مسودة حتى تتوفر ملاحظات محلية فريدة.",
    },
    {
      slug: "ajman",
      sortOrder: 4,
      name: { en: "Ajman", ar: "عجمان" } satisfies LocaleCopy,
      climate:
        "Ajman is compact and largely residential, with coastal humidity and a growing stock of apartments and villas. Access and parking are often simpler than in denser Dubai towers, but building age still varies widely.",
      climateAr:
        "عجمان إمارة مدمجة وسكنية في الغالب، مع رطوبة ساحلية ومخزون متزايد من الشقق والفلل. الوصول موقف السيارات غالباً أبسط من أبراج دبي، لكن عمر المباني يختلف بشكل كبير.",
      properties:
        "Villas, mid-rise apartments, and small commercial units are typical. Building maintenance is a licensed activity here under ALNAJAH ALDAEM BUILDING MAINTENANCE, license 132954.",
      propertiesAr:
        "الفلل والشقق متوسطة الارتفاع والوحدات التجارية الصغيرة شائعة. صيانة المباني نشاط مرخّص هنا باسم ALNAJAH ALDAEM BUILDING MAINTENANCE برقم 132954.",
      local:
        "Ajman is where our public building-maintenance license is listed (132954). Cleaning enquiries are also accepted; the public cleaning license listed on this site is Sharjah 925212.",
      localAr:
        "عجمان هي الإمارة التي تظهر فيها رخصة صيانة المباني العامة (132954). نستقبل أيضاً طلبات التنظيف؛ رخصة التنظيف المعروضة هي الشارقة 925212.",
      nearby:
        "Al Nuaimiya, Al Rashidiya, Al Jurf, Al Rawda, Al Mowaihat, Al Hamidiyah, Al Yasmeen, plus Masfout and Manama, can be named on a request. Those community pages are not indexable yet.",
      nearbyAr:
        "يمكن ذكر النعيمية والراشدية والجرف والروضة والمويهات والحميدية والياسمين ومصفوت ومنامة في الطلب. صفحات تلك الأحياء غير قابلة للفهرسة بعد.",
    },
    {
      slug: "umm-al-quwain",
      sortOrder: 5,
      name: { en: "Umm Al Quwain", ar: "أم القيوين" } satisfies LocaleCopy,
      climate:
        "Umm Al Quwain is smaller and more coastal-villa oriented than Dubai or Sharjah. Salt air and irrigation around low-rise homes affect exterior paint, AC outdoor units, and plumbing more than high-rise stacks.",
      climateAr:
        "أم القيوين أصغر وأكثر اعتماداً على الفلل الساحلية من دبي أو الشارقة. الهواء الملحي والري حول المنازل منخفضة الارتفاع يؤثران على الطلاء الخارجي ووحدات التكييف الخارجية والسباكة أكثر من شبكات الأبراج.",
      properties:
        "Detached villas, small apartment buildings, and light commercial units are typical. Travel time from northern emirates should be mentioned when you request a visit.",
      propertiesAr:
        "الفلل المنفصلة والمباني السكنية الصغيرة والوحدات التجارية الخفيفة شائعة. يُفضّل ذكر وقت التنقل من الإمارات الشمالية عند طلب الزيارة.",
      local:
        "We accept Umm Al Quwain enquiries for active services. No UAQ trade license is claimed here. Public credentials remain Sharjah cleaning 925212 and Ajman maintenance 132954.",
      localAr:
        "نستقبل طلبات أم القيوين للخدمات المفعّلة. لا ندّعي رخصة في أم القيوين هنا. البيانات العامة تبقى تنظيف الشارقة 925212 وصيانة عجمان 132954.",
      nearby:
        "Name your area on the quote or booking form. Dedicated UAQ community pages are not published in Phase 1.",
      nearbyAr:
        "اذكر منطقتك في نموذج العرض أو الحجز. صفحات أحياء أم القيوين غير منشورة في المرحلة الأولى.",
    },
    {
      slug: "ras-al-khaimah",
      sortOrder: 6,
      name: { en: "Ras Al Khaimah", ar: "رأس الخيمة" } satisfies LocaleCopy,
      climate:
        "Ras Al Khaimah mixes a humid coastline with inland and mountainous areas. Outdoor units, roofs, and exterior walls see different wear depending on whether the property sits near the sea or towards the foothills.",
      climateAr:
        "تجمع رأس الخيمة بين ساحل رطب ومناطق داخلية وجبلية. تتفاوت وحدات التكييف الخارجية والأسطح والجدران حسب قرب العقار من البحر أو السفوح.",
      properties:
        "Villas, older residential buildings, and newer developments are all present. Some sites need extra access planning compared with compact city apartments.",
      propertiesAr:
        "توجد فلل ومبانٍ سكنية أقدم ومشاريع أحدث. بعض المواقع تحتاج تخطيط وصول إضافي مقارنة بشقق المدن المدمجة.",
      local:
        "RAK enquiries are accepted for active services. This site does not list a Ras Al Khaimah trade license. Published licenses are Sharjah 925212 (cleaning) and Ajman 132954 (maintenance).",
      localAr:
        "نستقبل طلبات رأس الخيمة للخدمات المفعّلة. لا يعرض الموقع رخصة في رأس الخيمة. الرخص المنشورة هي الشارقة 925212 (تنظيف) وعجمان 132954 (صيانة).",
      nearby:
        "Describe your community on the form. Area-level SEO pages will be added only when they contain unique local information.",
      nearbyAr:
        "صف مجتمعك في النموذج. تُضاف صفحات المناطق فقط عندما تحتوي معلومات محلية فريدة.",
    },
    {
      slug: "fujairah",
      sortOrder: 7,
      name: { en: "Fujairah", ar: "الفجيرة" } satisfies LocaleCopy,
      climate:
        "Fujairah sits on the east coast. Higher humidity and occasional mountain weather affect AC drainage, exterior coatings, and plumbing more than some west-coast inland communities.",
      climateAr:
        "تقع الفجيرة على الساحل الشرقي. الرطوبة الأعلى والطقس الجبلي أحياناً يؤثران على تصريف التكييف والطلاء الخارجي والسباكة أكثر من بعض المجتمعات الداخلية على الساحل الغربي.",
      properties:
        "Residential buildings, villas, and industrial-adjacent sites are typical. Mention if the property is coastal, inland, or near an industrial area so we can plan access and PPE.",
      propertiesAr:
        "المباني السكنية والفلل والمواقع القريبة من مناطق صناعية شائعة. اذكر إن كان العقار ساحلياً أو داخلياً أو قرب منطقة صناعية لتخطيط الوصول ومعدات الوقاية.",
      local:
        "Fujairah enquiries are accepted for active services. No Fujairah trade license is claimed on this page. Public licenses listed are Sharjah cleaning 925212 and Ajman maintenance 132954.",
      localAr:
        "نستقبل طلبات الفجيرة للخدمات المفعّلة. لا ندّعي رخصة في الفجيرة في هذه الصفحة. الرخص المعروضة هي تنظيف الشارقة 925212 وصيانة عجمان 132954.",
      nearby:
        "Include your area name in the quote request. Community pages for Fujairah are not published yet.",
      nearbyAr:
        "ضمّن اسم منطقتك في طلب العرض. صفحات أحياء الفجيرة غير منشورة بعد.",
    },
  ],
};
