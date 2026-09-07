import { existsSync } from "node:fs";
import path from "node:path";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { getSiteUrl } from "@/config/site";
import { Container } from "@/components/ui/Section";
import { ShareButton } from "@/components/ui/ShareButton";
import { HeroFallback } from "@/components/public/HeroFallback";
import { cn } from "@/lib/utils";

export function publicCanonical(locale: string, path: string) {
  return `${getSiteUrl()}/${locale}${path === "/" ? "" : path}`;
}

function resolvePublishedHeroImage(heroImage?: string | null) {
  if (!heroImage) return null;
  const normalized = heroImage.trim();
  if (!normalized) return null;
  if (normalized === "/media/hero.jpg" || normalized.endsWith("/media/hero.jpg")) return null;
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return null;
  const file = path.join(process.cwd(), "public", normalized.replace(/^\//, "").replace(/\//g, path.sep));
  return existsSync(file) ? normalized : null;
}

export function PublicHero({
  kicker,
  title,
  lead,
  icon: Icon,
  shareUrl,
  shareLabel,
  copiedLabel,
  actions,
  meta,
  heroImage,
  compact,
}: {
  kicker?: string;
  title: string;
  lead?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  shareUrl?: string;
  shareLabel?: string;
  copiedLabel?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  heroImage?: string | null;
  compact?: boolean;
}) {
  const publishedImage = resolvePublishedHeroImage(heroImage);

  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <div className="pointer-events-none absolute -start-24 top-0 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute -end-16 bottom-0 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />
      <Container
        className={cn(
          "relative grid gap-10 py-10 sm:py-14 lg:items-center lg:gap-14",
          compact ? "lg:grid-cols-1" : "lg:grid-cols-2",
        )}
      >
        <div>
          {kicker ? (
            <p className="text-[0.75rem] font-medium uppercase tracking-[0.18em] text-gold">{kicker}</p>
          ) : null}
          <div className="mt-3 flex items-start gap-3">
            {Icon ? (
              <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-gold">
                <Icon className="h-5 w-5" />
              </span>
            ) : null}
            <h1 className="max-w-xl text-[2rem] font-semibold leading-[1.15] sm:text-[2.35rem]">{title}</h1>
          </div>
          {lead ? <p className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-white/80">{lead}</p> : null}
          {meta ? <div className="mt-4 text-sm text-white/70">{meta}</div> : null}
          {actions ? <div className="mt-8">{actions}</div> : null}
          {shareUrl && shareLabel && copiedLabel ? (
            <div className="mt-6">
              <ShareButton url={shareUrl} label={shareLabel} copiedLabel={copiedLabel} tone="inverse" />
            </div>
          ) : null}
        </div>
        {compact ? null : (
          <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] border border-white/10 bg-navy-deep">
            {publishedImage ? (
              // Real image only when the published row already has a local file. Never the homepage stock hero.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={publishedImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <HeroFallback />
            )}
          </div>
        )}
      </Container>
    </section>
  );
}
