import { getTranslations, setRequestLocale } from "next-intl/server";
import { getActiveEmirates, getActiveServices } from "@/lib/catalog";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { LeadForm } from "@/components/forms/LeadForm";
import { mailUrl, siteConfig, telUrl, whatsappUrl } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";
import { Section, SectionHeader } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaBand } from "@/components/public/CtaBand";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });
  return buildMetadata({ locale, title: `${t("title")} | ALNAJAH ALDAEM`, description: t("lead"), path: "/contact" });
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Contact");
  const nav = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");
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
      <PublicHero
        title={t("title")}
        lead={t("lead")}
        compact
        actions={
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={telUrl()} external>
              {siteConfig.phoneDisplay}
            </ButtonLink>
            <ButtonLink href={whatsappUrl()} variant="secondary" external>
              {cta("whatsapp")}
            </ButtonLink>
            <ButtonLink href={mailUrl()} variant="ghost" external>
              {siteConfig.email}
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
