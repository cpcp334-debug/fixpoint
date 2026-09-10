"use client";

import { useState } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { siteConfig, telUrl, whatsappUrl } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Section";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { AiMark } from "@/components/ui/AiMark";
import { IconClose, IconMenu } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const links = [
  { href: "/services", key: "services" },
  { href: "/diy", key: "diy" },
  { href: "/blog", key: "blog" },
  { href: "/locations", key: "locations" },
  { href: "/reviews", key: "reviews" },
  { href: "/contact", key: "contact" },
] as const;

export function Header({ locale }: { locale: string }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const other = locale === "ar" ? "en" : "ar";
  const skip = locale === "ar" ? "تخطي إلى المحتوى" : "Skip to content";
  const aiHref = `/${locale}#alnajah-ai`;

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/95 backdrop-blur-md">
      <a className="skip-link" href="#main">
        {skip}
      </a>
      <Container className="flex h-14 items-center gap-3 sm:h-16 sm:gap-4">
        <Link href="/" className="shrink-0" aria-label={siteConfig.brand}>
          <BrandLogo size={44} priority />
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
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto hidden items-center gap-2 lg:flex">
          <a
            href={aiHref}
            aria-label={t("ai")}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-white py-0.5 pe-3 ps-0.5 text-sm font-medium text-navy hover:border-gold hover:bg-sand"
          >
            <AiMark id="header-ai-mark" size={28} />
            <span>AI</span>
          </a>
          <Link
            href={pathname}
            locale={other}
            className="rounded-full px-3 py-2 text-sm text-muted hover:bg-sand hover:text-navy"
          >
            {other === "ar" ? "العربية" : "EN"}
          </Link>
          <ButtonLink href="/get-a-quote" className="rounded-full">
            {t("quote")}
          </ButtonLink>
        </div>

        <div className="ms-auto flex items-center gap-2 lg:hidden">
          <a href={aiHref} aria-label={t("ai")} className="inline-flex rounded-full" onClick={() => setOpen(false)}>
            <AiMark id="header-ai-mark-mobile" size={34} />
          </a>
          <ButtonLink href="/get-a-quote" className="min-h-10 rounded-full px-3">
            {t("quote")}
          </ButtonLink>
          <button
            type="button"
            className="inline-flex min-h-10 w-10 items-center justify-center rounded-full border border-line text-navy"
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
        <nav id="mobile-nav" className="border-t border-line bg-white px-4 py-2 lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-navy hover:bg-sand"
                onClick={() => setOpen(false)}
              >
                {t(link.key)}
              </Link>
            ))}
            <a href={aiHref} className="rounded-lg px-3 py-2 text-navy hover:bg-sand" onClick={() => setOpen(false)}>
              {t("ai")}
            </a>
            <Link href={pathname} locale={other} className="rounded-lg px-3 py-2 text-navy" onClick={() => setOpen(false)}>
              {other === "ar" ? "العربية" : "English"}
            </Link>
            <a href={whatsappUrl()} className="rounded-lg px-3 py-2 text-navy">
              {t("whatsapp")}
            </a>
            <a href={telUrl()} className="rounded-lg px-3 py-2 text-navy">
              {t("call")} · {siteConfig.phoneDisplay}
            </a>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
