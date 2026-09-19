import { brandName, getSiteUrl } from "@/config/site";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getActiveServices, getEmirateBySlug, getGlobalFaqs, getPublishedLocation } from "@/lib/catalog";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FaqList } from "@/components/ui/Blocks";
import { ServiceTrustBlock } from "@/components/trust/ServiceTrustBlock";
import { normalizeFaqItems, parseFaqJson } from "@/lib/faq";
import { EmptyState, Section, SectionHeader } from "@/components/ui/Section";
import { ServiceCard } from "@/components/home/Cards";
import { IconMap } from "@/components/ui/Icon";
import { PageShell, ProseCard } from "@/components/public/PageShell";
import { PublicHero, publicCanonical } from "@/components/public/PublicHero";
import { CtaRow } from "@/components/public/CtaRow";
import { CtaBand } from "@/components/public/CtaBand";
import { EmiratePlaceDirectory } from "@/components/locations/EmiratePlaceDirectory";
import { ArPublicSlugNormalize } from "@/components/public/ArPublicSlugNormalize";
import { serviceLocationHref, locationPageHref, locationPathSlug } from "@/lib/slug/locale-slug";
import { renderArticleBody } from "@/components/content/ArticleBody";

/**
 * Avoid year-long sticky notFound() after slug migrations.
 * Empty params: do not SSG every community at build (Hostinger OOM / long MySQL window).
 * dual-slug still works via locationLookupCandidates + dynamicParams.
 */
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

