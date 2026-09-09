import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublishedDiyCategories } from "@/lib/catalog";
import { breadcrumbJsonLd, buildMetadata, collectionPageJsonLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { Disclaimer } from "@/components/ui/Blocks";
import { siteConfig } from "@/config/site";
import { Section, SectionHeader } from "@/components/ui/Section";
import { DiyCard } from "@/components/home/Cards";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaBand } from "@/components/public/CtaBand";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Diy" });
  return buildMetadata({
    locale,
    title: `${t("title")} | ALNAJAH ALDAEM`,
    description: t("lead"),
    path: "/diy",
  });
}

export default async function DiyIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Diy");
  const nav = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");
  const categories = await getPublishedDiyCategories(locale);

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[{ href: "/", label: nav("home") }, { href: "/diy", label: t("title") }]}
        />
      }
    >
      <JsonLd
        data={collectionPageJsonLd({
          name: t("title"),
          description: t("lead"),
          path: "/diy",
          locale,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: "Home", path: "/" },
            { name: "DIY", path: "/diy" },
          ],
          locale,
        )}
      />

      <PublicHero title={t("title")} lead={t("lead")} compact={!categories.length} />

      <Section>
        <Disclaimer>{siteConfig.disclaimers.diy[locale === "ar" ? "ar" : "en"]}</Disclaimer>
        <div className="mt-10 grid gap-12">
          {categories.map((category) => (
            <section key={category.slug}>
              <SectionHeader title={category.t.name} lead={category.t.description} />
              <ul className="mt-6 grid gap-4 md:grid-cols-2">
                {category.publishedGuides.map((guide) => (
                  <li key={guide.slug}>
                    <DiyCard
                      slug={guide.slug}
                      title={guide.t.title}
                      category={category.t.name}
                      difficulty={guide.t.difficulty || guide.difficulty}
                      time={guide.t.estimatedTime || guide.estimatedTime}
                      summary={guide.t.quickAnswer}
                      cta={home("readGuide")}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
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
