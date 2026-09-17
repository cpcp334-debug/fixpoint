import { brandName } from "@/config/site";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Section } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Legal" });
  return buildMetadata({ locale, title: `${t("cancelTitle")} | ${brandName(locale)}`, description: t("cancelTitle"), path: "/cancellation-policy" });
}

export default async function CancelPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Legal");
  const nav = await getTranslations("Nav");
  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[{ href: "/", label: nav("home") }, { href: "/cancellation-policy", label: t("cancelTitle") }]}
        />
      }
    >
      <Section>
        <h1 className="text-[2rem] font-semibold text-navy">{t("cancelTitle")}</h1>
        <p className="mt-4 max-w-3xl text-muted">
          {locale === "ar"
            ? "يمكن إلغاء طلب عرض السعر أو طلب الحجز غير المؤكد عبر الهاتف أو واتساب أو البريد. شروط إلغاء العمل المؤكد تُذكر في العرض بعد المراجعة البشرية."
            : "Quote requests and unconfirmed booking requests can be cancelled by phone, WhatsApp, or email. Cancellation terms for confirmed work are stated on the quotation after human review."}
        </p>
      </Section>
    </PageShell>
  );
}
