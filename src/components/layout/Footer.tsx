import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { mailUrl, siteConfig, telUrl, whatsappUrl } from "@/config/site";
import { getActiveEmirates, getActiveServices } from "@/lib/catalog";
import { Container } from "@/components/ui/Section";

export async function Footer({ locale }: { locale: string }) {
  const t = await getTranslations("Footer");
  const nav = await getTranslations("Nav");
  const services = await getActiveServices(locale);
  const emirates = await getActiveEmirates(locale);

  return (
    <footer className="border-t border-line bg-sand">
      <Container className="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-semibold text-navy">{locale === "ar" ? siteConfig.brandAr : siteConfig.brand}</p>
          <p className="mt-2 text-sm text-muted">{t("copyright")}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">{t("licensesNote")}</p>
        </div>
        <div>
          <p className="font-semibold text-navy">{t("company")}</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/about">{nav("about")}</Link>
            </li>
            <li>
              <Link href="/services">{nav("services")}</Link>
            </li>
            <li>
              <Link href="/diy">{nav("diy")}</Link>
            </li>
            <li>
              <Link href="/projects">{nav("projects")}</Link>
            </li>
            <li>
              <Link href="/reviews">{nav("reviews")}</Link>
            </li>
            <li>
              <Link href="/faq">{nav("faq")}</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-navy">{t("services")}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {services.map((service) => (
              <li key={service.slug}>
                <Link href={`/${service.slug}`}>{service.t.name}</Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 font-semibold text-navy">{t("locations")}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {emirates.map((em) => (
              <li key={em.slug}>
                <Link href={`/locations/${em.slug}`}>{em.t.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-navy">{t("contact")}</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href={telUrl()}>{siteConfig.phoneDisplay}</a>
            </li>
            <li>
              <a href={whatsappUrl()}>{nav("whatsapp")}</a>
            </li>
            <li>
              <a href={mailUrl()}>{siteConfig.email}</a>
            </li>
            <li>
              <Link href="/contact">{nav("contact")}</Link>
            </li>
            <li>
              <Link href="/get-a-quote">{nav("quote")}</Link>
            </li>
          </ul>
          <p className="mt-6 font-semibold text-navy">{t("legal")}</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/privacy-policy">{t("privacy")}</Link>
            </li>
            <li>
              <Link href="/terms">{t("terms")}</Link>
            </li>
            <li>
              <Link href="/cancellation-policy">{t("cancellation")}</Link>
            </li>
            <li>
              <Link href="/cookie-policy">{t("cookies")}</Link>
            </li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}
