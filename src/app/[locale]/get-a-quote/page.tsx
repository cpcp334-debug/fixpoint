import { relatedServiceQuotationCopy } from "@/lib/catalog/service-quotation-copy";
import { serviceChoiceLabels } from "@/lib/catalog/service-choice-labels";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getActiveEmirates, getActiveServices } from "@/lib/catalog";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { LeadForm } from "@/components/forms/LeadForm";
import { Disclaimer } from "@/components/ui/Blocks";
import { mailUrl, siteConfig, telUrl, whatsappUrl, brandName } from "@/config/site";
import { Section } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaBand } from "@/components/public/CtaBand";
import { toMasterLocationSlug } from '@/lib/slug/location-slug-map';
import { toMasterServiceSlug } from '@/lib/slug/service-slug-map';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Quote" });
  return buildMetadata({ locale, title: `${t("title")} | ${brandName(locale)}`, description: t("lead"), path: "/get-a-quote" });
}

export default async function QuotePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams:Promise<{service?:string | string[]; location?:string | string[]}> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Quote");
  const nav = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const enquiryCopy = relatedServiceQuotationCopy(null, locale);
  const cta = await getTranslations("Cta");
  const services = await getActiveServices(locale);
  const query = await searchParams;
  const requestedService = typeof query.service === "string" ? query.service : undefined;
  const defaultService=requestedService ? services.find(s=>toMasterServiceSlug(s.slug)===toMasterServiceSlug(requestedService))?.slug : undefined;
  const locations = await getActiveEmirates(locale);
  const requestedLocation = typeof query.location === "string" ? toMasterLocationSlug(query.location) : undefined;
  const defaultLocation = locations.find((location) => location.slug === requestedLocation)?.slug;

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[{ href: "/", label: nav("home") }, { href: "/get-a-quote", label: t("title") }]}
        />
      }
    >
      <PublicHero locale={locale} title={t("title")} lead={t("lead")} compact />
      <Section id="quote-form">
        <Disclaimer>{siteConfig.disclaimers.quote[locale === "ar" ? "ar" : "en"]}</Disclaimer>
        <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          <a href={telUrl()} className="hover:text-navy">
            {siteConfig.phoneDisplay}
          </a>
          <a href={whatsappUrl()} className="hover:text-navy">
            {cta("whatsapp")}
          </a>
          <a href={mailUrl()} className="hover:text-navy">
            {siteConfig.email}
          </a>
        </p>
        <div className="mt-8">
          <LeadForm
            mode="quote"
            defaultService={defaultService}
            defaultLocation={defaultLocation}
            locale={locale}
            services={serviceChoiceLabels(services.map((s) => ({
              slug: s.slug,
              name: s.t.name,
              englishName: s.translations.find((translation) => translation.locale === "en")?.name,
            })), locale)}
            locations={locations.map((s) => ({ slug: s.slug, name: s.t.name }))}
          />
        </div>
      </Section>
      <CtaBand
        title={enquiryCopy?.title ?? home("ctaTitle")}
        body={enquiryCopy?.body ?? home("ctaBody")}
        quote={enquiryCopy?.quote ?? home("ctaQuote")}
        ai={home("ctaAi")}
        whatsapp={cta("whatsapp")}
        quoteHref="#quote-form"
        aiHref={`/${locale}#alnajah-ai`}
      />
    </PageShell>
  );
}
