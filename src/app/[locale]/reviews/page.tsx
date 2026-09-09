import { getTranslations, setRequestLocale } from "next-intl/server";
import { getActiveEmirates, getActiveServices } from "@/lib/catalog";
import { getApprovedServiceReviews, summarizeApprovedServiceReviews, toPublicReview } from "@/lib/reviews";
import { breadcrumbJsonLd, buildMetadata, reviewAggregateJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { ReviewForm } from "@/components/trust/ReviewForm";
import { ReviewList } from "@/components/trust/ReviewList";
import { ReviewSummary } from "@/components/trust/ReviewSummary";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { fieldControlClass, fieldLabelClass } from "@/components/public/FormShell";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaBand } from "@/components/public/CtaBand";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ReviewsPage" });
  return buildMetadata({
    locale,
    title: `${t("title")} | ALNAJAH ALDAEM`,
    description: t("lead"),
    path: "/reviews",
  });
}

export default async function ReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ service?: string; location?: string; stars?: string; verified?: string }>;
}) {
  const { locale } = await params;
  const filters = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("ReviewsPage");
  const trust = await getTranslations("Trust");
  const nav = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");
  const services = await getActiveServices(locale);
  const emirates = await getActiveEmirates(locale);
  const service = filters.service ? services.find((s) => s.slug === filters.service) : undefined;
  const location = filters.location ? emirates.find((e) => e.slug === filters.location) : undefined;
  const minStars = Number(filters.stars || 0) || undefined;
  const verifiedOnly = filters.verified === "1";
  const [summary, rows] = await Promise.all([
    summarizeApprovedServiceReviews({ serviceId: service?.id, locationId: location?.id }),
    getApprovedServiceReviews({
      serviceId: service?.id,
      locationId: location?.id,
      minStars,
      verifiedOnly,
    }),
  ]);
  const unfiltered = !service && !location && !minStars && !verifiedOnly;
  const reviews = rows.map((row) => toPublicReview(row, locale));
  const filteredSummary = {
    count: reviews.length,
    average: reviews.length ? reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length : null,
  };

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[{ href: "/", label: nav("home") }, { href: "/reviews", label: t("title") }]}
        />
      }
    >
      <JsonLd
        data={
          unfiltered
            ? reviewAggregateJsonLd({
                name: t("title"),
                path: "/reviews",
                locale,
                average: summary.average || 0,
                count: summary.count,
                reviews,
              })
            : null
        }
      />
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: "Home", path: "/" },
            { name: "Reviews", path: "/reviews" },
          ],
          locale,
        )}
      />

      <PublicHero kicker={t("title")} title={t("title")} lead={t("lead")} compact />

      <Section>
        <form method="get" className="grid gap-4 rounded-xl border border-line bg-sand p-5 sm:grid-cols-2">
          <p className="text-sm font-medium text-navy sm:col-span-2">{t("filters")}</p>
          <div>
            <label className={fieldLabelClass} htmlFor="rev-filter-service">
              {t("allServices")}
            </label>
            <select
              id="rev-filter-service"
              name="service"
              defaultValue={filters.service || ""}
              className={fieldControlClass}
            >
              <option value="">{t("allServices")}</option>
              {services.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={fieldLabelClass} htmlFor="rev-filter-location">
              {t("allLocations")}
            </label>
            <select
              id="rev-filter-location"
              name="location"
              defaultValue={filters.location || ""}
              className={fieldControlClass}
            >
              <option value="">{t("allLocations")}</option>
              {emirates.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={fieldLabelClass} htmlFor="rev-filter-stars">
              {t("allRatings")}
            </label>
            <select id="rev-filter-stars" name="stars" defaultValue={filters.stars || ""} className={fieldControlClass}>
              <option value="">{t("allRatings")}</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {t("starsMin", { n })}
                </option>
              ))}
            </select>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm text-navy">
            <input type="checkbox" name="verified" value="1" defaultChecked={verifiedOnly} />
            {t("verifiedOnly")}
          </label>
          <Button type="submit" variant="secondary" className="sm:col-span-2">
            {t("apply")}
          </Button>
        </form>
        <div className="mt-8">
          <ReviewSummary
            count={filteredSummary.count}
            average={filteredSummary.average}
            labels={{
              title: trust("reviewsTitle"),
              empty: t("empty"),
              basedOn: trust("basedOn", { count: filteredSummary.count }),
            }}
          />
          <ReviewList
            reviews={reviews}
            labels={{
              verified: trust("verified"),
              response: trust("response"),
              helpful: trust("helpful"),
              report: trust("report"),
              thanks: trust("actionThanks"),
            }}
          />
        </div>
        <ReviewForm
          locale={locale}
          type="service"
          serviceSlug={service?.slug}
          locationSlug={location?.slug}
          labels={{
            title: trust("writeReview"),
            disclaimer: trust("serviceDisclaimer"),
            name: trust("name"),
            stars: trust("stars"),
            reviewTitle: trust("reviewTitle"),
            body: trust("body"),
            area: trust("area"),
            photo: trust("photo"),
            submit: trust("submitReview"),
            thanks: trust("reviewThanks"),
            error: trust("error"),
          }}
        />
      </Section>

      <CtaBand
        title={home("ctaTitle")}
        body={home("ctaBody")}
        quote={home("ctaQuote")}
        ai={home("ctaAi")}
        whatsapp={cta("whatsapp")}
        aiHref={`/${locale}#alnajah-ai`}
      />
    </PageShell>
  );
}
