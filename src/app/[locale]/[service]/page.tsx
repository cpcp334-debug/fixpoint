import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isReservedSlug } from "@/config/reserved-slugs";
import { siteConfig } from "@/config/site";
import {
  getActiveEmirates,
  getPublishedGuides,
  getRelatedServices,
  getServiceBySlug,
} from "@/lib/catalog";
import { prisma } from "@/server/db";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd, reviewAggregateJsonLd, serviceJsonLd } from "@/lib/seo";
import { parseJson } from "@/lib/utils";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Disclaimer, FaqList } from "@/components/ui/Blocks";
import { ServiceTrustBlock } from "@/components/trust/ServiceTrustBlock";
import { getApprovedServiceReviews, summarizeApprovedServiceReviews, toPublicReview } from "@/lib/reviews";
import { EmptyState, Section, SectionHeader } from "@/components/ui/Section";
import { DiyCard, LocationCard, ServiceCard } from "@/components/home/Cards";
import { ProblemChips } from "@/components/home/ProblemChips";
import { serviceIcons } from "@/components/ui/Icon";
import { PageShell, ProseCard } from "@/components/public/PageShell";
import { PublicHero, publicCanonical } from "@/components/public/PublicHero";
import { CtaRow } from "@/components/public/CtaRow";
import { CtaBand } from "@/components/public/CtaBand";

function intakeChips(raw: string, locale: string) {
  return parseJson<Array<{ en?: string; ar?: string } | string>>(raw, [])
    .map((q) => (typeof q === "string" ? q : locale === "ar" ? q.ar || q.en || "" : q.en || q.ar || ""))
    .filter(Boolean)
    .map((label) => ({ label, prompt: label }));
}

