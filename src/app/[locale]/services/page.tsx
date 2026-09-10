import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildApprovedNavTree } from "@/lib/catalog/approved-nav";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Section, SectionHeader } from "@/components/ui/Section";
import { MainCategoryCard } from "@/components/catalog/MainCategoryCard";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaBand } from "@/components/public/CtaBand";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Services" });
  return buildMetadata({ locale, title: `${t("title")} | ALNAJAH ALDAEM`, description: t("lead"), path: "/services" });
}

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Services");
  const nav = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");
  const categories = buildApprovedNavTree();

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[{ href: "/", label: nav("home") }, { href: "/services", label: t("title") }]}
        />
      }
    >
      <PublicHero title={t("title")} lead={home("mainServicesLead")} />

      <Section>
        <SectionHeader title={home("mainServicesTitle")} lead={t("draftNote")} />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <li key={cat.slug}>
              <MainCategoryCard category={cat} locale={locale} />
            </li>
          ))}
        </ul>
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
