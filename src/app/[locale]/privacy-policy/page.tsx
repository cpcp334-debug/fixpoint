import { getTranslations, setRequestLocale } from "next-intl/server";
import { siteConfig, brandName } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Section } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Legal" });
  return buildMetadata({ locale, title: `${t("privacyTitle")} | ${brandName(locale)}`, description: t("privacyTitle"), path: "/privacy-policy" });
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
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
          items={[{ href: "/", label: nav("home") }, { href: "/privacy-policy", label: t("privacyTitle") }]}
        />
      }
    >
      <Section>
        <h1 className="text-[2rem] font-semibold text-navy">{t("privacyTitle")}</h1>
        {ar ? (
          <div className="mt-4 max-w-3xl space-y-4 text-muted">
            <p>تجمع النجاح الدائم · Fixpoint بيانات التواصل التي ترسلها عبر النماذج (الاسم والهاتف والبريد والرسالة وموقع الخدمة) للرد على الطلبات. لا نبيع بياناتك.</p>
            <p>لا نطلب أرقام جوازات أو هوية إماراتية عبر هذا الموقع العام. المساعد الذكي يستخدم فقط معلومات الخدمات العامة المفعّلة.</p>
            <p>{t("privacyAnalytics")}</p>
            <p>للتواصل: {siteConfig.email} — {siteConfig.phoneDisplay}.</p>
          </div>
        ) : (
          <div className="mt-4 max-w-3xl space-y-4 text-muted">
            <p>Al Najah Al Daem · Fixpoint collects contact details you submit through forms (name, phone, email, message, and service location) so we can respond to enquiries. We do not sell this information.</p>
            <p>This public website does not ask for passport numbers or Emirates ID numbers. ALNAJAH AI may use only public, approved service information.</p>
            <p>{t("privacyAnalytics")}</p>
            <p>Contact: {siteConfig.email} — {siteConfig.phoneDisplay}.</p>
          </div>
        )}
      </Section>
    </PageShell>
  );
}
