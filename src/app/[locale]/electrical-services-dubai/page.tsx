import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { buildMetadata, faqJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { siteConfig, telUrl, whatsappUrl } from '@/config/site';

const copy = {
 en: {
  title: 'Electrical Maintenance in Dubai | Fixpoint',
  description: 'Discuss electrical maintenance for offices, shops and homes in Dubai. Request a scope review, written quotation and confirmation of availability and required approvals.',
  kicker: 'OFFICES · RETAIL · HOMES', heading: 'Electrical maintenance in Dubai.',
  intro: 'For offices, shops and homes. Describe your electrical maintenance needs to Al Najah Al Daem · Fixpoint and request a clear, written quotation. Share your Dubai location, the issue and your preferred visit time so our team can review the work and confirm the next step.',
  quote: 'Request an electrical-work quotation', call: 'Call the team', whatsapp: 'Discuss your requirements',
  note: 'Scope, availability and pricing are confirmed before booking. Installation and supply-change work may need project-specific approvals.',
  sections: [
   ['Commercial electrical services', 'For an office, shop or managed building, the practical question is how to resolve the issue while protecting occupants and limiting disruption. Describe affected rooms, operating hours and any equipment that cannot be interrupted. Ask for a written scope covering inspection, proposed work, isolation arrangements, reinstatement and handover. Major installations, supply changes and regulated contracting require the appropriate authorization; they are not automatically included in a maintenance enquiry.'],
   ['Electrical maintenance and repair enquiries', 'Report recurring power interruptions, a light that stops working, a damaged fitting or a concern about an outlet. A symptom is not a diagnosis: several causes can produce the same visible problem. Give the team a factual description and let an appropriately qualified person decide what inspection is needed. Do not remove covers, touch exposed conductors, repeatedly reset a tripping breaker or attempt live testing. If there is smoke, fire or immediate danger, move away and use the appropriate emergency service rather than waiting for a quotation.'],
   ['Residential electrical services', 'For an apartment or villa, include whether you are the owner, tenant or property manager. Check who must authorize access and alterations. Tell us which areas are affected, whether the issue is intermittent and whether any recent work preceded it. Share photographs only if they can be taken safely from a normal distance. A residential enquiry is reviewed individually; it does not establish that a full rewire, distribution-board replacement or new installation can be undertaken.'],
   ['Choosing a local electrical contractor', 'When comparing electrical companies near you, proximity alone does not establish suitability. Ask about the legal entity doing the work, the activities covered by its licence, the people attending and the approvals required for the exact job. For commercial electrical contractors, also clarify responsibility for permits, coordination with building management, testing records and any subcontracted work. Claims such as “licensed electrician” or “best electrical company” should be supported by current, relevant evidence rather than a search advertisement.'],
   ['What affects the quotation?', 'The price depends on the problem, investigation time, access, working hours, materials and agreed scope. A repair visit and a commercial installation are different purchases. Ask whether attendance, diagnosis, parts, labour, tax and follow-up visits are included. If inspection reveals additional work, request an updated written quotation before authorizing it. We do not publish an invented flat rate or promise that all electrical faults can be fixed during one visit.'],
   ['How to prepare a useful enquiry', 'Send the Dubai area and property type, a short description of the issue, when it started and the preferred access window. For business premises, include the facilities contact and any shutdown restrictions. Describe relevant equipment without sending private tenant records or sensitive security information. Our team can then review the request, clarify missing details and confirm the next step. Do not treat an automated acknowledgement as an accepted work order.'],
   ['For facilities teams and main contractors', 'If you are requesting commercial electrical maintenance or exploring electrical subcontractors, provide a defined package of work. State what is included, what remains with the main contractor, how site access is controlled and who accepts the completed work. Confirm insurance, applicable qualifications, authorized activities and any authority or landlord requirements before appointment. Neither a website enquiry nor a general building-maintenance licence establishes eligibility for every electrical contracting package.'],
  ],
  faq: [
   ['Can I hire Fixpoint directly from this page?', 'Start with a quotation request or call. The team must first confirm scope, location, availability and any authorization requirements. Work is booked only after the applicable arrangements are agreed.'],
   ['Can I enquire about installation or supply changes?', 'Yes. Describe the proposed work so the team can review the scope. The responsible contractor and any required authority approvals must be confirmed before appointment.'],
   ['Do you offer a guaranteed arrival time or emergency response?', 'No guaranteed arrival time or round-the-clock service is promised here. Ask the team to confirm availability. Do not use the enquiry process for an immediate electrical emergency.'],
   ['Can I request other maintenance services too?', 'Yes. The existing services catalogue remains available. Tell the team which tasks you need so that the scope and arrangements can be reviewed.'],
  ], guides:'Electrical buyer guides', other:'Explore all existing services', sources:'Check contractor information with DEWA', footer:'Ready to discuss the work? Call the team or request a written quotation with your location, property type and a short description of the issue.',
 },
 ar: {
  title:'صيانة الكهرباء في دبي | فكس بوينت',
  description:'ناقش احتياجات صيانة الكهرباء للمكاتب والمحلات والمنازل في دبي. اطلب مراجعة نطاق العمل وعرضاً مكتوباً وتأكيد التوافر والتصاريح المطلوبة.',
  kicker:'مكاتب · محلات · منازل', heading:'صيانة الكهرباء في دبي.',
  intro:'للمكاتب والمحلات والمنازل. أخبر فريق النجاح الدائم · فكس بوينت باحتياجات الصيانة الكهربائية واطلب عرض سعر مكتوباً وواضحاً. أرسل موقع العقار في دبي ووصف المشكلة وموعد الزيارة المفضل حتى يراجع الفريق العمل ويؤكد الخطوة التالية.',
  quote:'اطلب عرضاً لأعمال الكهرباء', call:'اتصل بالفريق', whatsapp:'ناقش متطلبات العمل',
  note:'يتم تأكيد النطاق والتوافر والسعر قبل الحجز. قد تتطلب التركيبات وتعديلات التغذية موافقات خاصة بالمشروع.',
  sections:[
   ['خدمات الكهرباء للمنشآت التجارية','في المكتب أو المحل أو المبنى المُدار، ينبغي تحديد طريقة معالجة المشكلة مع حماية الموجودين وتقليل تعطيل النشاط. اذكر الأماكن المتأثرة وساعات التشغيل والأجهزة التي لا يمكن إيقافها. اطلب نطاقاً مكتوباً يشمل المعاينة والأعمال المقترحة وترتيبات فصل التيار وإعادة الموقع وتسليم العمل. التركيبات الكبيرة وتعديل التغذية وأعمال المقاولات المنظمة تحتاج إلى الصلاحيات المناسبة، ولا تدخل تلقائياً في طلب صيانة عادي.'],
   ['استفسارات الصيانة والإصلاح الكهربائي','صف انقطاع التيار المتكرر أو تعطل الإضاءة أو تلف قطعة أو وجود مشكلة في مقبس. الوصف الظاهر لا يحدد السبب، وقد تتشابه أعراض أعطال مختلفة. قدّم المعلومات للفريق واترك قرار الفحص للشخص المؤهل. لا تفك الأغطية ولا تلمس أسلاكاً مكشوفة ولا تكرر إعادة تشغيل قاطع يفصل باستمرار ولا تحاول الفحص على دائرة حية. عند وجود دخان أو حريق أو خطر مباشر، ابتعد واطلب خدمة الطوارئ المناسبة بدلاً من انتظار عرض سعر.'],
   ['خدمات الكهرباء للمنازل','إذا كان العقار شقة أو فيلا، وضّح إن كنت المالك أو المستأجر أو مدير العقار. تحقق ممن يملك صلاحية الموافقة على الدخول والتعديلات. اذكر المناطق المتأثرة، وهل المشكلة متقطعة، وهل بدأت بعد أعمال سابقة. أرسل الصور فقط إذا أمكن التقاطها بأمان من مسافة عادية. مراجعة طلب منزلي لا تعني تلقائياً قبول إعادة التمديدات بالكامل أو استبدال لوحة توزيع أو تنفيذ تركيب جديد.'],
   ['كيف تختار مقاول كهرباء محلياً؟','القرب من موقعك وحده لا يثبت ملاءمة الشركة للعمل. اسأل عن الجهة القانونية التي ستنفذ الخدمة والأنشطة الواردة في ترخيصها والعاملين الذين سيحضرون والموافقات المطلوبة للمهمة المحددة. في المشاريع التجارية، حدد أيضاً مسؤولية التصاريح والتنسيق مع إدارة المبنى وسجلات الفحص وأي أعمال من الباطن. عبارات مثل «كهربائي مرخص» أو «أفضل شركة كهرباء» تحتاج إلى أدلة حالية مرتبطة بالعمل، ولا يكفي ظهورها في إعلان.'],
   ['ما الذي يؤثر في عرض السعر؟','يتأثر السعر بالمشكلة ووقت التشخيص وإمكانية الوصول وساعات العمل والمواد والنطاق المتفق عليه. زيارة إصلاح تختلف عن مشروع تركيب تجاري. اسأل هل يشمل العرض الحضور والتشخيص والقطع والأجور والضريبة وزيارات المتابعة. إذا أظهرت المعاينة أعمالاً إضافية، اطلب عرضاً محدثاً مكتوباً قبل الموافقة. لا نضع سعراً ثابتاً غير موثق ولا نَعِد بإصلاح جميع الأعطال في زيارة واحدة.'],
   ['ما المعلومات المفيدة عند إرسال الطلب؟','اذكر منطقة العقار في دبي ونوعه ووصفاً مختصراً للمشكلة ووقت بدايتها وموعد الدخول المفضل. للمنشآت التجارية، أضف جهة التنسيق في إدارة المرافق والقيود المتعلقة بإيقاف التشغيل. صف المعدات المعنية دون إرسال سجلات خاصة بالسكان أو معلومات أمنية حساسة. يراجع الفريق التفاصيل ويطلب ما ينقص ويحدد الخطوة التالية. رسالة تأكيد استلام الطلب ليست أمراً معتمداً لبدء العمل.'],
   ['لمديري المرافق والمقاولين الرئيسيين','إذا كنت تطلب صيانة كهربائية تجارية أو تبحث عن مقاول من الباطن، جهّز حزمة عمل واضحة. بيّن الأعمال المشمولة وما يبقى على المقاول الرئيسي وكيفية إدارة الدخول ومن يعتمد التسليم. تحقق قبل التعيين من التأمين والمؤهلات والأنشطة المصرح بها ومتطلبات الجهات المختصة أو المالك. الاستفسار عبر الموقع أو وجود ترخيص عام لصيانة المباني لا يثبت أهلية تنفيذ كل حزمة مقاولات كهربائية.'],
  ],
  faq:[
   ['هل يمكنني توظيف الفريق مباشرة من الصفحة؟','ابدأ بطلب عرض أو الاتصال. يجب أن يؤكد الفريق النطاق والموقع والتوافر ومتطلبات التصاريح أولاً. يتم ترتيب العمل بعد الاتفاق على الشروط المناسبة.'],
   ['هل يمكن الاستفسار عن التركيبات أو تعديل التغذية؟','نعم. صف العمل المقترح ليراجع الفريق نطاقه. يجب تحديد المقاول المسؤول والتأكد من أي موافقات رسمية مطلوبة قبل التعيين.'],
   ['هل يوجد وقت وصول مضمون أو خدمة طوارئ؟','لا نَعِد هنا بوقت وصول مضمون أو بخدمة على مدار الساعة. اسأل الفريق عن التوافر، ولا تستخدم طلب عرض السعر بديلاً عن طلب المساعدة في خطر كهربائي فوري.'],
   ['هل يمكن طلب خدمات صيانة أخرى؟','نعم. دليل الخدمات الحالي متاح. اذكر المهام المطلوبة حتى يتمكن الفريق من مراجعة نطاق العمل وترتيبات التنفيذ.'],
  ],guides:'أدلة اختيار خدمات الكهرباء',other:'تصفح الخدمات الحالية',sources:'تحقق من معلومات المقاولين لدى الهيئة',footer:'هل تريد مناقشة العمل؟ اتصل بالفريق أو اطلب عرضاً مكتوباً مع موقع العقار ونوعه ووصف مختصر للمشكلة.',
 },
};
export async function generateMetadata({params}:{params:Promise<{locale:string}>}) {
 const {locale}=await params; if(locale!=='en'&&locale!=='ar') return {};
 const c=copy[locale]; return buildMetadata({locale,title:c.title,description:c.description,path:'/electrical-services-dubai'});
}
export default async function ElectricalLanding({params}:{params:Promise<{locale:string}>}) {
 const {locale}=await params; if(locale!=='en'&&locale!=='ar') notFound(); setRequestLocale(locale); const c=copy[locale];
 return <div dir={locale==='ar'?'rtl':'ltr'}>
  <JsonLd data={faqJsonLd(c.faq.map(([q,a])=>({q,a})))} />
  <section className="bg-navy text-white"><div className="mx-auto max-w-6xl px-6 py-16 md:py-24"><p className="mb-4 text-sm font-bold tracking-widest">{c.kicker}</p><h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">{c.heading}</h1><p className="mt-6 max-w-3xl text-lg leading-relaxed">{c.intro}</p><div className="mt-8 flex flex-wrap gap-3"><Link className="rounded-lg bg-white px-6 py-3 font-bold text-navy" href="/get-a-quote?service=electrical-maintenance">{c.quote}</Link><a className="rounded-lg border border-white px-6 py-3 font-bold" href={telUrl()}>{c.call}</a><a className="rounded-lg border border-white px-6 py-3 font-bold" href={whatsappUrl()}>{c.whatsapp}</a></div><p className="mt-6 max-w-3xl text-sm leading-relaxed">{c.note}</p></div></section>
  <div className="mx-auto grid max-w-6xl gap-6 px-6 py-12 md:grid-cols-2">{c.sections.map(([title,body])=><section key={title} className="rounded-xl border border-line bg-white p-7"><h2 className="text-2xl font-bold text-navy">{title}</h2><p className="mt-4 leading-8 text-muted">{body}</p></section>)}</div>
  <section className="mx-auto max-w-4xl px-6 pb-12"><h2 className="mb-6 text-3xl font-bold text-navy">{locale==='ar'?'أسئلة قبل الحجز':'Questions before booking'}</h2>{c.faq.map(([q,a])=><details key={q} className="border-b border-line py-5"><summary className="cursor-pointer font-bold text-navy">{q}</summary><p className="mt-3 leading-8 text-muted">{a}</p></details>)}<p className="mt-8 leading-7">{c.footer}</p><p className="mt-4 font-semibold" dir="ltr">{siteConfig.phoneDisplay}</p><div className="mt-6 flex flex-wrap gap-6"><Link href="/services">{c.other}</Link><Link href="/blog?category=electrical">{c.guides}</Link><a href="https://www.dewa.gov.ae/en/builder/useful-tools/consultant-and-contractor-listing" rel="noopener noreferrer" target="_blank">{c.sources}</a></div></section>
 </div>;
}

