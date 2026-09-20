"use client";

import { useState } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { brandName, siteConfig, telUrl, whatsappUrl } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Section";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { AiMark } from "@/components/ui/AiMark";
import { IconClose, IconMenu } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import type { HeaderShell } from "@/lib/site-shell";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";

const links = [
  { href: "/services", key: "services" },
  { href: "/diy", key: "diy" },
  { href: "/blog", key: "blog" },
  { href: "/faq", key: "faq" },
  { href: "/locations", key: "locations" },
  { href: "/reviews", key: "reviews" },
  { href: "/contact", key: "contact" },
] as const;

export function Header({ locale, shell }: { locale: string; shell?: HeaderShell | null }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const skip = locale === "ar" ? "تخطي إلى المحتوى" : "Skip to content";
  const aiHref = `/${locale}#alnajah-ai`;
  const brand = shell?.brandLabel?.trim() || brandName(locale);
  const quoteLabel = shell?.quoteLabel?.trim() || t("quote");
  const aiLabel = shell?.aiLabel?.trim() || t("ai");
  const showAi = shell?.showAi !== false;
  const showQuote = shell?.showQuote !== false;
  const navLabel = (key: (typeof links)[number]["key"]) => shell?.nav?.[key]?.trim() || t(key);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/95 sm:backdrop-blur-md">
      <a className="skip-link" href="#main">
        {skip}
      </a>
      <Container className="flex h-14 items-center gap-3 sm:h-16 sm:gap-4">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2" aria-label={brand}>
          {/* Small mark is LCP candidate on mobile (hero mark is desktop-only). */}
          <BrandLogo size={44} priority locale={locale} />
          <span className="max-w-[9.5rem] text-start text-[11px] font-semibold leading-tight text-navy xs:max-w-[12rem] sm:max-w-[14rem] sm:text-sm">
            {brand}
          </span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 text-sm lg:flex" aria-label="Main">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-sand hover:text-navy",
                pathname === link.href && "bg-sand font-medium text-navy",
              )}
            >
              {navLabel(link.key)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto hidden items-center gap-2 lg:flex">
          {showAi ? (
            <a
              href={aiHref}
              aria-label={aiLabel}
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-white py-0.5 pe-3 ps-0.5 text-sm font-medium text-navy hover:border-gold hover:bg-sand"
            >
              <AiMark id="header-ai-mark" size={28} />
              <span>AI</span>
            </a>
          ) : null}
          <LocaleSwitcher
            locale={locale}
            className="rounded-full px-3 py-2 text-sm text-muted hover:bg-sand hover:text-navy"
          />
          {showQuote ? (
            <ButtonLink href="/get-a-quote" className="rounded-full">
              {quoteLabel}
            </ButtonLink>
          ) : null}
        </div>

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
            <span className="sr-only">{open ? t("close") : t("menu")}</span>
          </button>
        </div>
      </Container>
      {open ? (
        <nav id="mobile-nav" className="border-t border-line bg-white px-4 py-3 lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-0.5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="min-h-11 rounded-lg px-3 py-3 text-base text-navy hover:bg-sand"
                onClick={() => setOpen(false)}
              >
                {navLabel(link.key)}
              </Link>
            ))}
            {showAi ? (
              <a href={aiHref} className="min-h-11 rounded-lg px-3 py-3 text-base text-navy hover:bg-sand" onClick={() => setOpen(false)}>
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
              {t("whatsapp")}
            </a>
            <a href={telUrl()} className="min-h-11 rounded-lg px-3 py-3 text-base text-navy">
              {t("call")} · {siteConfig.phoneDisplay}
            </a>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
