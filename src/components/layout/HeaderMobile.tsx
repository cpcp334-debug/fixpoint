"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { siteConfig, telUrl, whatsappUrl } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";
import { AiMark } from "@/components/ui/AiMark";
import { IconClose, IconMenu } from "@/components/ui/Icon";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";

type NavLink = { href: string; label: string };

/** Mobile-only header controls + drawer (keeps desktop header server-rendered). */
export function HeaderMobile({
  locale,
  links,
  aiHref,
  aiLabel,
  quoteLabel,
  showAi,
  showQuote,
  menuLabel,
  closeLabel,
  whatsappLabel,
  callLabel,
}: {
  locale: string;
  links: NavLink[];
  aiHref: string;
  aiLabel: string;
  quoteLabel: string;
  showAi: boolean;
  showQuote: boolean;
  menuLabel: string;
  closeLabel: string;
  whatsappLabel: string;
  callLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="ms-auto flex items-center gap-2 lg:hidden">
        {showAi ? (
          <a href={aiHref} aria-label={aiLabel} className="inline-flex rounded-full" onClick={() => setOpen(false)}>
            <AiMark id="header-ai-mark-mobile" size={34} />
          </a>
        ) : null}
        {showQuote ? (
          <ButtonLink href="/get-a-quote" className="min-h-11 rounded-full px-3 text-sm">
            {quoteLabel}
          </ButtonLink>
        ) : null}
        <button
          type="button"
          className="inline-flex min-h-11 w-11 items-center justify-center rounded-full border border-line text-navy"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <IconClose className="h-4 w-4" /> : <IconMenu className="h-4 w-4" />}
          <span className="sr-only">{open ? closeLabel : menuLabel}</span>
        </button>
      </div>
      {open ? (
        <nav
          id="mobile-nav"
          className="absolute inset-x-0 top-full z-40 border-t border-line bg-white px-4 py-3 shadow-sm lg:hidden"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-0.5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="min-h-11 rounded-lg px-3 py-3 text-base text-navy hover:bg-sand"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {showAi ? (
              <a
                href={aiHref}
                className="min-h-11 rounded-lg px-3 py-3 text-base text-navy hover:bg-sand"
                onClick={() => setOpen(false)}
              >
                {aiLabel}
              </a>
            ) : null}
            <LocaleSwitcher
              locale={locale}
              className="min-h-11 rounded-lg px-3 py-3 text-base text-navy"
              enLabel="English"
              arLabel="العربية"
              onNavigate={() => setOpen(false)}
            />
            <a href={whatsappUrl()} className="min-h-11 rounded-lg px-3 py-3 text-base text-navy">
              {whatsappLabel}
            </a>
            <a href={telUrl()} className="min-h-11 rounded-lg px-3 py-3 text-base text-navy">
              {callLabel} · {siteConfig.phoneDisplay}
            </a>
          </div>
        </nav>
      ) : null}
    </>
  );
}
