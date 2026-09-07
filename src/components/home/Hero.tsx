import { existsSync } from "node:fs";
import path from "node:path";
import { siteConfig, telUrl, whatsappUrl, getSiteUrl } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Section";
import { ShareButton } from "@/components/ui/ShareButton";
import { IconPhone } from "@/components/ui/Icon";
import { HeroMedia } from "@/components/home/HeroMedia";

const HERO_FILE = path.join(process.cwd(), "public", "media", "hero.jpg");

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
    floatTitle: string;
    floatBody: string;
  };
}) {
  const canonical = `${getSiteUrl()}/${locale}`;
  const hasPhoto = existsSync(HERO_FILE);

  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <div className="pointer-events-none absolute -start-24 top-0 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute -end-16 bottom-0 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />
      <Container className="relative grid gap-10 py-12 sm:py-16 lg:grid-cols-2 lg:items-center lg:gap-14 lg:py-20">
        <div>
          <p className="text-[0.75rem] font-medium uppercase tracking-[0.18em] text-gold">{copy.kicker}</p>
          <h1 className="mt-3 max-w-xl text-[2.15rem] font-semibold leading-[1.15] sm:text-[2.5rem] lg:text-[2.75rem]">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-white/80">{copy.lead}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/get-a-quote" variant="inversePrimary">
              {copy.quote}
            </ButtonLink>
            <ButtonLink href="#alnajah-ai" variant="inverse" external>
              {copy.ai}
            </ButtonLink>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
            <a href={whatsappUrl()} className="hover:text-white">
              {copy.whatsapp}
            </a>
            <a href={telUrl()} className="inline-flex items-center gap-1.5 hover:text-white">
              <IconPhone className="h-3.5 w-3.5" />
              {siteConfig.phoneDisplay}
            </a>
            <ShareButton url={canonical} label={copy.share} copiedLabel={copy.copied} tone="inverse" />
          </div>
        </div>
        <div className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] border border-white/10 bg-navy-deep">
            <HeroMedia hasPhoto={hasPhoto} />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-navy/55" />
          </div>
          <div className="absolute inset-x-4 bottom-4 rounded-[14px] border border-white/15 bg-navy/80 p-4 backdrop-blur-sm sm:inset-x-auto sm:bottom-6 sm:end-6 sm:max-w-[16.5rem]">
            <p className="text-sm font-medium">{copy.floatTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/75">{copy.floatBody}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
