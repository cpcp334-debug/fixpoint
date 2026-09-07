import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { isReservedSlug } from "@/config/reserved-slugs";
import { getServiceLocation } from "@/lib/catalog";
import { prisma } from "@/server/db";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd, reviewAggregateJsonLd, serviceJsonLd } from "@/lib/seo";
import { parseJson } from "@/lib/utils";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { AiPanel } from "@/components/ai/AiPanel";
import { FaqList } from "@/components/ui/Blocks";
import { ServiceTrustBlock } from "@/components/trust/ServiceTrustBlock";
import { getApprovedServiceReviews, summarizeApprovedServiceReviews, toPublicReview } from "@/lib/reviews";
import { Section, SectionHeader } from "@/components/ui/Section";
import { serviceIcons } from "@/components/ui/Icon";
import { PageShell, ProseCard } from "@/components/public/PageShell";
import { PublicHero, publicCanonical } from "@/components/public/PublicHero";
import { CtaRow } from "@/components/public/CtaRow";
import { CtaBand } from "@/components/public/CtaBand";

export async function generateStaticParams() {
  try {
    const rows = await prisma.serviceLocation.findMany({
      where: {
        indexable: true,
        service: { status: "active", indexable: true },
        location: { status: "active", indexable: true, serves: true },
      },
      include: { service: true, location: true },
    });
    return rows.map((row) => ({ service: row.service.slug, location: row.location.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; service: string; location: string }>;
}) {
  const { locale, service, location } = await params;
  const row = await getServiceLocation(service, location, locale);
  if (!row) return { robots: { index: false, follow: false } };
  return buildMetadata({
    locale,
    title: row.t.seoTitle,
    description: row.t.metaDescription,
    path: `/${service}/${location}`,
  });
}

export default async function ServiceLocationPage({
  params,
}: {
  params: Promise<{ locale: string; service: string; location: string }>;
}) {
  const { locale, service, location } = await params;
  setRequestLocale(locale);
  if (isReservedSlug(service)) notFound();
  const row = await getServiceLocation(service, location, locale);
  if (!row) notFound();
  const t = await getTranslations("Services");
  const loc = await getTranslations("Locations");
  const nav = await getTranslations("Nav");
  const cta = await getTranslations("Cta");
  const home = await getTranslations("Home");
  const faqs = parseJson<Array<{ q: string; a: string }>>(row.t.faq, []);
  const [reviewSummary, approvedReviews] = await Promise.all([
    summarizeApprovedServiceReviews({ serviceId: row.service.id, locationId: row.location.id }),
    getApprovedServiceReviews({ serviceId: row.service.id, locationId: row.location.id, take: 10 }),
  ]);
  const title = `${row.serviceT.name} — ${row.locationT.name}`;
  const Icon = serviceIcons[service as keyof typeof serviceIcons];
  const ctaLabels = {
    quote: cta("quote"),
    book: cta("book"),
    inspect: cta("inspect"),
    whatsapp: cta("whatsapp"),
    call: cta("call"),
  };
  const wa = `Hello ALNAJAH ALDAEM, I need ${row.serviceT.name} in ${row.locationT.name}.`;

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[
            { href: "/", label: nav("home") },
            { href: `/${service}`, label: row.serviceT.name },
            { href: `/${service}/${location}`, label: row.locationT.name },
          ]}
        />
      }
    >
      <JsonLd
        data={serviceJsonLd({
          name: title,
          description: row.t.metaDescription,
          path: `/${service}/${location}`,
          locale,
        })}
      />
      <JsonLd
        data={reviewAggregateJsonLd({
          name: title,
          path: `/${service}/${location}`,
          locale,
          average: reviewSummary.average || 0,
          count: reviewSummary.count,
          reviews: approvedReviews.map((item) => toPublicReview(item, locale)),
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: "Home", path: "/" },
            { name: row.serviceT.name, path: `/${service}` },
            { name: row.locationT.name, path: `/${service}/${location}` },
          ],
          locale,
        )}
      />
      <JsonLd data={faqJsonLd(faqs)} />

      <PublicHero
        kicker={row.locationT.name}
        title={title}
        lead={row.t.intro}
        icon={Icon}
        heroImage={row.service.heroImage}
        shareUrl={publicCanonical(locale, `/${service}/${location}`)}
        shareLabel={home("share")}
        copiedLabel={home("copied")}
        actions={<CtaRow labels={ctaLabels} whatsappText={wa} tone="inverse" />}
      />

      <Section tone="sand">
        <div className="grid gap-4">
          <ProseCard title={loc("local")}>{row.t.localInfo}</ProseCard>
          <ProseCard title={t("overview")}>{row.serviceT.longDescription}</ProseCard>
        </div>
      </Section>

      <Section tone="sand" id="alnajah-ai">
        <SectionHeader title={t("ai")} />
        <div className="mt-6">
          <AiPanel locale={locale} />
        </div>
      </Section>

      {faqs.length ? (
        <Section>
          <SectionHeader title={t("faq")} />
          <div className="mt-6">
            <FaqList items={faqs} />
          </div>
        </Section>
      ) : null}

      <Section tone="sand">
        <ServiceTrustBlock
          locale={locale}
          serviceId={row.service.id}
          locationId={row.location.id}
          serviceSlug={service}
          locationSlug={location}
        />
      </Section>

      <Section>
        <p className="text-sm">
          <Link href={`/locations/${location}`} className="font-medium text-accent">
            {row.locationT.name}
          </Link>
          {" · "}
          <Link href={`/${service}`} className="font-medium text-accent">
            {row.serviceT.name}
          </Link>
        </p>
      </Section>

      <CtaBand
        title={home("ctaTitle")}
        body={home("ctaBody")}
        quote={home("ctaQuote")}
        ai={home("ctaAi")}
        whatsapp={cta("whatsapp")}
        whatsappText={wa}
      />
    </PageShell>
  );
}
