import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { mailUrl, siteConfig, telUrl, whatsappUrl } from "@/config/site";
import { getActiveEmirates, getActiveServices } from "@/lib/catalog";
import { Container } from "@/components/ui/Section";

const headingClass = "text-xs font-semibold uppercase tracking-[0.14em] text-gold";
const listClass = "mt-3 flex flex-col gap-2 text-sm text-white/75";

export async function Footer({ locale }: { locale: string }) {
  const t = await getTranslations("Footer");
  const nav = await getTranslations("Nav");
  const services = await getActiveServices(locale);
  const emirates = await getActiveEmirates(locale);

  return (
    <footer className="border-t border-gold/30 bg-navy text-white">
      <Container className="grid gap-8 py-8 md:grid-cols-3 md:items-start md:gap-x-10 lg:gap-x-12">
        {/* Company */}
        <div>
          <p className={headingClass}>{t("company")}</p>
          <ul className={listClass}>
            <li>
              <Link href="/about" className="hover:text-gold">
                {nav("about")}
              </Link>
            </li>
            <li>
              <Link href="/services" className="hover:text-gold">
                {nav("services")}
              </Link>
            </li>
            <li>
              <Link href="/diy" className="hover:text-gold">
                {nav("diy")}
              </Link>
            </li>
            <li>
              <Link href="/projects" className="hover:text-gold">
                {nav("projects")}
              </Link>
            </li>
            <li>
              <Link href="/reviews" className="hover:text-gold">
                {nav("reviews")}
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-gold">
                {nav("faq")}
              </Link>
            </li>
          </ul>
          {services.length ? (
            <>
              <p className={`mt-6 ${headingClass}`}>{t("services")}</p>
              <ul className={listClass}>
                {services.map((service) => (
                  <li key={service.slug}>
                    <Link href={`/${service.slug}`} className="hover:text-gold">
                      {service.t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        {/* Contact */}
        <div>
          <p className={headingClass}>{t("contact")}</p>
          <ul className={listClass}>
            <li>
              <a href={telUrl()} className="hover:text-gold">
                {siteConfig.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={whatsappUrl()} className="hover:text-gold">
                {nav("whatsapp")}
              </a>
            </li>
            <li>
              <a href={mailUrl()} className="hover:text-gold">
                {siteConfig.email}
              </a>
            </li>
            <li>
              <Link href="/get-a-quote" className="hover:text-gold">
                {nav("quote")}
              </Link>
            </li>
          </ul>
          {emirates.length ? (
            <>
              <p className={`mt-6 ${headingClass}`}>{t("locations")}</p>
              <ul className={listClass}>
                {emirates.map((em) => (
                  <li key={em.slug}>
                    <Link href={`/locations/${em.slug}`} className="hover:text-gold">
                      {em.t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        {/* Legal — peer column on md+; subtle separator only when stacked */}
        <div className="border-t border-gold/15 pt-8 md:border-t-0 md:pt-0">
          <p className={headingClass}>{t("legal")}</p>
          <ul className={listClass}>
            <li>
              <Link href="/privacy-policy" className="hover:text-gold">
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-gold">
                {t("terms")}
              </Link>
            </li>
            <li>
              <Link href="/cancellation-policy" className="hover:text-gold">
                {t("cancellation")}
              </Link>
            </li>
            <li>
              <Link href="/cookie-policy" className="hover:text-gold">
                {t("cookies")}
              </Link>
            </li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}
