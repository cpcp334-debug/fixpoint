import { getTranslations, setRequestLocale } from "next-intl/server";
import { brandName } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Section, SectionHeader } from "@/components/ui/Section";
import { PageShell, ProseCard } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { LicenseCards } from "@/components/public/LicenseCards";
import { CtaBand } from "@/components/public/CtaBand";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });
  return buildMetadata({ locale, title: `${t("title")} | ${brandName(locale)}`, description: t("lead"), path: "/about" });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("About");
  const nav = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[{ href: "/", label: nav("home") }, { href: "/about", label: t("title") }]}
        />
      }
    >
      <PublicHero locale={locale} kicker={brandName(locale)} title={t("title")} lead={t("lead")} />
      <Section>
        <ProseCard title={t("teamTitle")}>{t("teamBody")}</ProseCard>
      </Section>
      <Section tone="sand">
        <SectionHeader title={t("licensesTitle")} lead={t("licensesLead")} />
        <div className="mt-8">
          <LicenseCards locale={locale} activityLabel={t("activity")} licenseLabel={t("licenseNo")} />
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
