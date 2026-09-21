import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { brandName } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Section";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { AiMark } from "@/components/ui/AiMark";
import { LocaleSwitchLink } from "@/components/layout/LocaleSwitchLink";
import { DeferredHeaderMobile } from "@/components/layout/DeferredHeaderMobile";
import type { HeaderShell } from "@/lib/site-shell";

const links = [
  { href: "/services", key: "services" },
  { href: "/diy", key: "diy" },
  { href: "/blog", key: "blog" },
  { href: "/faq", key: "faq" },
  { href: "/locations", key: "locations" },
  { href: "/reviews", key: "reviews" },
  { href: "/contact", key: "contact" },
] as const;

/** Server header — mobile menu island is dynamic/ssr:false for home PSI. */
export async function Header({ locale, shell }: { locale: string; shell?: HeaderShell | null }) {
  const t = await getTranslations("Nav");
  const skip = locale === "ar" ? "تخطي إلى المحتوى" : "Skip to content";
  const aiHref = `/${locale}#alnajah-ai`;
  const brand = shell?.brandLabel?.trim() || brandName(locale);
  const quoteLabel = shell?.quoteLabel?.trim() || t("quote");
  const aiLabel = shell?.aiLabel?.trim() || t("ai");
  const showAi = shell?.showAi !== false;
  const showQuote = shell?.showQuote !== false;
  const navLabel = (key: (typeof links)[number]["key"]) => shell?.nav?.[key]?.trim() || t(key);

  const linkItems = links.map((link) => ({
    href: link.href,
    label: navLabel(link.key),
  }));

  return (
    <header className="relative sticky top-0 z-40 border-b border-line/70 bg-white/95 sm:backdrop-blur-md">
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
          {linkItems.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-sand hover:text-navy"
            >
              {link.label}
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
          <LocaleSwitchLink
            locale={locale}
            className="rounded-full px-3 py-2 text-sm text-muted hover:bg-sand hover:text-navy"
          />
          {showQuote ? (
            <ButtonLink href="/get-a-quote" className="rounded-full">
              {quoteLabel}
            </ButtonLink>
          ) : null}
        </div>

        <DeferredHeaderMobile
          locale={locale}
          links={linkItems}
          aiHref={aiHref}
          aiLabel={aiLabel}
          quoteLabel={quoteLabel}
          showAi={showAi}
          showQuote={showQuote}
          menuLabel={t("menu")}
          closeLabel={t("close")}
          whatsappLabel={t("whatsapp")}
          callLabel={t("call")}
        />
      </Container>
    </header>
  );
}