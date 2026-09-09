import { getTranslations, setRequestLocale } from "next-intl/server";
import { getActiveServices } from "@/lib/catalog";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Section } from "@/components/ui/Section";
import { ServiceCard } from "@/components/home/Cards";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaBand } from "@/components/public/CtaBand";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Services" });
  return buildMetadata({ locale, title: `${t("title")} | ALNAJAH ALDAEM`, description: t("lead"), path: "/services" });
}

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Services");
  const nav = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");
  const services = await getActiveServices(locale);

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[{ href: "/", label: nav("home") }, { href: "/services", label: t("title") }]}
        />
      }
    >
      <PublicHero title={t("title")} lead={t("lead")} compact={!services.length} />

      {services.length ? (
        <Section>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard
                key={service.slug}
                slug={service.slug}
                name={service.t.name}
                description={service.t.shortDescription}
                cta={home("viewService")}
                diyLabel={service.diyAvailable ? home("chipDiy") : undefined}
                amcLabel={service.amcAvailable ? home("chipAmc") : undefined}
                emergencyLabel={service.emergencyAvailable ? home("chipEmergency") : undefined}
              />
            ))}
          </div>
        </Section>
      ) : null}

      <CtaBand
        title={home("ctaTitle")}
        body={home("ctaBody")}
        quote={home("ctaQuote")}
        ai={home("ctaAi")}
        whatsapp={cta("whatsapp")}
      />
    </PageShell>
  );
}
