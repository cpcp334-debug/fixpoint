import { brandName, domainBrandName, siteConfig, telUrl, whatsappUrl, productionSiteUrl } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Section";
import { Link } from '@/i18n/routing';

export function Hero({
  locale,
  copy,
}: {
  locale: string;
  copy: {
    kicker: string;
    title: string;
    lead: string;
    quote: string;
    ai: string;
    whatsapp: string;
  };
}) {
  const brand = brandName(locale);

  return (
    <section className="hero-atmosphere relative overflow-hidden text-white">
      <Container className="relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14 lg:py-20">
        <div>
          <p className="text-sm font-semibold tracking-wide text-gold">{brand}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-white/55">{copy.kicker}</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight leading-[1.1] sm:text-5xl lg:text-[3.4rem]">
            {copy.title}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">{copy.lead}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <ButtonLink href="/get-a-quote" variant="inversePrimary" className="pass w-full sm:w-auto">
              {copy.quote}
            </ButtonLink>
            <ButtonLink href={whatsappUrl()} variant="inverse" external className="pass w-full sm:w-auto">
              {copy.whatsapp}
            </ButtonLink>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
            <a href={productionSiteUrl} className="hover:text-gold" target="_blank" rel="noopener noreferrer">
              {domainBrandName(locale)} · fixpoint.ae
            </a>
            <a href={whatsappUrl()} className="hover:text-gold">
              {copy.whatsapp}
            </a>
            <a href={telUrl()} className="hover:text-gold">
              {siteConfig.phoneDisplay}
            </a>
          </div>
        </div>
        <div className="rounded-3xl border border-white/20 bg-white/[0.06] p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">{locale==='ar'?'كيف يمكننا مساعدتك؟':'WHAT NEEDS ATTENTION?'}</p>
          <h2 className="mt-3 text-2xl font-bold">{locale==='ar'?'ابدأ بالخدمة التي تحتاجها.':'Start with the work you need.'}</h2>
          <div className="mt-6 grid gap-3">
          {[
            {href:'/electrical-services-dubai',en:'Electrical maintenance in Dubai',ar:'صيانة الكهرباء في دبي'},
            {href:'/ac-maintenance',en:'AC maintenance',ar:'صيانة التكييف'},
            {href:'/plumbing-maintenance',en:'Plumbing and leaks',ar:'السباكة والتسربات'},
            {href:'/cleaning-services',en:'Cleaning services',ar:'خدمات التنظيف'},
          ].map(item=><Link key={item.href} href={item.href} className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-semibold transition-colors hover:bg-white/15"><span>{locale==='ar'?item.ar:item.en}</span><span aria-hidden="true" className="text-gold rtl:rotate-180">↗</span></Link>)}
          </div>
          <Link href="/services" className="mt-6 inline-block text-sm font-semibold text-white underline underline-offset-4">{locale==='ar'?'تصفح جميع الخدمات':'Explore all services'}</Link>
          <p className="mt-5 border-t border-white/15 pt-5 text-sm leading-relaxed text-white/80">{locale==='ar'?'أرسل موقع العقار ووصف العمل والوقت المناسب للدخول. نؤكد معك التفاصيل قبل الحجز.':'Share the location, a short description and a suitable access time. We will confirm the details before booking.'}</p>
        </div>
      </Container>
    </section>
  );
}
