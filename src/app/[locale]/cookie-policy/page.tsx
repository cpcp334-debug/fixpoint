import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Section } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";
import { AnalyticsOptOut } from "@/components/analytics/AnalyticsOptOut";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Legal" });
  return buildMetadata({ locale, title: `${t("cookieTitle")} | ALNAJAH ALDAEM`, description: t("cookieTitle"), path: "/cookie-policy" });
}

export default async function CookiePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Legal");
  const nav = await getTranslations("Nav");
  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[{ href: "/", label: nav("home") }, { href: "/cookie-policy", label: t("cookieTitle") }]}
        />
      }
    >
      <Section>
        <h1 className="text-[2rem] font-semibold text-navy">{t("cookieTitle")}</h1>
        <p className="mt-4 max-w-3xl text-muted">{t("cookieBody")}</p>
        <p className="mt-4 max-w-3xl text-muted">{t("cookieAnalytics")}</p>
        <AnalyticsOptOut label={t("cookieOptOut")} done={t("cookieOptOutDone")} />
      </Section>
    </PageShell>
  );
}
