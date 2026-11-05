"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/routing";
import { localeDirectoryHref } from "@/lib/slug/locale-directory-query";

type LocaleSwitcherProps = {
  locale: string;
  className?: string;
  arLabel?: string;
  enLabel?: string;
  onNavigate?: () => void;
};

/** Keep a usable path-only switch in static HTML while query state is resolved. */
function LocaleSwitcherFallback({ locale, className, arLabel = "العربية", enLabel = "EN", onNavigate }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const other = locale === "ar" ? "en" : "ar";
  const blog = /^\/blog\/[^/?#]+\/?$/.test(pathname);
  return (
    <Link href={blog ? "/blog" : pathname} locale={other} className={className} onClick={onNavigate}>
      {blog ? (other === "ar" ? "المدونة بالعربية" : "Blog in English") : (other === "ar" ? arLabel : enLabel)}
    </Link>
  );
}

export function LocaleSwitcher(props: LocaleSwitcherProps) {
  return (
    <Suspense fallback={<LocaleSwitcherFallback {...props} />}>
      <LocaleSwitcherWithQuery {...props} />
    </Suspense>
  );
}

/** Language switcher that remaps EN↔AR public slugs (encoded Arabic on /ar). */
function LocaleSwitcherWithQuery({
  locale,
  className,
  arLabel = "العربية",
  enLabel = "EN",
  onNavigate,
}: LocaleSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
    <Link href={localeDirectoryHref(pathname, otherPath, searchParams?.toString() || "")} locale={other} className={className} onClick={onNavigate}>
      {blogFallback ? (other === "ar" ? "المدونة بالعربية" : "Blog in English") : (other === "ar" ? arLabel : enLabel)}
    </Link>
  );
}
