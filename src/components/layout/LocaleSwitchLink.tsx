import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";

/**
 * Shared path-aware locale toggle. Existing EN/AR slug aliases are preserved.
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
  return (
    <LocaleSwitcher locale={locale} className={className} arLabel={arLabel} enLabel={enLabel} />
  );
}
