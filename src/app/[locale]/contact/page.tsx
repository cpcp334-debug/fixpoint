import { getTranslations, setRequestLocale } from "next-intl/server";
import { getActiveEmirates, getActiveServices } from "@/lib/catalog";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { LeadForm } from "@/components/forms/LeadForm";
import { mailUrl, productionSiteUrl, siteConfig, telUrl, whatsappUrl, brandName } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";
import { Section, SectionHeader } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaBand } from "@/components/public/CtaBand";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });
  return buildMetadata({ locale, title: `${t("title")} | ${brandName(locale)}`, description: t("lead"), path: "/contact" });
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Contact");
  const nav = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");
  const footer = await getTranslations("Footer");
  const services = await getActiveServices(locale);
  const locations = await getActiveEmirates(locale);

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[{ href: "/", label: nav("home") }, { href: "/contact", label: t("title") }]}
        />
      }
    >
      <PublicHero locale={locale}
        kicker={brandName(locale)}
        title={t("title")}
        lead={t("lead")}
        compact
        actions={
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={productionSiteUrl} variant="secondary" external>
              {siteConfig.domainBrand} · fixpoint.ae
            </ButtonLink>
            <ButtonLink href={telUrl()} external>
              {siteConfig.phoneDisplay}
            </ButtonLink>
            <ButtonLink href={whatsappUrl()} variant="secondary" external>
              {cta("whatsapp")}
            </ButtonLink>
            <ButtonLink href={mailUrl()} variant="ghost" external>
              {siteConfig.email}
            </ButtonLink>
            <ButtonLink href={siteConfig.mapsUrl} variant="ghost" external>
              {footer("maps")}
            </ButtonLink>
            <ButtonLink href={siteConfig.social.youtube} variant="ghost" external>
              {footer("youtube")}
            </ButtonLink>
            <ButtonLink href={siteConfig.social.instagram} variant="ghost" external>
              {footer("instagram")}
            </ButtonLink>
            <ButtonLink href={siteConfig.social.facebook} variant="ghost" external>
              {footer("facebook")}
            </ButtonLink>
            <ButtonLink href={siteConfig.social.tiktok} variant="ghost" external>
              {footer("tiktok")}
            </ButtonLink>
          </div>
        }
      />
      <Section>
        <SectionHeader title={t("formTitle")} />
        <div className="mt-8">
          <LeadForm
            mode="contact"
            locale={locale}
            services={services.map((s) => ({ slug: s.slug, name: s.t.name }))}
            locations={locations.map((s) => ({ slug: s.slug, name: s.t.name }))}
          />
        </div>
      </Section>
      <CtaBand
        title={home("ctaTitle")}
        body={home("ctaBody")}
        quote={home("ctaQuote")}
        ai={home("ctaAi")}
        whatsapp={cta("whatsapp")}
      />
    </PageShell>
  );
}