function hubCoverAndAlt(slug: string, locale: string, name: string, emirateName: string) {
  const s = slug.toLowerCase();
  let cover = "/media/topics/general.webp";
  if (/industrial|musaffah|sajaa|quoz|warsan/.test(s)) cover = "/media/topics/electrical.webp";
  else if (/marina|island|palm|beach|harbour|harbor|aqah|creek/.test(s)) cover = "/media/topics/pool.webp";
  else if (/hills|ranch|gardens|village|estate/.test(s)) cover = "/media/topics/cleaning.webp";
  else if (s.includes("abu-dhabi") || s.includes("khalifa") || s.includes("saadiyat")) cover = "/media/topics/ac.webp";
  else if (s.includes("fujairah") || s.includes("dibba")) cover = "/media/topics/plumbing.webp";
  else if (s.includes("sharjah") || s.includes("sajaa")) cover = "/media/topics/walls.webp";
  return {
    cover,
    alt:
      locale === "ar"
        ? `صورة توضيحية لمنطقة خدمة الصيانة في ${name}${emirateName ? `، ${emirateName}` : ""}`
        : `Maintenance service area illustration for ${name}${emirateName ? `, ${emirateName}` : ""}`,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; location: string }>;
}) {
  const { locale, location } = await params;
  const place = await getPublishedLocation(location, locale);
  if (!place) return {};
  const site = getSiteUrl();
  const enPath = locationPageHref("en", place.slug);
  const arPath = locationPageHref("ar", place.slug);
  return buildMetadata({
    locale,
    title: place.t.seoTitle || `${place.t.name} | ${brandName(locale)}`,
    description: place.t.metaDescription || place.t.intro,
    path: locationPageHref(locale, place.slug),
    index: place.indexable,
    languages: {
      en: `${site}/en${enPath}`,
      ar: `${site}/ar${arPath}`,
    },
  });
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ locale: string; location: string }>;
}) {
  const { locale, location } = await params;
  setRequestLocale(locale);
  const published = await getPublishedLocation(location, locale);
  if (!published) notFound();
  if (published.type !== "emirate") {
    return <PublishedPlacePage locale={locale} place={published} />;
  }
  const em = await getEmirateBySlug(location, locale);
  if (!em) notFound();
  const t = await getTranslations("Locations");
  const nav = await getTranslations("Nav");
  const cta = await getTranslations("Cta");
  const home = await getTranslations("Home");
  const servicesT = await getTranslations("Services");
  const services = await getActiveServices(locale);
  const faqs = parseFaqJson(em.t.faq);
  const global = await getGlobalFaqs(locale);
  const faqItems = normalizeFaqItems([...faqs, ...global]);
  const ctaLabels = {
    quote: cta("quote"),
    book: cta("book"),
    inspect: cta("inspect"),
    whatsapp: cta("whatsapp"),
    call: cta("call"),
  };
  const wa =
    locale === "ar"
      ? `مرحباً ${brandName("ar")}، أحتاج خدمة في ${em.t.name}.`
      : `Hello ${brandName("en")}, I need service in ${em.t.name}.`;
  const publicLoc = locationPathSlug(locale, em.slug);

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[
            { href: "/", label: nav("home") },
            { href: "/locations", label: t("title") },
            { href: `/locations/${publicLoc}`, label: em.t.name },
          ]}
        />
      }
    >
      <ArPublicSlugNormalize locale={locale} preferredSegment={publicLoc} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: em.t.name, path: `/locations/${publicLoc}` }], locale)} />
      <JsonLd data={faqJsonLd(faqs)} />

      <PublicHero locale={locale}
        kicker={t("title")}
        title={em.t.name}
        lead={em.t.intro}
        icon={IconMap}
        shareUrl={publicCanonical(locale, `/locations/${publicLoc}`)}
        shareLabel={home("share")}
        copiedLabel={home("copied")}
        actions={<CtaRow labels={ctaLabels} whatsappText={wa} />}
        {...(() => {
          const media = hubCoverAndAlt(em.slug, locale, em.t.name, em.t.name);
          return { heroImage: media.cover, imageAlt: media.alt };
        })()}
      />

      <Section tone="sand">
        <div className="grid gap-4">
          {em.t.localServiceInfo?.includes("## ") ? (
            <div className="prose-article rounded-xl border border-line bg-white p-5 sm:p-8">
              {renderArticleBody(em.t.localServiceInfo)}
            </div>
          ) : (
            <ProseCard title={t("local")}>{em.t.localServiceInfo}</ProseCard>
          )}
          {em.t.propertyTypes ? <ProseCard title={t("properties")}>{em.t.propertyTypes}</ProseCard> : null}
          {em.t.nearbyAreas ? <ProseCard title={t("nearby")}>{em.t.nearbyAreas}</ProseCard> : null}
          <EmiratePlaceDirectory
            emirateSlug={em.slug}
            locale={locale}
            title={t("directoryTitle")}
            lead={t("directoryLead")}
            citiesLabel={t("cities")}
            areasLabel={t("areas")}
            note={t("directoryNote")}
          />
        </div>
      </Section>

      <Section>
        <SectionHeader title={t("services")} />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard
              key={service.slug}
              slug={service.slug}
              name={service.t.name}
              description={service.t.shortDescription}
              cta={home("viewService")}
              href={serviceLocationHref(locale, service.slug, em.slug)}
              diyLabel={service.diyAvailable ? home("chipDiy") : undefined}
              amcLabel={service.amcAvailable ? home("chipAmc") : undefined}
              emergencyLabel={service.emergencyAvailable ? home("chipEmergency") : undefined}
            />
          ))}
        </div>
      </Section>

      <Section tone="sand">
        <SectionHeader title={t("projects")} />
        <div className="mt-6">
          <EmptyState body={t("projectsEmpty")} />
        </div>
      </Section>

      <Section>
        <ServiceTrustBlock locale={locale} locationId={em.id} locationSlug={em.slug} />
      </Section>

      {faqItems.length ? (
        <Section>
          <SectionHeader title={servicesT("faq")} />
          <div className="mt-6">
            <FaqList items={faqItems} />
          </div>
        </Section>
      ) : null}

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

