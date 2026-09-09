import { getTranslations, setRequestLocale } from "next-intl/server";
import { getActiveEmirates, getActiveServices } from "@/lib/catalog";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { LeadForm } from "@/components/forms/LeadForm";
import { Disclaimer } from "@/components/ui/Blocks";
import { mailUrl, siteConfig, telUrl, whatsappUrl } from "@/config/site";
import { Section } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaBand } from "@/components/public/CtaBand";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Quote" });
  return buildMetadata({ locale, title: `${t("title")} | ALNAJAH ALDAEM`, description: t("lead"), path: "/get-a-quote" });
}

export default async function QuotePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Quote");
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
          items={[{ href: "/", label: nav("home") }, { href: "/get-a-quote", label: t("title") }]}
        />
      }
    >
      <PublicHero title={t("title")} lead={t("lead")} compact />
      <Section>
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
        aiHref={`/${locale}#alnajah-ai`}
      />
    </PageShell>
  );
}
