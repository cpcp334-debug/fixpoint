import Image from "next/image";
import { brandName } from "@/config/site";
import { cn } from "@/lib/utils";

/** Full brand wordmark (navy + gold industrial logo). Prefer sized WebP for LCP. */
export const LOGO_SRC = "/media/logo-opt.jpg";

function logoSrcForSize(size: number) {
  if (size <= 64) return "/media/logo-128.webp";
  if (size <= 200) return "/media/logo-280.webp";
  return "/media/logo-512.webp";
}

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
  // Source art is roughly square/portrait wordmark — keep contain, never crop.
  const width = Math.round(size * 1.05);
  const alt =
    locale === "ar"
      ? `${brandName("ar")} — صيانة المباني`
      : `${brandName("en")} — Building Maintenance`;
  return (
    <Image
      src={logoSrcForSize(size)}
      alt={alt}
      width={width}
      height={size}
      priority={priority}
      fetchPriority={priority ? "high" : "auto"}
      quality={70}
      sizes={`${Math.max(width, size)}px`}
      className={cn("h-auto w-auto max-h-full object-contain", className)}
      style={{ height: size, width: "auto" }}
    />
  );
}
