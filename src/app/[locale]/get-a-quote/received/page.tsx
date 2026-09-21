import { brandName } from "@/config/site";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicQuoteReceipt } from "@/lib/leads";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaRow } from "@/components/public/CtaRow";
import { ConversionDataLayer } from "@/components/analytics/ConversionDataLayer";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Quote" });
  return buildMetadata({
    locale,
    title: `${t("receivedTitle")} | ${brandName(locale)}`,
    description: t("receivedLead"),
    path: "/get-a-quote/received",
    index: false,
  });
}

export default async function QuoteReceivedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { locale } = await params;
  const { ref } = await searchParams;
  setRequestLocale(locale);
  if (!ref) notFound();
  const receipt = await getPublicQuoteReceipt(ref, locale);
  if (!receipt) notFound();
  const t = await getTranslations("Quote");
  const nav = await getTranslations("Nav");
  const cta = await getTranslations("Cta");

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[
            { href: "/", label: nav("home") },
            { href: "/get-a-quote", label: t("title") },
            { href: "/get-a-quote/received", label: t("receivedTitle") },
          ]}
        />
      }
    >
      <ConversionDataLayer event="quote_submit_success" refId={receipt.id} locale={locale} />
      <PublicHero locale={locale} kicker={t("title")} title={t("receivedTitle")} lead={t("receivedLead")} compact />
      <Section>
        <dl className="mx-auto grid max-w-xl gap-3 rounded-xl border border-line bg-white p-5 text-sm">
          <div className="grid gap-1 sm:grid-cols-3">
            <dt className="text-muted">{t("reference")}</dt>
            <dd className="font-medium text-navy sm:col-span-2">{receipt.id.slice(0, 12)}…</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-3">
            <dt className="text-muted">{t("service")}</dt>
            <dd className="font-medium text-navy sm:col-span-2">{receipt.serviceName || t("notSpecified")}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-3">
            <dt className="text-muted">{t("location")}</dt>
            <dd className="font-medium text-navy sm:col-span-2">{receipt.emirateName || t("notSpecified")}</dd>
          </div>
        </dl>
        <div className="mx-auto mt-8 max-w-xl">
          <CtaRow
            labels={{
              quote: cta("quote"),
              book: cta("book"),
              inspect: cta("inspect"),
              whatsapp: cta("whatsapp"),
              call: cta("call"),
            }}
            whatsappText={[
              "Hello Al Najah Al Daem · Fixpoint",
              "Quote request received",
              receipt.serviceName ? `Service: ${receipt.serviceName}` : "",
            ]
              .filter(Boolean)
              .join(". ")}
            extra={
              <ButtonLink href="/" variant="secondary">
                {t("returnHome")}
              </ButtonLink>
            }
          />
        </div>
      </Section>
    </PageShell>
  );
}