export async function generateStaticParams() {
  try {
    const rows = await prisma.service.findMany({
      where: { status: "active", indexable: true },
      select: { slug: true },
    });
    return rows.map((row) => ({ service: row.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; service: string }>;
}) {
  const { locale, service } = await params;
  if (isReservedSlug(service)) return {};
  const row = await getServiceBySlug(service, locale);
  if (!row) return {};
  return buildMetadata({
    locale,
    title: row.t.seoTitle,
    description: row.t.metaDescription,
    path: `/${row.slug}`,
  });
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ locale: string; service: string }>;
}) {
  const { locale, service } = await params;
  setRequestLocale(locale);
  if (isReservedSlug(service)) notFound();
  const row = await getServiceBySlug(service, locale);
  if (!row) notFound();
  const t = await getTranslations("Services");
  const nav = await getTranslations("Nav");
  const cta = await getTranslations("Cta");
  const home = await getTranslations("Home");
  const emirates = await getActiveEmirates(locale);
  const related = await getRelatedServices(parseJson<string[]>(row.relatedServiceSlugs, []), locale);
  const faqs = parseJson<Array<{ q: string; a: string }>>(row.t.faq, []);
  const guides = (await getPublishedGuides(locale)).filter((g) => g.serviceId === row.id);
  const [reviewSummary, approvedReviews] = await Promise.all([
    summarizeApprovedServiceReviews({ serviceId: row.id }),
    getApprovedServiceReviews({ serviceId: row.id, take: 10 }),
  ]);
  const questions = intakeChips(row.aiIntakeQuestions, locale);
  const capabilities = [
    row.diyAvailable ? home("chipDiy") : null,
    row.emergencyAvailable ? home("chipEmergency") : null,
    row.amcAvailable ? home("chipAmc") : null,
  ].filter(Boolean) as string[];
  const Icon = serviceIcons[row.slug as keyof typeof serviceIcons];
  const ctaLabels = {
    quote: cta("quote"),
    book: cta("book"),
    inspect: cta("inspect"),
    whatsapp: cta("whatsapp"),
    call: cta("call"),
  };
  const wa = `Hello ALNAJAH ALDAEM, I need ${row.t.name}.`;

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[
            { href: "/", label: nav("home") },
            { href: "/services", label: t("title") },
            { href: `/${row.slug}`, label: row.t.name },
          ]}
        />
      }
    >
      <JsonLd data={serviceJsonLd({ name: row.t.name, description: row.t.shortDescription, path: `/${row.slug}`, locale })} />
      <JsonLd
        data={reviewAggregateJsonLd({
          name: row.t.name,
          path: `/${row.slug}`,
          locale,
          average: reviewSummary.average || 0,
          count: reviewSummary.count,
          reviews: approvedReviews.map((item) => toPublicReview(item, locale)),
        })}
      />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: row.t.name, path: `/${row.slug}` }], locale)} />
      <JsonLd data={faqJsonLd(faqs)} />

      <PublicHero
        kicker={t("title")}
        title={row.t.name}
        lead={row.t.shortDescription}
        icon={Icon}
        heroImage={row.heroImage}
        shareUrl={publicCanonical(locale, `/${row.slug}`)}
        shareLabel={home("share")}
        copiedLabel={home("copied")}
        actions={<CtaRow labels={ctaLabels} whatsappText={wa} />}
      />

      {capabilities.length || questions.length ? (
        <Section>
          {capabilities.length ? (
            <ul className="flex flex-wrap gap-2">
              {capabilities.map((chip) => (
                <li key={chip} className="rounded-full bg-sand px-3 py-1 text-sm text-navy">
                  {chip}
                </li>
              ))}
            </ul>
          ) : null}
          {questions.length ? (
            <div className={capabilities.length ? "mt-8" : undefined}>
              <ProblemChips chips={questions} hint={t("intakeTitle")} />
            </div>
          ) : null}
        </Section>
      ) : null}

      <Section tone="sand">
        <div className="grid gap-4">
          <ProseCard title={t("overview")}>{row.t.longDescription}</ProseCard>
          <ProseCard title={t("who")}>{row.t.whoItIsFor}</ProseCard>
          <ProseCard title={t("what")}>{row.t.whatWeDo}</ProseCard>
        </div>
      </Section>

      {row.diyAvailable && guides.length ? (
        <Section>
          <SectionHeader title={t("diy")} />
          <div className="mt-4">
            <Disclaimer>{siteConfig.disclaimers.diy[locale === "ar" ? "ar" : "en"]}</Disclaimer>
          </div>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {guides.map((guide) => (
              <li key={guide.slug}>
                <DiyCard
                  slug={guide.slug}
                  title={guide.t.title}
                  category={guide.categoryT?.name}
                  difficulty={guide.t.difficulty || guide.difficulty}
                  time={guide.t.estimatedTime || guide.estimatedTime}
                  summary={guide.t.quickAnswer}
                  cta={home("readGuide")}
                />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section tone="sand">
        <div className="grid gap-4">
          <ProseCard title={t("professional")}>{row.t.whenProfessional}</ProseCard>
          <ProseCard title={t("process")}>{row.t.process}</ProseCard>
          <ProseCard title={t("pricing")}>{row.t.pricingInfo}</ProseCard>
        </div>
        <div className="mt-6">
          <Disclaimer>{siteConfig.disclaimers.quote[locale === "ar" ? "ar" : "en"]}</Disclaimer>
        </div>
      </Section>

      <Section>
        <SectionHeader title={t("gallery")} />
        <div className="mt-6">
          <EmptyState body={t("galleryEmpty")} />
        </div>
      </Section>

      {faqs.length ? (
        <Section tone="sand">
          <SectionHeader title={t("faq")} />
          <div className="mt-6">
            <FaqList items={faqs} />
          </div>
        </Section>
      ) : null}

      <Section>
        <ServiceTrustBlock locale={locale} serviceId={row.id} serviceSlug={row.slug} />
      </Section>

      {related.length ? (
        <Section tone="sand">
          <SectionHeader title={t("relatedServices")} />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ServiceCard
                key={item.slug}
                slug={item.slug}
                name={item.t.name}
                description={item.t.shortDescription}
                cta={home("viewService")}
                diyLabel={item.diyAvailable ? home("chipDiy") : undefined}
                amcLabel={item.amcAvailable ? home("chipAmc") : undefined}
                emergencyLabel={item.emergencyAvailable ? home("chipEmergency") : undefined}
              />
            ))}
          </div>
        </Section>
      ) : null}

      <Section>
        <SectionHeader title={t("areas")} />
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {emirates.map((em) => (
            <li key={em.slug}>
              <LocationCard
                slug={em.slug}
                name={em.t.name}
                note={`${row.t.name} — ${em.t.name}`}
                href={`/${row.slug}/${em.slug}`}
              />
            </li>
          ))}
        </ul>
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
