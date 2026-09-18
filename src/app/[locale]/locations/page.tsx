import { brandName } from "@/config/site";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getActiveEmirates } from "@/lib/catalog";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Section } from "@/components/ui/Section";
import { LocationCard } from "@/components/home/Cards";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaBand } from "@/components/public/CtaBand";
import { locationPageHref, locationPathSlug } from "@/lib/slug/locale-slug";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Locations" });
  return buildMetadata({ locale, title: `${t("title")} | ${brandName(locale)}`, description: t("lead"), path: "/locations" });
}

export default async function LocationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Locations");
  const nav = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");
  const emirates = await getActiveEmirates(locale);

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[{ href: "/", label: nav("home") }, { href: "/locations", label: t("title") }]}
        />
      }
    >
      <PublicHero locale={locale} title={t("title")} lead={t("lead")} compact={!emirates.length} />

      <Section>
        <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {emirates.map((em) => {
            const publicSlug = locationPathSlug(locale, em.slug);
            return (
              <li key={em.slug}>
                <LocationCard
                  slug={publicSlug}
                  name={em.t.name}
                  note={home("areaEnquiry")}
                  href={locationPageHref(locale, em.slug)}
                />
              </li>
            );
          })}
        </ul>
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
