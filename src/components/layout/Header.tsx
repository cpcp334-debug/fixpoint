"use client";

import { useState } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { siteConfig, telUrl, whatsappUrl } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Section";
import { IconChat, IconClose, IconMenu } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", key: "home" },
  { href: "/services", key: "services" },
  { href: "/diy", key: "diy" },
  { href: "/projects", key: "projects" },
  { href: "/locations", key: "locations" },
  { href: "/reviews", key: "reviews" },
  { href: "/faq", key: "faq" },
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
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/95 backdrop-blur-sm">
      <a className="skip-link" href="#main">
        {skip}
      </a>
      <Container className="flex items-center justify-between gap-4 py-3">
        <Link href="/" className="min-w-0 shrink-0">
          <span className="block font-semibold tracking-tight text-navy">
            {locale === "ar" ? siteConfig.brandAr : siteConfig.brand}
          </span>
          <span className="mt-0.5 block max-w-[14rem] truncate text-[0.7rem] font-normal text-muted">
            {siteConfig.positioning[locale === "ar" ? "ar" : "en"]}
          </span>
        </Link>
        <nav className="hidden items-center gap-5 text-[0.9rem] xl:flex" aria-label="Main">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "py-1 text-ink hover:text-accent",
                pathname === link.href && "font-medium text-accent",
              )}
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 xl:flex">
          <Link href={pathname} locale={other} className="rounded-[12px] px-3 py-2 text-sm text-muted hover:text-navy">
            {other === "ar" ? "العربية" : "English"}
          </Link>
          <a href={aiHref} className="inline-flex min-h-11 items-center gap-1.5 rounded-[12px] px-3 text-sm font-medium text-navy hover:bg-sand">
            <IconChat className="h-4 w-4" />
            {t("ai")}
          </a>
          <ButtonLink href="/get-a-quote">{t("quote")}</ButtonLink>
        </div>
        <div className="flex items-center gap-2 xl:hidden">
          <ButtonLink href="/get-a-quote" className="min-h-10 px-3 text-sm">
            {t("quote")}
          </ButtonLink>
          <a href={aiHref} className="inline-flex min-h-10 items-center rounded-[12px] border border-line px-3 text-sm text-navy" aria-label={t("ai")}>
            <IconChat className="h-4 w-4" />
          </a>
          <button
            type="button"
            className="inline-flex min-h-10 w-10 items-center justify-center rounded-[12px] border border-line text-navy"
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
        <nav id="mobile-nav" className="border-t border-line bg-white px-4 py-4 xl:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-[12px] px-3 py-3 text-navy hover:bg-sand"
                onClick={() => setOpen(false)}
              >
                {t(link.key)}
              </Link>
            ))}
            <Link href={pathname} locale={other} className="rounded-[12px] px-3 py-3" onClick={() => setOpen(false)}>
              {other === "ar" ? "العربية" : "English"}
            </Link>
            <a href={whatsappUrl()} className="rounded-[12px] px-3 py-3">
              {t("whatsapp")}
            </a>
            <a href={telUrl()} className="rounded-[12px] px-3 py-3">
              {t("call")} · {siteConfig.phoneDisplay}
            </a>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
