/**
 * Visitor copy for electrical services.
 * No coverage claims, prices, licenses, or DIY steps. Electrical work stays with a technician.
 */
export const TOP_ELECTRICAL_SLUGS = [
  "electrical-inspection",
  "electrical-fault-finding",
  "short-circuit-diagnosis",
  "socket-repair",
  "switch-repair",
  "light-repair",
  "wiring-inspection",
  "distribution-board-inspection",
] as const;

export type ElectricalCopy = {
  nameEn: string;
  nameAr: string;
  shortEn: string;
  shortAr: string;
  longEn: string;
  longAr: string;
  whoEn: string;
  whoAr: string;
  whatEn: string;
  whatAr: string;
  whenEn: string;
  whenAr: string;
  processEn: string;
  processAr: string;
  safetyEn: string;
  safetyAr: string;
};

const sharedProcessEn =
  "Tell us the symptom and the area of the property. We confirm the request, then a technician assesses the fitting before any repair or replacement is recommended.";
const sharedProcessAr =
  "اذكر العَرَض ومكانه في العقار. نؤكد الطلب، ثم يقيّم الفني القطعة قبل التوصية بالإصلاح أو الاستبدال.";
const sharedSafetyEn =
  "Stop using a fitting that is hot, smells of burning, sparks, or trips and will not stay on. Do not open a distribution board or work on live wiring.";
const sharedSafetyAr =
  "توقف عن استخدام قطعة ساخنة أو لها رائحة احتراق أو شرر، أو قاطع ينفصل ولا يثبت. لا تفتح لوحة التوزيع ولا تعمل على تمديدات موصولة بالكهرباء.";
const sharedPriceEn =
  "A quote follows the assessment. This page does not publish a price or a visit-time promise.";
const sharedPriceAr = "يُعرض السعر بعد التقييم. هذه الصفحة لا تنشر سعراً ولا وعداً بوقت الزيارة.";

function row(partial: Omit<ElectricalCopy, "processEn" | "processAr" | "safetyEn" | "safetyAr"> & Partial<ElectricalCopy>): ElectricalCopy {
  return {
    processEn: sharedProcessEn,
    processAr: sharedProcessAr,
    safetyEn: sharedSafetyEn,
    safetyAr: sharedSafetyAr,
    ...partial,
  };
}

