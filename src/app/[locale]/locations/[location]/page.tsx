import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getActiveServices, getEmirateBySlug, getGlobalFaqs } from "@/lib/catalog";
import { prisma } from "@/server/db";
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

export async function generateStaticParams() {
  try {
    const rows = await prisma.location.findMany({
      where: { type: "emirate", status: "active", indexable: true },
      select: { slug: true },
    });
    return rows.map((row) => ({ location: row.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; location: string }>;
}) {
  const { locale, location } = await params;
  const em = await getEmirateBySlug(location, locale);
  if (!em) return {};
  return buildMetadata({
    locale,
    title: em.t.seoTitle,
    description: em.t.metaDescription,
    path: `/locations/${em.slug}`,
  });
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ locale: string; location: string }>;
}) {
  const { locale, location } = await params;
  setRequestLocale(locale);
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
  const wa = `Hello ALNAJAH ALDAEM, I need service in ${em.t.name}.`;

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[
            { href: "/", label: nav("home") },
            { href: "/locations", label: t("title") },
            { href: `/locations/${em.slug}`, label: em.t.name },
          ]}
        />
      }
    >
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: em.t.name, path: `/locations/${em.slug}` }], locale)} />
      <JsonLd data={faqJsonLd(faqs)} />

      <PublicHero
        kicker={t("title")}
        title={em.t.name}
        lead={em.t.intro}
        icon={IconMap}
        shareUrl={publicCanonical(locale, `/locations/${em.slug}`)}
        shareLabel={home("share")}
        copiedLabel={home("copied")}
        actions={<CtaRow labels={ctaLabels} whatsappText={wa} />}
      />

      <Section tone="sand">
        <div className="grid gap-4">
          <ProseCard title={t("local")}>{em.t.localServiceInfo}</ProseCard>
          <ProseCard title={t("properties")}>{em.t.propertyTypes}</ProseCard>
          <ProseCard title={t("nearby")}>{em.t.nearbyAreas}</ProseCard>
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
              href={`/${service.slug}/${em.slug}`}
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
