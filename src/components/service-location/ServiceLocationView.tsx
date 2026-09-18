import { Link } from "@/i18n/routing";
import { brandName } from "@/config/site";
import type { ServiceLocationPageModel } from "@/lib/service-location/page-model";
import { parseContentJson } from "@/lib/service-location/content-parse";
import { ensureDiySelfHelpSection } from "@/lib/service-location/content-builders";
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
import { EmiratePlaceDirectory } from "@/components/locations/EmiratePlaceDirectory";
import { isPublicEmirateSlug } from "@/lib/locations/emirate-directory";

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted">
      {items.map((item) => (
        <li key={item.slice(0, 64) + String(item.length)}>{item}</li>
      ))}
    </ul>
  );
}

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
    whatService?: string;
    problems?: string;
    symptoms?: string;
    process?: string;
    safety?: string;
    whenPro?: string;
    expert?: string;
  };
  reviewSummary?: { average: number; count: number };
  approvedReviews?: Array<{ authorName: string; stars: number; body: string }>;
}) {
  const Icon = serviceIcons[model.serviceSlug as keyof typeof serviceIcons];
  const wa = `Hello ${brandName("en")}, I need ${model.serviceName} in ${model.locationName}.`;
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

  const parsed = model.content.contentJson
    ? parseContentJson(
        typeof model.content.contentJson === "string"
          ? model.content.contentJson
          : JSON.stringify(model.content.contentJson),
      )
    : null;
  const structuredBase = parsed?.ok ? parsed.value : null;
  const diyBlock = ensureDiySelfHelpSection({
    existing: structuredBase?.diy,
    safetyState: model.diy.safetyClass,
    serviceName: model.serviceName,
    locale: model.locale === "ar" ? "ar" : "en",
    guideSlug: model.diy.guideSlug,
  });
  const structured = structuredBase ? { ...structuredBase, diy: diyBlock } : { diy: diyBlock };
  const mainBlock = "main" in structured ? structured.main : null;
  const expertBlock = "expert" in structured ? structured.expert : null;

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

      <PublicHero locale={model.locale}
        kicker={model.locationName}
        title={model.content.h1}
        lead={model.content.intro || undefined}
        icon={Icon}
        heroImage={model.image.src}
        imageAlt={model.image.alt}
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
          {isPublicEmirateSlug(model.locationSlug) ? (
            <EmiratePlaceDirectory
              emirateSlug={model.locationSlug}
              locale={model.locale}
              title={model.locale === "ar" ? "المدن والمناطق في هذه الإمارة" : "Cities and areas in this emirate"}
              lead={
                model.locale === "ar"
                  ? "اذكر أحد هذه الأسماء عند طلب الزيارة. المدن أولاً، ثم المناطق الأصغر داخل الإمارة."
                  : "Use one of these names when you request a visit. Cities are listed first, then the smaller areas inside the emirate."
              }
              citiesLabel={model.locale === "ar" ? "المدن" : "Cities"}
              areasLabel={model.locale === "ar" ? "المناطق والأحياء" : "Areas and communities"}
              note={
                model.locale === "ar"
                  ? "ذكر مدينة أو منطقة هنا لا يعني أن الخدمة متاحة هناك تلقائياً. اذكر المكان وسنؤكد ما إذا كان يمكن ترتيب زيارة."
                  : "Naming a city or area here does not mean the service is already available there. Tell us the place, and we confirm whether a visit can be arranged."
              }
            />
          ) : null}
          <ProseCard title={labels.overview}>
            <div className="whitespace-pre-line">{model.content.body || model.serviceLongDescription}</div>
          </ProseCard>
        </div>
      </Section>

      {mainBlock ? (
        <Section>
          <div className="grid gap-4">
            {mainBlock.serviceExplanation ? (
              <ProseCard title={labels.whatService || labels.overview}>
                <div className="whitespace-pre-line">{mainBlock.serviceExplanation}</div>
              </ProseCard>
            ) : null}
            {mainBlock.problems.length ? (
              <ProseCard title={labels.problems || "Problems"}>
                <BulletList items={mainBlock.problems} />
              </ProseCard>
            ) : null}
            {mainBlock.symptomsUseCases.length ? (
              <ProseCard title={labels.symptoms || "Symptoms"}>
                <BulletList items={mainBlock.symptomsUseCases} />
              </ProseCard>
            ) : null}
            {mainBlock.process.length ? (
              <ProseCard title={labels.process || "Process"}>
                <BulletList items={mainBlock.process} />
              </ProseCard>
            ) : null}
            {mainBlock.professionalRecommendation ? (
              <ProseCard title={labels.whenPro || "Professional help"}>
                <div className="whitespace-pre-line">{mainBlock.professionalRecommendation}</div>
              </ProseCard>
            ) : null}
          </div>
        </Section>
      ) : null}

      {structured?.diy ? (
        <Section tone="sand">
          <SectionHeader title={labels.diy} />
          <div className="mt-4 grid gap-4">
            {structured.diy.safeSelfChecks.length ? <BulletList items={structured.diy.safeSelfChecks} /> : null}
            {structured.diy.whatNotToDo.length || structured.diy.safetyNotes.length ? (
              <ProseCard title={labels.safety || "Safety"}>
                <BulletList items={[...structured.diy.whatNotToDo, ...structured.diy.safetyNotes]} />
              </ProseCard>
            ) : null}
            {structured.diy.stopConditions.length ? (
              <ProseCard title={labels.whenPro || "When to stop"}>
                <BulletList items={structured.diy.stopConditions} />
              </ProseCard>
            ) : null}
            {structured.diy.professionalFallback ? (
              <p className="text-sm text-muted whitespace-pre-line">{structured.diy.professionalFallback}</p>
            ) : null}
            {structured.diy.safetyState === "GREEN" || structured.diy.safetyState === "YELLOW"
              ? structured.diy.steps.length
                ? <BulletList items={structured.diy.steps} />
                : null
              : null}
            {model.diy.guideHref ? (
              <p className="mt-2">
                <Link href={model.diy.guideHref} className="font-medium text-accent">
                  {model.diy.title || model.diy.guideSlug}
                </Link>
              </p>
            ) : null}
          </div>
        </Section>
      ) : null}

      {expertBlock?.helpSummary ? (
        <Section>
          <ProseCard title={labels.expert || "Expert guidance"}>
            <div className="whitespace-pre-line">{expertBlock.helpSummary}</div>
          </ProseCard>
        </Section>
      ) : null}

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
