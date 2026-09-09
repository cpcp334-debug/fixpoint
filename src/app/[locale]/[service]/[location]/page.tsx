import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isReservedSlug } from "@/config/reserved-slugs";
import { publicServiceLocationWhere, resolveServiceLocationPage } from "@/lib/catalog";
import { prisma } from "@/server/db";
import { buildMetadata } from "@/lib/seo";
import { getApprovedServiceReviews, summarizeApprovedServiceReviews, toPublicReview } from "@/lib/reviews";
import { ServiceLocationView } from "@/components/service-location/ServiceLocationView";

/** Bound SSG to published covered pairs only — never cartesian expand. */
export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const rows = await prisma.serviceLocation.findMany({
      where: publicServiceLocationWhere,
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
  const model = await resolveServiceLocationPage({ serviceSlug: service, locationSlug: location, locale });
  if (!model) return { robots: { index: false, follow: false } };
  const languages: Record<string, string> = {};
  if (model.hreflang.en) languages.en = model.hreflang.en;
  if (model.hreflang.ar) languages.ar = model.hreflang.ar;
  return buildMetadata({
    locale,
    title: model.seoTitle,
    description: model.metaDescription,
    path: model.path,
    index: model.localeIndexable,
    languages: Object.keys(languages).length ? languages : undefined,
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
  const model = await resolveServiceLocationPage({ serviceSlug: service, locationSlug: location, locale });
  if (!model) notFound();

  const t = await getTranslations("Services");
  const loc = await getTranslations("Locations");
  const nav = await getTranslations("Nav");
  const cta = await getTranslations("Cta");
  const home = await getTranslations("Home");

  const [reviewSummary, approvedReviews] = await Promise.all([
    summarizeApprovedServiceReviews({ serviceId: model.serviceId, locationId: model.locationId }),
    getApprovedServiceReviews({ serviceId: model.serviceId, locationId: model.locationId, take: 10 }),
  ]);

  return (
    <ServiceLocationView
      model={model}
      labels={{
        breadcrumb: nav("breadcrumb"),
        home: nav("home"),
        local: loc("local"),
        overview: t("overview"),
        faq: t("faq"),
        aeo: locale === "ar" ? "أسئلة شائعة سريعة" : "Quick answers",
        diy: locale === "ar" ? "دليل DIY" : "DIY guide",
        geo: locale === "ar" ? "المنطقة" : "Area context",
        relatedServices: locale === "ar" ? "خدمات ذات صلة" : "Related services",
        relatedLocations: locale === "ar" ? "مناطق ذات صلة" : "Related areas",
        quote: cta("quote"),
        book: cta("book"),
        inspect: cta("inspect"),
        whatsapp: cta("whatsapp"),
        call: cta("call"),
        share: home("share"),
        copied: home("copied"),
        ctaTitle: home("ctaTitle"),
        ctaBody: home("ctaBody"),
        ctaQuote: home("ctaQuote"),
        ctaAi: home("ctaAi"),
        emergency: locale === "ar" ? "طوارئ" : "Emergency",
        amc: "AMC",
      }}
      reviewSummary={reviewSummary ? { average: reviewSummary.average ?? 0, count: reviewSummary.count } : undefined}
      approvedReviews={approvedReviews.map((item) => toPublicReview(item, locale))}
    />
  );
}
