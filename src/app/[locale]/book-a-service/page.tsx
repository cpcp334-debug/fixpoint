import { toMasterLocationSlug } from "@/lib/slug/location-slug-map";
import { toMasterServiceSlug } from "@/lib/slug/service-slug-map";
import { serviceChoiceLabels } from "@/lib/catalog/service-choice-labels";
import { brandName } from "@/config/site";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getActiveEmirates, getActiveServices } from "@/lib/catalog";
import { parseBookingTypeParam, serviceAllowsBookingType } from "@/lib/bookings";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { BookingForm } from "@/components/forms/BookingForm";
import { Disclaimer } from "@/components/ui/Blocks";
import { cn } from "@/lib/utils";
import { Section } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaBand } from "@/components/public/CtaBand";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Booking" });
  return buildMetadata({ locale, title: `${t("title")} | ${brandName(locale)}`, description: t("lead"), path: "/book-a-service" });
}

const TYPE_HREF = [
  { type: "standard", href: "/book-a-service" },
  { type: "site_inspection", href: "/book-a-service?type=inspection" },
  { type: "emergency", href: "/book-a-service?type=emergency" },
  { type: "recurring_cleaning", href: "/book-a-service?type=recurring" },
  { type: "amc_visit", href: "/book-a-service?type=amc" },
] as const;

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string; service?: string | string[]; location?: string | string[] }>;
}) {
  const { locale } = await params;
  const { type: typeParam, service: requestedService, location: requestedLocation } = await searchParams;
  setRequestLocale(locale);
  const type = parseBookingTypeParam(typeParam);
  const t = await getTranslations("Booking");
  const q = await getTranslations("Quote");
  const err = await getTranslations("Errors");
  const nav = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");
  const allServices = await getActiveServices(locale);
  const services = allServices.filter((s) => serviceAllowsBookingType(s, type));
  const defaultService = typeof requestedService === "string"
    ? services.find((s) => toMasterServiceSlug(s.slug) === toMasterServiceSlug(requestedService))?.slug
    : undefined;
  const locations = await getActiveEmirates(locale);
  const locationSlug = typeof requestedLocation === "string" ? toMasterLocationSlug(requestedLocation) : undefined;
  const defaultLocation = locations.find((location) => location.slug === locationSlug)?.slug;
  const contextService = typeof requestedService === "string"
    ? allServices.find((service) => toMasterServiceSlug(service.slug) === toMasterServiceSlug(requestedService))
    : undefined;
  const bookingTypes = TYPE_HREF.map((item) => {
    const [path, search] = item.href.split("?");
    const query = new URLSearchParams(search);
    if (contextService && serviceAllowsBookingType(contextService, item.type)) {
      query.set("service", contextService.slug);
    }
    if (defaultLocation) query.set("location", defaultLocation);
    const params = query.toString();
    return { ...item, href: params ? `${path}?${params}` : path };
  });

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[{ href: "/", label: nav("home") }, { href: "/book-a-service", label: t("title") }]}
        />
      }
    >
      <PublicHero locale={locale} kicker={t("title")} title={t(`type_${type}_title`)} lead={t(`type_${type}_lead`)} compact />
      <Section>
        <Disclaimer>{t("notConfirmed")}</Disclaimer>
        <nav className="mt-6 flex flex-wrap gap-2" aria-label={t("types")}>
          {bookingTypes.map((item) => (
            <Link
              key={item.type}
              href={item.href}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full px-4 text-sm",
                item.type === type
                  ? "bg-navy text-white"
                  : "border border-line bg-white text-navy hover:border-navy/30",
              )}
            >
              {t(`type_${item.type}`)}
            </Link>
          ))}
        </nav>
        <div className="mt-8">
          <BookingForm
            locale={locale}
            type={type}
            defaultService={defaultService}
            defaultLocation={defaultLocation}
            services={serviceChoiceLabels(services.map((s) => ({
              slug: s.slug,
              name: s.t.name,
              englishName: s.translations.find((translation) => translation.locale === "en")?.name,
            })), locale)}
            locations={locations.map((s) => ({ slug: s.slug, name: s.t.name }))}
            labels={{
              name: q("name"),
              phone: q("phone"),
              whatsapp: t("whatsapp"),
              email: q("email"),
              service: q("service"),
              emirate: t("emirate"),
              city: t("city"),
              area: t("area"),
              property: q("property"),
              select: q("select"),
              villa: q("villa"),
              apartment: q("apartment"),
              office: q("office"),
              building: q("building"),
              other: q("other"),
              requirement: t("requirement"),
              preferredDate: t("date"),
              preferredTime: t("time"),
              frequency: t("frequency"),
              weekly: t("weekly"),
              biweekly: t("biweekly"),
              monthly: t("monthly"),
              amcReference: t("amcReference"),
              photo: t("photo"),
              submit: t("submit"),
              error: t("error"),
              rateLimit: err("rateLimit"),
              emergencyNote: t("emergencyNote"),
              requestNote: t("requestNote"),
            }}
          />
        </div>
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
