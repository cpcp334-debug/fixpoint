import Image from "next/image";
import { existsSync } from "node:fs";
import path from "node:path";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { brandName, getSiteUrl } from "@/config/site";
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
  locale,
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
  locale?: string;
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
  const brand = locale ? brandName(locale) : null;
  const extraKicker = kicker && kicker !== title && kicker !== brand ? kicker : null;

  return (
    <section className="border-b border-line bg-white">
      <Container
        className={cn(
          "grid gap-8 py-8 sm:gap-10 sm:py-14 lg:items-center lg:gap-14",
          compact ? "lg:grid-cols-1" : "lg:grid-cols-2",
        )}
      >
        <div>
          {brand ? <p className="text-sm font-semibold text-accent">{brand}</p> : null}
          {extraKicker ? (
            <p className={cn("text-sm font-medium text-muted", brand && "mt-1")}>{extraKicker}</p>
          ) : null}
          <div className={cn("flex items-start gap-3", (brand || extraKicker) && "mt-3")}>
            {Icon ? (
              <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sand text-navy">
                <Icon className="h-5 w-5" />
              </span>
            ) : null}
            <h1 className="max-w-3xl text-[1.75rem] font-semibold tracking-tight text-navy sm:text-4xl sm:leading-[1.15]">
              {title}
            </h1>
          </div>
          {lead ? <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{lead}</p> : null}
          {meta ? <div className="mt-4 text-sm text-muted">{meta}</div> : null}
          {actions ? <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">{actions}</div> : null}
          {shareUrl && shareLabel && copiedLabel ? (
            <div className="mt-6">
              <ShareButton url={shareUrl} label={shareLabel} copiedLabel={copiedLabel} />
            </div>
          ) : null}
        </div>
        {compact ? null : (
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-sand">
            {publishedImage ? (
              <Image
                src={publishedImage}
                alt={imageAlt}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 560px"
                className="object-cover"
                priority={false}
              />
            ) : (
              <HeroFallback locale={locale} />
            )}
          </div>
        )}
      </Container>
    </section>
  );
}
