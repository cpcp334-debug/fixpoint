import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { brandName, domainBrandName, mailUrl, productionSiteUrl, siteConfig, telUrl, whatsappUrl } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Section";
import { getPublishedSiteShell, type FooterShell } from "@/lib/site-shell";

const headingClass = "text-[11px] font-semibold uppercase tracking-[0.14em] text-gold";
const listClass = "mt-1.5 flex flex-col gap-1 text-sm leading-snug text-white/75";
const linkClass = "transition-colors hover:text-gold";

export async function Footer({ locale }: { locale: string }) {
  const t = await getTranslations("Footer");
  const nav = await getTranslations("Nav");
  const cta = await getTranslations("Cta");
  const year = new Date().getFullYear();
  const shell = (await getPublishedSiteShell("footer", locale)) as FooterShell | null;
  const licenses =
    shell?.licensesLine?.trim() ||
    siteConfig.licenses.map((row) => `${locale === "ar" ? row.emirateAr : row.emirate} ${row.licenseNo}`).join(" · ");

  return (
    <footer className="border-t border-gold/25 bg-navy text-white">
      <Container className="py-5 md:py-6">
        <div className="grid gap-5 md:grid-cols-3 md:gap-6">
          <div>
            <p className={headingClass}>{shell?.companyHeading?.trim() || t("company")}</p>
            <p className="mt-1.5 text-sm font-medium text-white">{brandName(locale)}</p>
            {shell?.companyBlurb?.trim() ? <p className="mt-1 text-sm text-white/75">{shell.companyBlurb}</p> : null}
            <p className="mt-1 text-sm text-white/75">
              <a href={productionSiteUrl} className={linkClass} target="_blank" rel="noopener noreferrer">
                {domainBrandName(locale)} · fixpoint.ae
              </a>
            </p>
            <ul className={listClass}>
              <li>
                <Link href="/about" className={linkClass}>
                  {nav("about")}
                </Link>
              </li>
              <li>
                <Link href="/services" className={linkClass}>
                  {nav("services")}
                </Link>
              </li>
              <li>
                <Link href="/diy" className={linkClass}>
                  {nav("diy")}
                </Link>
              </li>
              <li>
                <Link href="/projects" className={linkClass}>
                  {nav("projects")}
                </Link>
              </li>
              <li>
                <Link href="/blog" className={linkClass}>
                  {nav("blog")}
                </Link>
              </li>
              <li>
                <Link href="/reviews" className={linkClass}>
                  {nav("reviews")}
                </Link>
              </li>
              <li>
                <Link href="/faq" className={linkClass}>
                  {nav("faq")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className={headingClass}>{shell?.contactHeading?.trim() || t("contact")}</p>
            <ul className={listClass}>
              <li>
                <a href={telUrl()} className={linkClass}>
                  {siteConfig.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={mailUrl()} className={linkClass}>
                  {siteConfig.email}
                </a>
              </li>
              <li>
                <a href={siteConfig.mapsUrl} className={linkClass} target="_blank" rel="noopener noreferrer">
                  {t("maps")}
                </a>
              </li>
            </ul>
            <p className={`mt-3 ${headingClass}`}>{shell?.followHeading?.trim() || t("follow")}</p>
            <ul className={listClass}>
              <li>
                <a href={siteConfig.social.youtube} className={linkClass} target="_blank" rel="noopener noreferrer">
                  {t("youtube")}
                </a>
              </li>
              <li>
                <a href={siteConfig.social.instagram} className={linkClass} target="_blank" rel="noopener noreferrer">
                  {t("instagram")}
                </a>
              </li>
              <li>
                <a href={siteConfig.social.facebook} className={linkClass} target="_blank" rel="noopener noreferrer">
                  {t("facebook")}
                </a>
              </li>
              <li>
                <a href={siteConfig.social.tiktok} className={linkClass} target="_blank" rel="noopener noreferrer">
                  {t("tiktok")}
                </a>
              </li>
            </ul>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <ButtonLink href="/get-a-quote" variant="inversePrimary" className="min-h-9 px-3 text-sm">
                {cta("quote")}
              </ButtonLink>
              <ButtonLink href={whatsappUrl()} variant="inverse" className="min-h-9 px-3 text-sm" external>
                {cta("whatsapp")}
              </ButtonLink>
            </div>
          </div>

          <div>
            <p className={headingClass}>{shell?.legalHeading?.trim() || t("legal")}</p>
            <ul className={listClass}>
              <li>
                <Link href="/privacy-policy" className={linkClass}>
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className={linkClass}>
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link href="/cancellation-policy" className={linkClass}>
                  {t("cancellation")}
                </Link>
              </li>
              <li>
                <Link href="/cookie-policy" className={linkClass}>
                  {t("cookies")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="flex flex-col gap-1 text-xs leading-snug text-white/55 md:flex-row md:items-center md:justify-between md:gap-4">
            <p>
              © {year} {brandName(locale)}. {shell?.rights?.trim() || t("rights")}
            </p>
            <p className="md:text-end">
              {t("licenses")}: {licenses}
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
