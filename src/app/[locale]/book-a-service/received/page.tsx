import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicBookingReceipt } from "@/lib/bookings";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaRow } from "@/components/public/CtaRow";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Booking" });
  return buildMetadata({
    locale,
    title: `${t("receivedTitle")} | ALNAJAH ALDAEM`,
    description: t("receivedLead"),
    path: "/book-a-service/received",
    index: false,
  });
}

export default async function BookingReceivedPage({
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
  const receipt = await getPublicBookingReceipt(ref, locale);
  if (!receipt) notFound();
  const t = await getTranslations("Booking");
  const nav = await getTranslations("Nav");
  const cta = await getTranslations("Cta");

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[
            { href: "/", label: nav("home") },
            { href: "/book-a-service", label: t("title") },
            { href: "/book-a-service/received", label: t("receivedTitle") },
          ]}
        />
      }
    >
      <PublicHero kicker={t("title")} title={t("receivedTitle")} lead={t("receivedLead")} compact />
      <Section>
        <dl className="mx-auto grid max-w-xl gap-3 rounded-[16px] border border-line/80 bg-sand p-5 text-sm">
          <Row label={t("reference")} value={receipt.number} />
          <Row label={t("serviceLabel")} value={receipt.serviceName || t("notSpecified")} />
          <Row label={t("typeLabel")} value={t(`type_${receipt.type}`)} />
          <Row label={t("emirate")} value={receipt.emirateName || t("notSpecified")} />
          <Row label={t("city")} value={receipt.city || t("notSpecified")} />
          <Row label={t("area")} value={receipt.area || t("notSpecified")} />
          <Row label={t("date")} value={receipt.preferredDate || t("notSpecified")} />
          <Row label={t("time")} value={receipt.preferredTime || t("notSpecified")} />
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
              "Hello ALNAJAH ALDAEM",
              `Request ${receipt.number}`,
              receipt.serviceName ? `Service: ${receipt.serviceName}` : "",
              `Type: ${receipt.type}`,
              "This is a booking request. The preferred time is not an appointment.",
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-navy sm:col-span-2">{value}</dd>
    </div>
  );
}
