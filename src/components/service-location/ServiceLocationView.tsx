import { Link } from "@/i18n/routing";
import type { ServiceLocationPageModel } from "@/lib/service-location/page-model";
import { breadcrumbJsonLd, faqJsonLd, organizationJsonLd, reviewAggregateJsonLd, serviceJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FaqList } from "@/components/ui/Blocks";
import { Section, SectionHeader } from "@/components/ui/Section";
import { serviceIcons } from "@/components/ui/Icon";
import { PageShell, ProseCard } from "@/components/public/PageShell";
import { PublicHero, publicCanonical } from "@/components/public/PublicHero";
import { CtaRow } from "@/components/public/CtaRow";
import { CtaBand } from "@/components/public/CtaBand";
import { ServiceTrustBlock } from "@/components/trust/ServiceTrustBlock";
import { ButtonLink } from "@/components/ui/Button";

export function ServiceLocationView({
  model,
  labels,
  reviewSummary,
  approvedReviews,
}: {
  model: ServiceLocationPageModel;
  labels: {
    breadcrumb: string;
    home: string;
    local: string;
    overview: string;
    faq: string;
    aeo: string;
    diy: string;
    geo: string;
    relatedServices: string;
    relatedLocations: string;
    quote: string;
    book: string;
    inspect: string;
    whatsapp: string;
    call: string;
    share: string;
    copied: string;
    ctaTitle: string;
    ctaBody: string;
    ctaQuote: string;
    ctaAi: string;
    emergency?: string;
    amc?: string;
    previewBanner?: string;
  };
  reviewSummary?: { average: number; count: number };
  approvedReviews?: Array<{ authorName: string; stars: number; body: string }>;
}) {
  const Icon = serviceIcons[model.serviceSlug as keyof typeof serviceIcons];
  const wa = `Hello ALNAJAH ALDAEM, I need ${model.serviceName} in ${model.locationName}.`;
  const crumbItems = [
    { href: "/", label: labels.home },
    { href: `/${model.serviceSlug}`, label: model.serviceName },
    { href: model.path, label: model.locationName },
  ];
  const jsonBreadcrumbs = [
    { name: "Home", path: "/" },
    { name: model.serviceName, path: `/${model.serviceSlug}` },
    { name: model.locationName, path: model.path },
  ];
  const faqs = model.content.faqs;
  const geoBits = [
    model.hierarchyLabels.emirate,
    model.hierarchyLabels.city,
    model.hierarchyLabels.community,
  ].filter(Boolean);
  const geoText = [model.content.geoIntro, geoBits.length ? geoBits.join(" → ") : "", model.content.localInfo]
    .filter((part) => part && part.trim())
    .join("\n\n");

  return (
    <PageShell breadcrumbs={<Breadcrumbs label={labels.breadcrumb} items={crumbItems} />}>
      {model.mode === "preview" && labels.previewBanner ? (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {labels.previewBanner}
        </div>
      ) : null}

      <JsonLd
        data={serviceJsonLd({
          name: model.content.h1,
          description: model.metaDescription,
          path: model.path,
          locale: model.locale,
        })}
      />
      <JsonLd data={organizationJsonLd()} />
      {reviewSummary && approvedReviews ? (
        <JsonLd
          data={reviewAggregateJsonLd({
            name: model.content.h1,
            path: model.path,
            locale: model.locale,
            average: reviewSummary.average || 0,
            count: reviewSummary.count,
            reviews: approvedReviews,
          })}
        />
      ) : null}
      <JsonLd data={breadcrumbJsonLd(jsonBreadcrumbs, model.locale)} />
      <JsonLd data={faqJsonLd(faqs)} />

      <PublicHero
        kicker={model.locationName}
        title={model.content.h1}
        lead={model.content.intro || undefined}
        icon={Icon}
        heroImage={model.image.src}
        shareUrl={publicCanonical(model.locale, model.path)}
        shareLabel={labels.share}
        copiedLabel={labels.copied}
        actions={
          <CtaRow
            labels={{
              quote: labels.quote,
              book: labels.book,
              inspect: labels.inspect,
              whatsapp: labels.whatsapp,
              call: labels.call,
            }}
            whatsappText={wa}
            bookingEnabled={model.ops.bookingEnabled}
            extra={
              <>
                {model.ops.emergencyAvailable && labels.emergency ? (
                  <ButtonLink href="/book-a-service?type=emergency" variant="secondary">
                    {labels.emergency}
                  </ButtonLink>
                ) : null}
                {model.ops.amcAvailable && labels.amc ? (
                  <ButtonLink href="/get-a-quote?type=amc" variant="secondary">
                    {labels.amc}
                  </ButtonLink>
                ) : null}
              </>
            }
          />
        }
      />

      <Section tone="sand">
        <div className="grid gap-4">
          {geoText ? (
            <ProseCard title={labels.geo}>
              <div className="whitespace-pre-line">{geoText}</div>
            </ProseCard>
          ) : model.content.localInfo ? (
            <ProseCard title={labels.local}>{model.content.localInfo}</ProseCard>
          ) : null}
          <ProseCard title={labels.overview}>
            {model.content.body || model.serviceLongDescription}
          </ProseCard>
        </div>
      </Section>

      <Section>
        <SectionHeader title={labels.aeo} />
        <div className="mt-6 grid gap-3">
          {model.aeo.map((block) => (
            <article key={block.id} className="rounded-md border border-line bg-white p-4">
              <h3 className="font-medium">{block.question}</h3>
              <p className="mt-2 text-sm text-muted">{block.answer}</p>
            </article>
          ))}
        </div>
      </Section>

      {model.diy.visible && model.diy.guideHref ? (
        <Section tone="sand">
          <SectionHeader title={labels.diy} />
          {model.diy.quickAnswer ? <p className="mt-3 max-w-2xl text-sm text-muted">{model.diy.quickAnswer}</p> : null}
          <p className="mt-3">
            <Link href={model.diy.guideHref} className="font-medium text-accent">
              {model.diy.title || model.diy.guideSlug}
            </Link>
          </p>
        </Section>
      ) : null}

      {faqs.length ? (
        <Section>
          <SectionHeader title={labels.faq} />
          <div className="mt-6">
            <FaqList items={faqs} />
          </div>
        </Section>
      ) : null}

      {model.mode === "public" ? (
        <Section tone="sand">
          <ServiceTrustBlock
            locale={model.locale}
            serviceId={model.serviceId}
            locationId={model.locationId}
            serviceSlug={model.serviceSlug}
            locationSlug={model.locationSlug}
          />
        </Section>
      ) : null}

      {(model.relatedServices.length || model.relatedLocations.length) && model.mode === "public" ? (
        <Section>
          <div className="grid gap-6 md:grid-cols-2">
            {model.relatedServices.length ? (
              <div>
                <SectionHeader title={labels.relatedServices} />
                <ul className="mt-3 space-y-2 text-sm">
                  {model.relatedServices.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="text-accent">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {model.relatedLocations.length ? (
              <div>
                <SectionHeader title={labels.relatedLocations} />
                <ul className="mt-3 space-y-2 text-sm">
                  {model.relatedLocations.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="text-accent">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      <CtaBand
        title={labels.ctaTitle}
        body={labels.ctaBody}
        quote={labels.ctaQuote}
        ai={labels.ctaAi}
        whatsapp={labels.whatsapp}
        whatsappText={wa}
      />
    </PageShell>
  );
}
