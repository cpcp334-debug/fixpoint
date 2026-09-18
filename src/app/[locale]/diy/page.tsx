import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getPublishedDiyCategories, getPublishedGuides } from "@/lib/catalog";
import { breadcrumbJsonLd, buildMetadata, collectionPageJsonLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { Disclaimer } from "@/components/ui/Blocks";
import { siteConfig, brandName } from "@/config/site";
import { EmptyState, Section, SectionHeader } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaBand } from "@/components/public/CtaBand";
import { DiyGuideGrid } from "@/components/diy/DiyGuideGrid";
import { ButtonLink } from "@/components/ui/Button";
import { IconArrow } from "@/components/ui/Icon";

/** Rebuild after MySQL import / publish — avoid empty SSG baked at first Hostinger build. */
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Diy" });
  return buildMetadata({
    locale,
    title: `${t("title")} | ${brandName(locale)}`,
    description: t("lead"),
    path: "/diy",
    index: true,
  });
}

function guideSortRank(risk: string) {
  if (risk === "green") return 0;
  if (risk === "yellow") return 1;
  return 2;
}

export default async function DiyIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Diy");
  const nav = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");

  const [categories, guides] = await Promise.all([
    getPublishedDiyCategories(locale),
    getPublishedGuides(locale),
  ]);

  const sortedGuides = [...guides].sort((a, b) => guideSortRank(a.riskLevel) - guideSortRank(b.riskLevel));
  const gridItems = sortedGuides.map((guide) => ({
    slug: guide.slug,
    title: guide.t.title,
    category: guide.categoryT?.name,
    difficulty: guide.t.difficulty || guide.difficulty,
    time: guide.t.estimatedTime || guide.estimatedTime,
    summary: guide.t.quickAnswer,
  }));

  const statsLabel = t("stats", { guides: guides.length, categories: categories.length });

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
        data={{
          ...collectionPageJsonLd({
            name: t("title"),
            description: t("lead"),
            path: "/diy",
            locale,
          }),
          numberOfItems: guides.length,
        }}
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

      <PublicHero
        locale={locale}
        title={t("title")}
        lead={t("lead")}
        compact
        meta={<p className="text-sm font-medium text-accent">{statsLabel}</p>}
        actions={
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/#alnajah-ai" variant="secondary">
              {nav("ai")}
            </ButtonLink>
            <ButtonLink href="/services">{nav("services")}</ButtonLink>
            <ButtonLink href="/get-a-quote">{nav("quote")}</ButtonLink>
          </div>
        }
      />

      <Section>
        <Disclaimer>{siteConfig.disclaimers.diy[locale === "ar" ? "ar" : "en"]}</Disclaimer>
      </Section>

      {guides.length ? (
        <Section tone="sand">
          <SectionHeader
            title={t("fullListTitle")}
            lead={t("fullListLead", { count: guides.length })}
          />
          <div className="mt-6">
            <DiyGuideGrid
              items={gridItems}
              searchPlaceholder={t("searchPlaceholder")}
              emptyLabel={t("searchEmpty")}
              cta={home("readGuide")}
            />
          </div>
        </Section>
      ) : (
        <Section tone="sand">
          <EmptyState title={t("emptyPageTitle")} body={t("emptyPageLead")} />
        </Section>
      )}

      {categories.length ? (
        <Section>
          <SectionHeader title={t("categoriesTitle")} lead={t("categoriesLead")} />
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/diy/${category.slug}`}
                  className="pass flex h-full flex-col rounded-xl border border-line bg-white p-5 transition-colors hover:border-accent/40"
                >
                  <h3 className="text-lg font-semibold text-navy">{category.t.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{category.t.description}</p>
                  <p className="mt-3 text-xs font-medium text-muted">
                    {t("guidesInCategory", { count: category.publishedGuides.length })}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">
                    {t("browseTopic")}
                    <IconArrow className="h-4 w-4 rtl:rotate-180" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section tone="sand">
        <SectionHeader title={t("whenProTitle")} lead={t("whenProBody")} />
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/get-a-quote">{home("ctaQuote")}</ButtonLink>
          <ButtonLink href="/#alnajah-ai" variant="secondary">
            {home("ctaAi")}
          </ButtonLink>
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
