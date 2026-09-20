"use client";

import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/routing";

/** Language switcher that remaps EN↔AR public slugs (encoded Arabic on /ar). */
export function LocaleSwitcher({
  locale,
  className,
  arLabel = "العربية",
  enLabel = "EN",
  onNavigate,
}: {
  locale: string;
  className?: string;
  arLabel?: string;
  enLabel?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const other = locale === "ar" ? "en" : "ar";
  const [otherPath, setOtherPath] = useState(pathname);

  useEffect(() => {
    // Home needs no dual-slug remap — skip network on the PSI critical path.
    if (pathname === "/" || pathname === "") {
      setOtherPath("/");
      return;
    }
    let cancelled = false;
    const q = new URLSearchParams({ path: pathname, locale: other });
    fetch(`/api/locale-path?${q.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { href?: string } | null) => {
        if (!cancelled && data?.href) setOtherPath(data.href);
      })
      .catch(() => {
        if (!cancelled) setOtherPath(pathname);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, other]);

  return (
    <Link href={otherPath} locale={other} className={className} onClick={onNavigate}>
      {other === "ar" ? arLabel : enLabel}
    </Link>
  );
}
