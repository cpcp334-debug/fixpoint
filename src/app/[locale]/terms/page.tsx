import { brandName } from "@/config/site";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Section } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Legal" });
  return buildMetadata({ locale, title: `${t("termsTitle")} | ${brandName(locale)}`, description: t("termsTitle"), path: "/terms" });
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Legal");
  const nav = await getTranslations("Nav");
  const ar = locale === "ar";
  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[{ href: "/", label: nav("home") }, { href: "/terms", label: t("termsTitle") }]}
        />
      }
    >
      <Section>
        <h1 className="text-[2rem] font-semibold text-navy">{t("termsTitle")}</h1>
        <div className="mt-4 max-w-3xl space-y-4 text-muted">
          {ar ? (
            <>
              <p>المحتوى العام تعليمي. المعلومات المدعومة بالذكاء الاصطناعي أولية ولا تغني عن المعاينة المهنية. العروض النهائية تخضع لمراجعة بشرية.</p>
              <p>طلب الحجز ليس موعداً مؤكداً حتى نؤكد التوفر. الخدمات المعروضة للعامة هي الخدمات ذات الحالة Active فقط.</p>
            </>
          ) : (
            <>
              <p>Public content is educational. AI-assisted information is preliminary and does not replace professional inspection. Final quotations require human review.</p>
              <p>A booking request is not a confirmed appointment until availability is confirmed. Only Active services are customer-facing.</p>
            </>
          )}
        </div>
      </Section>
    </PageShell>
  );
}