async function PublishedPlacePage({
  locale,
  place,
}: {
  locale: string;
  place: NonNullable<Awaited<ReturnType<typeof getPublishedLocation>>>;
}) {
  const t = await getTranslations("Locations");
  const nav = await getTranslations("Nav");
  const cta = await getTranslations("Cta");
  const home = await getTranslations("Home");
  const ctaLabels = {
    quote: cta("quote"),
    book: cta("book"),
    inspect: cta("inspect"),
    whatsapp: cta("whatsapp"),
    call: cta("call"),
  };
  const parent = place.parent;
  const emirate = place.parent?.type === "emirate" ? place.parent : place.parent?.parent?.type === "emirate" ? place.parent.parent : null;
  const emirateName = emirate ? pickName(emirate.translations, locale) : "";
  const parentName = parent ? pickName(parent.translations, locale) : "";
  const wa =
    locale === "ar"
      ? `مرحباً ${brandName("ar")}، أحتاج خدمة في ${place.t.name}${emirateName ? `، ${emirateName}` : ""}.`
      : `Hello ${brandName("en")}, I need service in ${place.t.name}${emirateName ? `, ${emirateName}` : ""}.`;
  const crumbs = [
    { href: "/", label: nav("home") },
    { href: "/locations", label: t("title") },
  ];
  if (emirate) crumbs.push({ href: locationPageHref(locale, emirate.slug), label: emirateName });
  if (parent && parent.slug !== emirate?.slug) crumbs.push({ href: locationPageHref(locale, parent.slug), label: parentName });
  crumbs.push({ href: locationPageHref(locale, place.slug), label: place.t.name });

  const servicesT = await getTranslations("Services");
  const faqs = parseFaqJson(place.t.faq);
  const global = await getGlobalFaqs(locale);
  const faqItems = normalizeFaqItems([...faqs, ...global]);
  const media = hubCoverAndAlt(place.slug, locale, place.t.name, emirateName);
  const hasHubBody = (place.t.localServiceInfo || "").includes("## ");
  const publicLoc = locationPathSlug(locale, place.slug);

  return (
    <PageShell
      breadcrumbs={<Breadcrumbs label={nav("breadcrumb")} items={crumbs} />}
    >
      <ArPublicSlugNormalize locale={locale} preferredSegment={publicLoc} />
      <JsonLd data={breadcrumbJsonLd(crumbs.map((item) => ({ name: item.label, path: item.href })), locale)} />
      {faqs.length ? <JsonLd data={faqJsonLd(faqs)} /> : null}
      <PublicHero locale={locale}
        kicker={emirateName || t("title")}
        title={place.t.name}
        lead={place.t.intro || (locale === "ar"
          ? `${place.t.name} من الأماكن الـ 277 التي نخدمها${emirateName ? ` في ${emirateName}` : ""}.`
          : `${place.t.name} is one of the 277 places we serve${emirateName ? ` in ${emirateName}` : ""}.`)}
        icon={IconMap}
        shareUrl={publicCanonical(locale, locationPageHref(locale, place.slug))}
        shareLabel={home("share")}
        copiedLabel={home("copied")}
        actions={<CtaRow labels={ctaLabels} whatsappText={wa} />}
        heroImage={media.cover}
        imageAlt={media.alt}
      />
      <Section tone="sand">
        {hasHubBody ? (
          <div className="prose-article max-w-3xl rounded-xl border border-line bg-white p-5 sm:p-8">
            {renderArticleBody(place.t.localServiceInfo)}
          </div>
        ) : (
          <p className="max-w-3xl text-sm leading-6 text-muted">{t("directoryNote")}</p>
        )}
        {place.t.propertyTypes ? (
          <div className="mt-6 max-w-3xl">
            <ProseCard title={t("properties")}>{place.t.propertyTypes}</ProseCard>
          </div>
        ) : null}
        {place.t.nearbyAreas ? (
          <div className="mt-4 max-w-3xl">
            <ProseCard title={t("nearby")}>{place.t.nearbyAreas}</ProseCard>
          </div>
        ) : null}
        {parent ? (
          <p className="mt-4 text-sm">
            <Link href={locationPageHref(locale, parent.slug)} className="font-medium text-accent">
              {parentName}
            </Link>
          </p>
        ) : null}
        {emirate ? (
          <div className="mt-6">
            <EmiratePlaceDirectory
              emirateSlug={emirate.slug}
              locale={locale}
              title={t("directoryTitle")}
              lead={t("directoryLead")}
              citiesLabel={t("cities")}
              areasLabel={t("areas")}
              note={t("directoryNote")}
            />
          </div>
        ) : null}
      </Section>
      {faqItems.length ? (
        <Section>
          <SectionHeader title={servicesT("faq")} />
          <div className="mt-6">
            <FaqList items={faqItems} />
          </div>
        </Section>
      ) : null}
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

function pickName(translations: Array<{ locale: string; name: string }>, locale: string) {
  const row = translations.find((item) => item.locale === locale) || translations.find((item) => item.locale === "en");
  if (!row || row.name === "REVIEW_REQUIRED") return translations.find((item) => item.locale === "en")?.name || "";
  return row.name;
}
