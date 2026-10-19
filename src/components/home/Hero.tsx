import Image from "next/image";
import { siteConfig, telUrl, whatsappUrl } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Section";
import { Link } from "@/i18n/routing";
import { IconArrow, IconCheck, IconPhone } from "@/components/ui/Icon";
export function Hero({locale,copy}:{locale:string;copy:{kicker:string;title:string;lead:string;quote:string;ai:string;whatsapp:string}}){const ar=locale==='ar';return <section className="relative overflow-hidden border-b border-line bg-[#f7f6f1] text-navy">
 <Container className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-16">
  <div className="relative z-10">
   <p className="inline-flex items-center gap-2 rounded-full border border-gold/35 bg-white px-3 py-1.5 text-xs font-semibold tracking-wide"><span className="h-1.5 w-1.5 rounded-full bg-gold"/>{ar?'للمنازل والمنشآت · الإمارات العربية المتحدة':'HOMES & BUSINESSES · UNITED ARAB EMIRATES'}</p>
   <h1 className="mt-6 max-w-2xl text-[2.5rem] font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.1rem]">{copy.title}</h1>
   <p className="mt-6 max-w-xl text-base leading-8 text-muted sm:text-lg">{copy.lead}</p>
   <div className="mt-8 flex flex-col gap-3 sm:flex-row"><ButtonLink href="/get-a-quote" className="min-h-[52px] rounded-xl px-6 font-semibold">{copy.quote}<IconArrow className="h-4 w-4 rtl:rotate-180"/></ButtonLink><ButtonLink href={whatsappUrl()} external variant="secondary" className="min-h-[52px] rounded-xl px-6 font-semibold">{copy.whatsapp}</ButtonLink></div>
   <a href={telUrl()} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold"><IconPhone className="h-4 w-4 text-accent"/><span dir="ltr">{siteConfig.phoneDisplay}</span></a>
   <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 border-t border-navy/10 pt-6 text-xs font-medium text-muted">{(ar?['نطاق عمل واضح','عرض سعر قبل الحجز','تنسيق مباشر مع الفريق']:['Clear scope of work','Quote before booking','Direct team coordination']).map(s=><span key={s} className="inline-flex items-center gap-1.5"><IconCheck className="h-4 w-4 text-accent"/>{s}</span>)}</div>
  </div>
  <div className="relative pb-1 lg:ps-3"><figure className="relative overflow-hidden rounded-[1.75rem] border border-white bg-white shadow-[0_20px_70px_-30px_rgba(0,26,51,0.3)]"><div className="relative aspect-[6/5] sm:aspect-[4/3] lg:aspect-square"><Image src="/media/editorial/photos-20261019/home-property-care.webp" alt={ar?'صورة توضيحية مولدة بالذكاء الاصطناعي لمدخل منزل؛ ليست صورة مشروع عميل':'AI-generated illustration of a cared-for residential entrance; not a customer project'} fill preload sizes="(max-width:1023px) 100vw, 520px" className="object-cover"/></div><figcaption className="absolute top-3 end-3 z-10 rounded-md bg-white/95 px-2 py-1 text-[10px] font-medium text-muted">{ar?'صورة توضيحية مولدة بالذكاء الاصطناعي':'AI-generated illustrative image'}</figcaption></figure>
   <div className="relative mx-4 -mt-12 rounded-2xl border border-line bg-white p-5 shadow-lg sm:mx-8"><p className="text-xs font-semibold uppercase tracking-wider text-accent">{ar?'ابدأ بما يحتاج إلى عناية':'WHAT NEEDS ATTENTION?'}</p><div className="mt-3 grid grid-cols-2 gap-2">{[{href:'/electrical-services-dubai',en:'Electrical',ar:'الكهرباء'},{href:'/ac-maintenance',en:'Air conditioning',ar:'التكييف'},{href:'/plumbing-maintenance',en:'Plumbing',ar:'السباكة'},{href:'/cleaning-services',en:'Cleaning',ar:'التنظيف'}].map(x=><Link key={x.href} href={x.href} className="flex min-h-11 items-center justify-between gap-2 rounded-lg bg-sand/70 px-3 text-sm font-semibold hover:bg-sand"><span>{ar?x.ar:x.en}</span><IconArrow className="h-3.5 w-3.5 shrink-0 text-accent rtl:rotate-180"/></Link>)}</div></div>
  </div>
 </Container>
 </section>}
