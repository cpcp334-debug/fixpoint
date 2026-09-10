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
  imageAlt = "",
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
  imageAlt?: string;
  compact?: boolean;
}) {
  const publishedImage = resolvePublishedHeroImage(heroImage);

  return (
    <section className="border-b border-line bg-white">
      <Container
        className={cn(
          "grid gap-10 py-10 sm:py-14 lg:items-center lg:gap-14",
          compact ? "lg:grid-cols-1" : "lg:grid-cols-2",
        )}
      >
        <div>
          {kicker && kicker !== title ? <p className="text-sm font-medium text-accent">{kicker}</p> : null}
          <div className={cn("flex items-start gap-3", kicker && kicker !== title && "mt-3")}>
            {Icon ? (
              <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sand text-navy">
                <Icon className="h-5 w-5" />
              </span>
            ) : null}
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-navy sm:text-4xl sm:leading-[1.15]">
              {title}
            </h1>
          </div>
          {lead ? <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{lead}</p> : null}
          {meta ? <div className="mt-4 text-sm text-muted">{meta}</div> : null}
          {actions ? <div className="mt-8">{actions}</div> : null}
          {shareUrl && shareLabel && copiedLabel ? (
            <div className="mt-6">
              <ShareButton url={shareUrl} label={shareLabel} copiedLabel={copiedLabel} />
            </div>
          ) : null}
        </div>
        {compact ? null : (
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-sand">
            {publishedImage ? (
              // Real image only when the published row already has a local file. Never the homepage stock hero.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={publishedImage} alt={imageAlt} className="h-full w-full object-cover" />
            ) : (
              <HeroFallback />
            )}
          </div>
        )}
      </Container>
    </section>
  );
}
