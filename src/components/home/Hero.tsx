import { siteConfig, telUrl, whatsappUrl, getSiteUrl } from "@/config/site";
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
      <Container className="relative grid items-center gap-7 py-9 sm:py-11 lg:grid-cols-[1.15fr_0.85fr] lg:gap-9 lg:py-12">
        <div>
          <p className="text-sm font-medium tracking-wide text-gold">{copy.kicker}</p>
          <h1 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl sm:leading-[1.12] lg:text-[2.65rem]">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">{copy.lead}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ButtonLink href="/get-a-quote" variant="inversePrimary">
              {copy.quote}
            </ButtonLink>
            <ButtonLink href="#alnajah-ai" variant="inverse" external>
              {copy.ai}
            </ButtonLink>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
            <a href={whatsappUrl()} className="hover:text-gold">
              {copy.whatsapp}
            </a>
            <a href={telUrl()} className="hover:text-gold">
              {siteConfig.phoneDisplay}
            </a>
            <ShareButton url={canonical} label={copy.share} copiedLabel={copy.copied} tone="inverse" />
          </div>
        </div>
        <div className="relative mx-auto flex aspect-square w-full max-w-[20rem] items-center justify-center lg:max-w-[22rem]">
          <div className="absolute inset-[8%] rounded-full border border-gold/25" />
          <div className="absolute inset-[18%] rounded-full border border-gold/15" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gold/20 via-transparent to-transparent blur-2xl" />
          <BrandLogo size={280} className="relative z-[1] h-auto w-[78%] max-w-[280px] shadow-[0_20px_60px_rgba(0,0,0,0.45)] ring-2 ring-gold/50" />
        </div>
      </Container>
    </section>
  );
}
