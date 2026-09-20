import { brandName } from "@/config/site";
import { cn } from "@/lib/utils";

/** Full brand wordmark (navy + gold industrial logo). Prefer sized WebP for LCP. */
export const LOGO_SRC = "/media/logo-opt.jpg";

function logoSrcForSize(size: number) {
  if (size <= 64) return "/media/logo-128.webp";
  if (size <= 200) return "/media/logo-280.webp";
  return "/media/logo-512.webp";
}

/**
 * Brand mark via plain <img> — avoids next/image srcset bloat on the LCP path
 * (live /en was emitting logo srcsets up to w=1920 in HTML/RSC).
 */
export function BrandLogo({
  size = 44,
  className,
  priority,
  locale,
}: {
  /** Rendered height in px; width scales to preserve aspect. */
  size?: number;
  className?: string;
  priority?: boolean;
  /** When `ar`, alt uses Arabic brand (فكس بوينت). */
  locale?: string;
}) {
  const width = Math.round(size * 1.05);
  const src = logoSrcForSize(size);
  const alt =
    locale === "ar"
      ? `${brandName("ar")} — صيانة المباني`
      : `${brandName("en")} — Building Maintenance`;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- intentional LCP: no optimizer srcset
    <img
      src={src}
      alt={alt}
      width={width}
      height={size}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      className={cn("h-auto w-auto max-h-full object-contain", className)}
      style={{ height: size, width: "auto" }}
    />
  );
}
