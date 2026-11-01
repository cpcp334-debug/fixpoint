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
  const isBlogDetail = /^\/blog\/[^/?#]+\/?$/.test(pathname);
  const [resolved, setResolved] = useState<{ key: string; href: string; available?: boolean } | null>(null);
  const requestKey = `${other}:${pathname}`;
  const current = resolved?.key === requestKey ? resolved : null;
  // A stale response or an unresolved blog translation must never link to an empty article.
  const otherPath = current?.href ?? (isBlogDetail ? "/blog" : pathname);
  const blogFallback = isBlogDetail && current?.available !== true;

  useEffect(() => {
    // Home needs no dual-slug remap — skip network on the PSI critical path.
    if (pathname === "/" || pathname === "") {
      return;
    }
    let cancelled = false;
    const q = new URLSearchParams({ path: pathname, locale: other });
    fetch(`/api/locale-path?${q.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { href?: string; available?: boolean } | null) => {
        if (!cancelled && data?.href) setResolved({
          key: requestKey,
          href: isBlogDetail && data.available !== true ? "/blog" : data.href,
          available: data.available,
        });
      })
      .catch(() => {
        // Keep the labelled blog-index fallback if the availability request fails.
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, other, requestKey, isBlogDetail]);

  return (
    <Link href={otherPath} locale={other} className={className} onClick={onNavigate}>
      {blogFallback ? (other === "ar" ? "المدونة بالعربية" : "Blog in English") : (other === "ar" ? arLabel : enLabel)}
    </Link>
  );
}