import { cn } from "@/lib/utils";

/** Primary brand mark (navy + gold industrial logo). */
export const LOGO_SRC = "/media/logo.jpg";

export function BrandLogo({
  size = 44,
  className,
  priority,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    // Plain img avoids next/image optimization quirks for the brand mark / favicon pairing.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC}
      alt="ALNAJAH ALDAEM"
      width={size}
      height={size}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
      className={cn("rounded-full object-cover bg-navy-deep shadow-sm ring-1 ring-gold/45", className)}
    />
  );
}
