import { getTranslations, setRequestLocale } from "next-intl/server";
import { getGlobalFaqs } from "@/lib/catalog";
import { buildMetadata, faqJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FaqList } from "@/components/ui/Blocks";
import { QuestionForm } from "@/components/forms/QuestionForm";
import { Section } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaBand } from "@/components/public/CtaBand";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "FaqPage" });
  return buildMetadata({ locale, title: `${t("title")} | ALNAJAH ALDAEM`, description: t("lead"), path: "/faq" });
}

export default async function FaqRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("FaqPage");
  const nav = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");
  const faqs = await getGlobalFaqs(locale);

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[{ href: "/", label: nav("home") }, { href: "/faq", label: t("title") }]}
        />
      }
    >
      <JsonLd data={faqJsonLd(faqs)} />
      <PublicHero kicker={t("title")} title={t("title")} lead={t("lead")} compact />
      <Section>
        <FaqList items={faqs} />
        <QuestionForm locale={locale} />
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
