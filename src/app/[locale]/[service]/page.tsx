import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isReservedSlug } from "@/config/reserved-slugs";
import { brandName, siteConfig } from "@/config/site";
import {
  getActiveEmirates,
  getPublishedGuides,
  getRelatedServices,
  getApprovedCatalogServiceBySlug,
  getServiceBySlug,
} from "@/lib/catalog";
import { prisma } from "@/server/db";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd, reviewAggregateJsonLd, serviceJsonLd } from "@/lib/seo";
import { parseJson } from "@/lib/utils";
import { parseFaqJson } from "@/lib/faq";
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
import { TopElectricalServices } from "@/components/catalog/TopElectricalServices";
import { Link } from "@/i18n/routing";
import { getServiceFaqBySlug } from "@/lib/faq/pages";
import { serviceFaqSlug } from "@/lib/faq/service-faq";
import { serviceHref, serviceLocationHref, locationPageHref, servicePathSlug } from "@/lib/slug/locale-slug";

function intakeChips(raw: string, locale: string) {
  return parseJson<Array<{ en?: string; ar?: string } | string>>(raw, [])
    .map((q) => (typeof q === "string" ? q : locale === "ar" ? q.ar || q.en || "" : q.en || q.ar || ""))
    .filter(Boolean)
    .map((label) => ({ label, prompt: label }));
}

/**
 * Avoid SSG of hundreds of service pages × locales at Hostinger build
 * (long MySQL window). dual-slug via serviceLookupCandidates + dynamicParams.
 */
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; service: string }>;
}) {
  const { locale, service } = await params;
  if (isReservedSlug(service)) return {};
  const row = (await getServiceBySlug(service, locale)) ?? (await getApprovedCatalogServiceBySlug(service, locale));
  if (!row) return {};
  return buildMetadata({
    locale,
    title: row.t.seoTitle,
    description: row.t.metaDescription,
    path: `/${servicePathSlug(locale, row.slug)}`,
    index: row.publicIndexable,
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
  const row = (await getServiceBySlug(service, locale)) ?? (await getApprovedCatalogServiceBySlug(service, locale));
  if (!row) notFound();
  const t = await getTranslations("Services");
  const nav = await getTranslations("Nav");
  const cta = await getTranslations("Cta");
  const home = await getTranslations("Home");
  const emirates = await getActiveEmirates(locale);
  const coveredEmirates = await prisma.serviceLocation.findMany({
    where: {
      serviceId: row.id,
      covered: true,
      coverageStatus: "published",
      indexable: true,
      location: { type: "emirate", status: "active", indexable: true },
    },
    select: { location: { select: { slug: true } } },
  });
  const coveredEmirateSlugs = new Set(coveredEmirates.map((item) => item.location.slug));
  const related = await getRelatedServices(parseJson<string[]>(row.relatedServiceSlugs, []), locale);
  const faqs = parseFaqJson(row.t.faq);
  const serviceFaq = await getServiceFaqBySlug(serviceFaqSlug(row.slug), locale);
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
  const wa =
    locale === "ar"
      ? `مرحباً ${brandName("ar")}، أحتاج ${row.t.name}.`
      : `Hello ${brandName("en")}, I need ${row.t.name}.`;
  const publicPath = `/${servicePathSlug(locale, row.slug)}`;

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[
            { href: "/", label: nav("home") },
            { href: "/services", label: t("title") },
            { href: publicPath, label: row.t.name },
          ]}
        />
      }
    >
      <JsonLd data={serviceJsonLd({ name: row.t.name, description: row.t.shortDescription, path: publicPath, locale })} />
      <JsonLd
        data={reviewAggregateJsonLd({
          name: row.t.name,
          path: publicPath,
          locale,
          average: reviewSummary.average || 0,
          count: reviewSummary.count,
          reviews: approvedReviews.map((item) => toPublicReview(item, locale)),
        })}
      />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: row.t.name, path: publicPath }], locale)} />
      <JsonLd data={faqJsonLd(faqs)} />

      <PublicHero locale={locale}
        kicker={t("title")}
        title={row.t.name}
        lead={row.t.shortDescription}
        icon={Icon}
        heroImage={row.heroImage}
        shareUrl={publicCanonical(locale, publicPath)}
        shareLabel={home("share")}
        copiedLabel={home("copied")}
        actions={<CtaRow labels={ctaLabels} whatsappText={wa} />}
      />

      {row.slug === "electrical-maintenance" ? (
        <Section>
          <TopElectricalServices
            locale={locale}
            title={locale === "ar" ? "خدمات الكهرباء للبدء" : "Electrical services to start with"}
            lead={
              locale === "ar"
                ? "اختر الخدمة الأقرب للعَرَض: فحص، تحديد عطل، مقبس، مفتاح، إنارة، تمديدات، أو لوحة التوزيع."
                : "Choose the service closest to the symptom: inspection, fault finding, a socket, a switch, a light, wiring, or the distribution board."
            }
            cta={home("viewService")}
          />
        </Section>
      ) : null}

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

      {guides.length ? (
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

      {serviceFaq ? (
        <Section tone="sand">
          <SectionHeader title={t("faq")} />
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">{serviceFaq.t.excerpt}</p>
          <Link href={`/faq/${serviceFaq.slug}`} className="mt-4 inline-block text-sm font-semibold text-navy underline">
            {locale === "ar" ? "افتح صفحة الأسئلة الخاصة بهذه الخدمة" : "Open the FAQ page for this service"}
          </Link>
        </Section>
      ) : faqs.length ? (
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
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {locale === "ar"
            ? "نخدم الإمارات السبع و277 مكاناً. اختر الإمارة، ثم اذكر المدينة أو المنطقة في الطلب."
            : "We serve the seven emirates and 277 places. Choose the emirate, then name the city or area on the request."}
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {emirates.map((em) => (
            <li key={em.slug}>
              <LocationCard
                slug={em.slug}
                name={em.t.name}
                note={`${row.t.name} — ${em.t.name}`}
                href={
                  coveredEmirateSlugs.has(em.slug)
                    ? serviceLocationHref(locale, row.slug, em.slug)
                    : locationPageHref(locale, em.slug)
                }
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
