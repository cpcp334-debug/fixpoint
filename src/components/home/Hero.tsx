import { brandName, domainBrandName, siteConfig, telUrl, whatsappUrl, getSiteUrl, productionSiteUrl } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Section";
import { ShareButton } from "@/components/ui/ShareButton";
import { BrandLogo } from "@/components/brand/BrandLogo";

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
    share: string;
    copied: string;
  };
}) {
  const canonical = `${getSiteUrl()}/${locale}`;
  const brand = brandName(locale);

  return (
    <section className="hero-atmosphere relative overflow-hidden text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(212,175,55,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.45) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <Container className="relative grid items-center gap-4 py-5 sm:py-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6 lg:py-6">
        <div>
          <p className="text-sm font-semibold tracking-wide text-gold">{brand}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-white/55">{copy.kicker}</p>
          <h1 className="mt-2 max-w-xl text-[1.75rem] font-semibold tracking-tight sm:text-4xl sm:leading-[1.12] lg:text-[2.65rem]">
            {copy.title}
          </h1>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">{copy.lead}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <ButtonLink href="/get-a-quote" variant="inversePrimary" className="pass w-full sm:w-auto">
              {copy.quote}
            </ButtonLink>
            <ButtonLink href="#alnajah-ai" variant="inverse" external className="pass w-full sm:w-auto">
              {copy.ai}
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
            <ShareButton url={canonical} label={copy.share} copiedLabel={copy.copied} tone="inverse" />
          </div>
        </div>
        <div className="relative mx-auto flex aspect-square w-full max-w-[16rem] items-center justify-center sm:max-w-[20rem] lg:max-w-[22rem]">
          <div className="absolute inset-[10%] rounded-[2rem] border border-gold/20" />
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-gold/15 via-transparent to-transparent blur-2xl" />
          <BrandLogo
            size={168}
            priority
            locale={locale}
            className="relative z-[1] max-h-[85%] max-w-[85%] drop-shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
          />
        </div>
      </Container>
    </section>
  );
}
