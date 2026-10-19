import { Link } from "@/i18n/routing";
import type { NavCategory } from "@/lib/catalog/approved-nav";
import { IconBolt, IconArrow } from "@/components/ui/Icon";
import { serviceHref } from "@/lib/slug/locale-slug";
const electricalWork = [
 {slug:'electrical-fault-diagnosis',en:'Electrical fault diagnosis',ar:'تشخيص الأعطال الكهربائية',enLead:'Describe the fault and arrange the appropriate professional assessment.',arLead:'صف العطل لترتيب التقييم المهني المناسب.'},
 {slug:'light-installation',en:'Lighting installation',ar:'تركيب الإنارة',enLead:'Discuss lighting work for your rooms, shop or workplace.',arLead:'ناقش أعمال الإنارة للغرف أو المحل أو مكان العمل.'},
 {slug:'double-socket-installation',en:'Sockets and power points',ar:'المقابس ونقاط الكهرباء',enLead:'Plan socket requirements around how you use the space.',arLead:'حدد احتياجات المقابس وفق استخدام المكان.'},
 {slug:'circuit-installation',en:'Wiring and circuits',ar:'التمديدات والدوائر الكهربائية',enLead:'Share your installation requirements, property details and access arrangements.',arLead:'شارك متطلبات التركيب وتفاصيل العقار وترتيبات الدخول.'},
 {slug:'electrical-control-panel-inspection',en:'Panels and controls',ar:'اللوحات وأنظمة التحكم',enLead:'Request a defined review of the panel or controls involved.',arLead:'اطلب مراجعة محددة النطاق للوحة أو نظام التحكم المعني.'},
 {slug:'electrical-inspection',en:'Electrical inspections',ar:'الفحص الكهربائي',enLead:'Clarify what needs checking and the information you need to receive.',arLead:'وضح ما يحتاج إلى فحص والمعلومات التي ترغب في استلامها.'}
];
export function HomeServiceGrid({categories,locale}:{categories:NavCategory[];locale:string}){
 const ar=locale==='ar';
 if(!categories.some(c=>c.slug==='electrical'))return null;
 return <><ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{electricalWork.map(c=><li key={c.slug}><Link href={serviceHref(locale,c.slug)} className="group flex h-full flex-col rounded-2xl border border-line bg-white p-6 transition-colors hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"><span className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sand text-navy"><IconBolt className="h-6 w-6"/></span><IconArrow className="h-5 w-5 text-accent rtl:rotate-180"/></span><h3 className="mt-6 text-lg font-bold tracking-tight text-navy">{ar?c.ar:c.en}</h3><p className="mt-2 text-sm leading-6 text-muted">{ar?c.arLead:c.enLead}</p><span className="mt-auto pt-5 text-sm font-semibold text-accent">{ar?'تفاصيل الخدمة':'Explore this electrical service'}</span></Link></li>)}</ul><div className="mt-7 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-sand/40 px-5 py-4"><p className="text-sm text-muted">{ar?'تحتاج إلى خدمة أخرى؟':'Looking for another service?'}</p><Link href="/services" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent">{ar?'جميع الخدمات':'All services'}<IconArrow className="h-4 w-4 rtl:rotate-180"/></Link></div></>;
}
