import { Link } from "@/i18n/routing";

/**
 * Server-only locale toggle for chrome (header desktop).
 * Switches to the other locale home — avoids client fetch + usePathname on every page.
 * Mobile drawer keeps LocaleSwitcher for path-aware dual-slug remapping when open.
 */
export function LocaleSwitchLink({
  locale,
  className,
  arLabel = "العربية",
  enLabel = "EN",
}: {
  locale: string;
  className?: string;
  arLabel?: string;
  enLabel?: string;
}) {
  const other = locale === "ar" ? "en" : "ar";
  return (
    <Link href="/" locale={other} className={className} hrefLang={other}>
      {other === "ar" ? arLabel : enLabel}
    </Link>
  );
}