export const ELECTRICAL_SERVICE_COPY: Record<string, ElectricalCopy> = {
  "electrical-maintenance": row({
    nameEn: "Electrical Maintenance",
    nameAr: "صيانة الكهرباء",
    shortEn: "Inspection and repair of sockets, switches, lights, breakers, and wiring faults in a property.",
    shortAr: "فحص وإصلاح المقابس والمفاتيح والإنارة والقواطع وأعطال التمديدات داخل العقار.",
    longEn:
      "Electrical maintenance starts with the symptom you can see: a dead socket, a switch that feels warm, a light that fails, or a breaker that trips. The work is assessment first, then repair or replacement only for the part that needs it.",
    longAr:
      "تبدأ صيانة الكهرباء من العَرَض الذي تراه: مقبس لا يعمل، مفتاح يسخن، إنارة تتوقف، أو قاطع ينفصل. العمل تقييم أولاً، ثم إصلاح أو استبدال للجزء الذي يحتاجه فقط.",
    whoEn: "Homes, villas, apartments, and small commercial units with a local electrical fault.",
    whoAr: "المنازل والفلل والشقق والوحدات التجارية الصغيرة التي فيها عطل كهربائي محدد.",
    whatEn: "Identify the fault, inspect the related fitting, and recommend the next professional step.",
    whatAr: "تحديد العطل، وفحص القطعة المرتبطة به، والتوصية بالخطوة المهنية التالية.",
    whenEn: "When a fitting fails, heats up, sparks, or a breaker trips more than once.",
    whenAr: "عندما تتوقف قطعة أو تسخن أو يصدر منها شرر، أو ينفصل القاطع أكثر من مرة.",
  }),
  "electrical-inspection": row({
    nameEn: "Electrical Inspection",
    nameAr: "فحص الكهرباء",
    shortEn: "A visual and functional check of sockets, switches, lights, and the distribution board you can access.",
    shortAr: "فحص بصري ووظيفي للمقابس والمفاتيح والإنارة ولوحة التوزيع التي يمكن الوصول إليها.",
    longEn:
      "Use an electrical inspection when you want the fault named before any parts are changed. The technician checks the fittings you report and records what needs repair, replacement, or further diagnosis.",
    longAr:
      "اطلب فحص الكهرباء عندما تريد تسمية العطل قبل تغيير أي قطعة. يفحص الفني ما بلّغت عنه ويسجّل ما يحتاج إصلاحاً أو استبدالاً أو تشخيصاً إضافياً.",
    whoEn: "Occupants who want a clear finding before repair work starts.",
    whoAr: "من يريد نتيجة واضحة قبل بدء الإصلاح.",
    whatEn: "Check reported fittings, note unsafe signs, and list the recommended next step.",
    whatAr: "فحص القطع المبلّغ عنها، وتسجيل علامات الخطر، وبيان الخطوة التالية.",
    whenEn: "After a trip, a failed fitting, or before agreeing to wider electrical work.",
    whenAr: "بعد انفصال القاطع أو توقف قطعة، أو قبل الموافقة على عمل كهربائي أوسع.",
  }),
  "electrical-fault-finding": row({
    nameEn: "Electrical Fault Finding",
    nameAr: "تحديد الأعطال الكهربائية",
    shortEn: "Trace why a socket, light, or circuit stopped working when the cause is not obvious.",
    shortAr: "تتبع سبب توقف مقبس أو إنارة أو دائرة عندما لا يكون السبب واضحاً.",
    longEn:
      "Fault finding is for intermittent trips, a circuit that dies in one room, or a fitting that fails only sometimes. The aim is the cause, not a guess followed by parts.",
    longAr:
      "تحديد العطل لحالات الانفصال المتكرر، أو دائرة تتوقف في غرفة واحدة، أو قطعة تتعطل أحياناً. الهدف هو السبب، لا تخمين ثم قطع غيار.",
    whoEn: "Properties where resetting a breaker or changing a lamp did not solve it.",
    whoAr: "العقارات التي لم يحلها إعادة القاطع أو تغيير المصباح.",
    whatEn: "Isolate the affected circuit and identify the fitting or section that needs professional work.",
    whatAr: "عزل الدائرة المتأثرة وتحديد القطعة أو الجزء الذي يحتاج عملاً مهنياً.",
    whenEn: "When the same fitting or breaker fails again after a simple check.",
    whenAr: "عندما يتكرر عطل القطعة أو القاطع بعد فحص بسيط.",
  }),
  "short-circuit-diagnosis": row({
    nameEn: "Short-Circuit Diagnosis",
    nameAr: "تشخيص قصر الدائرة",
    shortEn: "Find why a breaker trips immediately or a circuit will not stay on.",
    shortAr: "معرفة سبب انفصال القاطع فوراً أو عدم ثبات الدائرة.",
    longEn:
      "A short-circuit diagnosis looks for the fault that trips protection as soon as power is restored. Do not keep resetting a breaker that trips at once.",
    longAr:
      "تشخيص قصر الدائرة يبحث عن العطل الذي يفصل الحماية فور إعادة الكهرباء. لا تكرر إعادة قاطع ينفصل مباشرة.",
    whoEn: "Anyone whose breaker will not stay on, or who smells burning near a fitting.",
    whoAr: "من لا يثبت قاطعه، أو يشم رائحة احتراق قرب قطعة.",
    whatEn: "Diagnose the trip, isolate the circuit, and state whether repair or replacement is required.",
    whatAr: "تشخيص سبب الفصل، وعزل الدائرة، وبيان ما إذا كان المطلوب إصلاحاً أو استبدالاً.",
    whenEn: "Immediate trip, sparking, heat, or a burning smell.",
    whenAr: "فصل فوري أو شرر أو سخونة أو رائحة احتراق.",
  }),
  "socket-repair": row({
    nameEn: "Socket Repair",
    nameAr: "إصلاح المقابس",
    shortEn: "Repair a socket that is loose, dead, cracked, or not holding a plug.",
    shortAr: "إصلاح مقبس مرتخٍ أو لا يعمل أو متشقق أو لا يمسك القابس.",
    longEn:
      "Socket repair covers the outlet you can point to. If several sockets on the same wall fail together, the visit starts as fault finding rather than replacing one faceplate.",
    longAr:
      "إصلاح المقبس يخص المخرج الذي تشير إليه. إذا توقفت عدة مقابس في الجدار نفسه، تبدأ الزيارة بتحديد العطل لا باستبدال غطاء واحد.",
    whoEn: "Homes and offices with a single faulty socket.",
    whoAr: "المنازل والمكاتب التي فيها مقبس واحد متعطل.",
    whatEn: "Inspect the socket, repair what is safe to restore, or recommend replacement.",
    whatAr: "فحص المقبس، وإصلاح ما يمكن إعادته بأمان، أو التوصية بالاستبدال.",
    whenEn: "A loose socket, scorch mark, or plug that will not stay in.",
    whenAr: "مقبس مرتخٍ أو أثر احتراق أو قابس لا يثبت.",
  }),
  "socket-replacement": row({
    nameEn: "Socket Replacement",
    nameAr: "استبدال المقابس",
    shortEn: "Replace a damaged socket after inspection shows repair is not enough.",
    shortAr: "استبدال مقبس تالف بعد أن يبيّن الفحص أن الإصلاح غير كافٍ.",
    longEn:
      "Replacement is recommended when the socket body is cracked, burnt, or no longer holds a plug. The old fitting is checked before a new one is fitted.",
    longAr:
      "يُوصى بالاستبدال عندما يكون جسم المقبس متشققاً أو محترقاً أو لم يعد يمسك القابس. تُفحص القطعة القديمة قبل تركيب الجديدة.",
    whoEn: "Properties with a socket that is visibly damaged.",
    whoAr: "العقارات التي فيها مقبس تالفة ظاهرياً.",
    whatEn: "Remove the failed socket and fit a replacement suited to that point.",
    whatAr: "فك المقبس التالف وتركيب بديل مناسب لذلك المخرج.",
    whenEn: "After inspection, or when the socket is cracked or burnt.",
    whenAr: "بعد الفحص، أو عندما يكون المقبس متشققاً أو محترقاً.",
  }),
  "switch-repair": row({
    nameEn: "Switch Repair",
    nameAr: "إصلاح المفاتيح",
    shortEn: "Repair a light switch that sticks, sparks, or no longer controls the light.",
    shortAr: "إصلاح مفتاح إنارة يعلق أو يشرر أو لم يعد يتحكم بالمصباح.",
    longEn:
      "Switch repair is for the switch plate and its mechanism. If the light still fails after the switch is confirmed, the visit moves to the lamp or the circuit.",
    longAr:
      "إصلاح المفتاح يخص لوحة المفتاح وآليته. إذا بقيت الإنارة متوقفة بعد التأكد من المفتاح، تنتقل الزيارة إلى المصباح أو الدائرة.",
    whoEn: "Rooms where one switch no longer operates its light.",
    whoAr: "الغرف التي لم يعد مفتاحها يشغّل الإنارة.",
    whatEn: "Inspect the switch, repair the mechanism if suitable, or recommend replacement.",
    whatAr: "فحص المفتاح، وإصلاح الآلية إن أمكن، أو التوصية بالاستبدال.",
    whenEn: "A stiff, warm, or noisy switch.",
    whenAr: "مفتاح متصلب أو دافئ أو يصدر صوتاً.",
  }),
  "switch-replacement": row({
    nameEn: "Switch Replacement",
    nameAr: "استبدال المفاتيح",
    shortEn: "Replace a cracked, burnt, or failed light switch.",
    shortAr: "استبدال مفتاح إنارة متشقق أو محترق أو متوقف.",
    longEn:
      "A switch is replaced when the rocker is broken or the body shows heat damage. The circuit is checked so the new switch matches the existing control.",
    longAr:
      "يُستبدل المفتاح عندما ينكسر الزر أو يظهر أثر حرارة على الجسم. تُفحص الدائرة ليطابق المفتاح الجديد التحكم الحالي.",
    whoEn: "Properties with a damaged switch plate.",
    whoAr: "العقارات التي فيها مفتاح تالف.",
    whatEn: "Remove the failed switch and fit a replacement.",
    whatAr: "فك المفتاح التالف وتركيب بديل.",
    whenEn: "Visible damage, or repair is not possible.",
    whenAr: "بعد تلف ظاهر، أو إذا تعذر الإصلاح.",
  }),
  "light-repair": row({
    nameEn: "Light Repair",
    nameAr: "إصلاح الإنارة",
    shortEn: "Repair a light that flickers, stays off, or fails in one room.",
    shortAr: "إصلاح إنارة ترمش أو تبقى مطفأة أو تتوقف في غرفة واحدة.",
    longEn:
      "Light repair checks the lamp, holder, and switch for that fitting. It does not assume the whole circuit must be replaced.",
    longAr:
      "إصلاح الإنارة يفحص المصباح والحاضن والمفتاح لتلك القطعة. لا يفترض استبدال الدائرة كلها.",
    whoEn: "Rooms with one light out or flickering.",
    whoAr: "الغرف التي فيها إنارة واحدة متوقفة أو ترمش.",
    whatEn: "Find whether the fault is the lamp, the holder, or the switch, then repair that part.",
    whatAr: "معرفة إن كان العطل في المصباح أو الحاضن أو المفتاح، ثم إصلاح ذلك الجزء.",
    whenEn: "A light that will not stay on, or flickers when the switch is used.",
    whenAr: "إنارة لا تثبت أو ترمش عند استخدام المفتاح.",
  }),
  "light-installation": row({
    nameEn: "Light Installation",
    nameAr: "تركيب الإنارة",
    shortEn: "Install a light on an existing point after the supply and fixing are checked.",
    shortAr: "تركيب إنارة على نقطة قائمة بعد فحص التغذية والتثبيت.",
    longEn:
      "Installation is for an existing lighting point. A new cable run is separate work and is only recommended after inspection.",
    longAr:
      "التركيب لنقطة إنارة موجودة. مد كابل جديد عمل منفصل ولا يُوصى به إلا بعد الفحص.",
    whoEn: "Properties replacing or adding a fitting on a current lighting point.",
    whoAr: "العقارات التي تستبدل أو تضيف قطعة على نقطة إنارة قائمة.",
    whatEn: "Check the point, fit the light, and confirm it switches correctly.",
    whatAr: "فحص النقطة، وتركيب الإنارة، والتأكد أنها تعمل من المفتاح.",
    whenEn: "When a light needs to be fitted to an existing point.",
    whenAr: "عند الحاجة لتركيب إنارة على نقطة موجودة.",
  }),
  "led-light-installation": row({
    nameEn: "LED Light Installation",
    nameAr: "تركيب إضاءة LED",
    shortEn: "Fit an LED lamp or fitting on an existing lighting point.",
    shortAr: "تركيب مصباح أو وحدة LED على نقطة إنارة موجودة.",
    longEn:
      "LED installation checks that the existing holder or driver suits the lamp. It is not a promise to rewire the room.",
    longAr:
      "تركيب LED يتأكد أن الحاضن أو المشغّل الحالي يناسب المصباح. ليس وعداً بإعادة تمديد الغرفة.",
    whoEn: "Occupants changing a fitting to LED on the current point.",
    whoAr: "من يبدّل قطعة إلى LED على النقطة الحالية.",
    whatEn: "Confirm compatibility, install the LED, and test the switch.",
    whatAr: "التأكد من التوافق، وتركيب LED، وتجربة المفتاح.",
    whenEn: "When an LED is to be fitted to an existing point.",
    whenAr: "عند تركيب LED على نقطة قائمة.",
  }),
  "led-light-replacement": row({
    nameEn: "LED Light Replacement",
    nameAr: "استبدال إضاءة LED",
    shortEn: "Replace a failed LED lamp or fitting after a simple lamp change is not enough.",
    shortAr: "استبدال مصباح أو وحدة LED توقفت بعد أن لا يكفي تغيير المصباح فقط.",
    longEn:
      "Replacement is for an LED that has failed, flickers, or does not match the existing control. The cause is checked so a new lamp is not fitted onto a dead circuit.",
    longAr:
      "الاستبدال لمصباح LED توقف أو يرمش أو لا يناسب التحكم الحالي. يُفحص السبب حتى لا يُركب مصباح جديد على دائرة متوقفة.",
    whoEn: "Properties with a failed LED that a new bulb did not fix.",
    whoAr: "العقارات التي لم يصلحها تغيير اللمبة.",
    whatEn: "Test the point and replace the failed LED unit or lamp.",
    whatAr: "فحص النقطة واستبدال وحدة أو مصباح LED المتوقف.",
    whenEn: "An LED stays off, flickers, or is physically damaged.",
    whenAr: "عندما تبقى LED مطفأة أو ترمش أو تتلف ظاهرياً.",
  }),
  "wiring-inspection": row({
    nameEn: "Wiring Inspection",
    nameAr: "فحص التمديدات",
    shortEn: "Inspect accessible wiring where a circuit fault or damaged cable is suspected.",
    shortAr: "فحص التمديدات الظاهرة عند الاشتباه بعطل دائرة أو كابل تالف.",
    longEn:
      "Wiring inspection looks at accessible cable, connections, and the related breaker. Concealed cable is not assumed to be replaced unless the assessment shows that is required.",
    longAr:
      "فحص التمديدات ينظر إلى الكابل والوصلات والقاطع الذي يمكن الوصول إليه. لا يُفترض استبدال الكابل المخفي إلا إذا بيّن التقييم ذلك.",
    whoEn: "Properties with repeated trips, heat at a fitting, or damaged visible cable.",
    whoAr: "العقارات التي يتكرر فيها الفصل أو سخونة قطعة أو كابل ظاهر تالف.",
    whatEn: "Inspect accessible wiring and state whether repair, replacement, or more diagnosis is needed.",
    whatAr: "فحص التمديدات الظاهرة وبيان الحاجة إلى إصلاح أو استبدال أو تشخيص إضافي.",
    whenEn: "Damaged cable, repeated trips, or before agreeing to rewiring.",
    whenAr: "كابل تالف أو فصل متكرر أو قبل الموافقة على إعادة التمديد.",
  }),
  "wiring-repair": row({
    nameEn: "Wiring Repair",
    nameAr: "إصلاح التمديدات",
    shortEn: "Repair a damaged or faulty section of wiring identified during inspection.",
    shortAr: "إصلاح جزء تالف أو معطوب من التمديدات بعد الفحص.",
    longEn:
      "Wiring repair is limited to the section the inspection identifies. A full rewire is a different job and is not started from this page alone.",
    longAr:
      "إصلاح التمديدات يقتصر على الجزء الذي يحدده الفحص. إعادة التمديد كاملة عمل مختلف ولا تبدأ من هذه الصفحة وحدها.",
    whoEn: "Properties with a located wiring fault.",
    whoAr: "العقارات التي حُدّد فيها عطل تمديد.",
    whatEn: "Repair the faulty section and confirm the related circuit can be restored.",
    whatAr: "إصلاح الجزء المعطوب والتأكد أن الدائرة المرتبطة يمكن إعادتها.",
    whenEn: "After inspection identifies a repairable section.",
    whenAr: "بعد أن يحدد الفحص جزءاً قابلاً للإصلاح.",
  }),
  "wiring-replacement": row({
    nameEn: "Wiring Replacement",
    nameAr: "استبدال التمديدات",
    shortEn: "Replace a failed wiring section when repair is not suitable.",
    shortAr: "استبدال جزء من التمديدات عندما لا يناسب الإصلاح.",
    longEn:
      "Replacement follows an inspection that shows the cable or connection cannot be repaired safely. The scope is the identified section, not an automatic full rewire.",
    longAr:
      "يأتي الاستبدال بعد فحص يبيّن أن الكابل أو الوصلة لا تُصلح بأمان. النطاق هو الجزء المحدد، لا إعادة تمديد كاملة تلقائياً.",
    whoEn: "Properties where inspection has already found a section that must be replaced.",
    whoAr: "العقارات التي بيّن فحصها جزءاً يجب استبداله.",
    whatEn: "Replace the identified wiring section and test the circuit.",
    whatAr: "استبدال جزء التمديد المحدد وتجربة الدائرة.",
    whenEn: "Burnt, brittle, or unsafe cable identified on inspection.",
    whenAr: "كابل محترق أو هش أو غير آمن بعد الفحص.",
  }),
  "circuit-breaker-inspection": row({
    nameEn: "Circuit Breaker Inspection",
    nameAr: "فحص قاطع الدائرة",
    shortEn: "Inspect a breaker that trips, will not reset, or feels hot.",
    shortAr: "فحص قاطع ينفصل أو لا يُعاد أو يسخن.",
    longEn:
      "Breaker inspection checks the device and the circuit it protects. A tripping breaker can be protecting a fault elsewhere, so it is not replaced by default.",
    longAr:
      "فحص القاطع ينظر إلى الجهاز والدائرة التي يحميها. القاطع الذي ينفصل قد يحمي عطلاً في مكان آخر، لذلك لا يُستبدل تلقائياً.",
    whoEn: "Properties with a breaker that trips or will not reset.",
    whoAr: "العقارات التي ينفصل قاطعها أو لا يُعاد.",
    whatEn: "Inspect the breaker and say whether the fault is the breaker or the circuit.",
    whatAr: "فحص القاطع وبيان إن كان العطل فيه أو في الدائرة.",
    whenEn: "Repeated trips, a breaker that will not reset, or heat at the board.",
    whenAr: "فصل متكرر أو قاطع لا يُعاد أو سخونة عند اللوحة.",
  }),
  "circuit-breaker-replacement": row({
    nameEn: "Circuit Breaker Replacement",
    nameAr: "استبدال قاطع الدائرة",
    shortEn: "Replace a breaker after inspection shows the device itself has failed.",
    shortAr: "استبدال قاطع بعد أن يبيّن الفحص أن الجهاز نفسه توقف.",
    longEn:
      "A breaker is replaced only when inspection shows it has failed. If the circuit is still faulty, replacing the breaker alone will not finish the job.",
    longAr:
      "يُستبدل القاطع فقط عندما يبيّن الفحص أنه توقف. إذا بقي عطل الدائرة، فاستبدال القاطع وحده لا ينهي العمل.",
    whoEn: "Properties where a breaker has already been diagnosed as failed.",
    whoAr: "العقارات التي شُخّص قاطعها على أنه متوقف.",
    whatEn: "Replace the failed breaker and test that the circuit can be restored.",
    whatAr: "استبدال القاطع المتوقف والتأكد أن الدائرة يمكن إعادتها.",
    whenEn: "After inspection, not as a first guess for every trip.",
    whenAr: "بعد الفحص، لا كتخمين أول لكل انفصال.",
  }),
  "distribution-board-inspection": row({
    nameEn: "Distribution Board Inspection",
    nameAr: "فحص لوحة التوزيع",
    shortEn: "Inspect the distribution board when several circuits trip or the board shows heat or damage.",
    shortAr: "فحص لوحة التوزيع عند انفصال عدة دوائر أو ظهور سخونة أو تلف على اللوحة.",
    longEn:
      "The distribution board inspection looks at the board, breakers, and signs of heat or damage. Opening and testing the board is technician work.",
    longAr:
      "فحص لوحة التوزيع ينظر إلى اللوحة والقواطع وعلامات الحرارة أو التلف. فتح اللوحة واختبارها عمل فني.",
    whoEn: "Properties with repeated trips across more than one circuit, or a damaged board cover.",
    whoAr: "العقارات التي ينفصل فيها أكثر من دائرة، أو غطاء اللوحة تالف.",
    whatEn: "Inspect the board and list which circuits or devices need the next professional step.",
    whatAr: "فحص اللوحة وبيان الدوائر أو الأجهزة التي تحتاج الخطوة المهنية التالية.",
    whenEn: "Heat, noise, burning smell, or trips that affect more than one room.",
    whenAr: "سخونة أو صوت أو رائحة احتراق أو فصل يؤثر على أكثر من غرفة.",
  }),
};

export const ELECTRICAL_PRICE_EN = sharedPriceEn;
export const ELECTRICAL_PRICE_AR = sharedPriceAr;
