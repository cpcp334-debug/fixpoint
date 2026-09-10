import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { buildApprovedNavTree, getNavCategory, getNavCategoryLocalized } from "@/lib/catalog/approved-nav";
import { getServiceBySlug } from "@/lib/catalog";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Section, SectionHeader } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaBand } from "@/components/public/CtaBand";
import { CategoryChildGrid } from "@/components/catalog/CategoryChildGrid";

export async function generateStaticParams() {
  return buildApprovedNavTree().map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  const cat = getNavCategory(category);
  if (!cat) return {};
  const loc = getNavCategoryLocalized(cat, locale);
  return buildMetadata({
    locale,
    title: `${loc.name} | ALNAJAH ALDAEM`,
    description: loc.description,
    path: `/services/${cat.slug}`,
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  setRequestLocale(locale);
  const cat = getNavCategory(category);
  if (!cat) notFound();

  const t = await getTranslations("Category");
  const nav = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");
  const loc = getNavCategoryLocalized(cat, locale);

  const childrenWithNames = await Promise.all(
    cat.children.map(async (child) => {
      const svc = await getServiceBySlug(child.slug, locale);
      let name = child.nameEn;
      let description = cat.descriptionEn;
      if (locale === "ar") {
        const arName = svc?.translations?.find((x) => x.locale === "ar")?.name;
        const arDesc = svc?.translations?.find((x) => x.locale === "ar")?.shortDescription;
        name = arName && /[\u0600-\u06FF]/.test(arName) ? arName : t("serviceFallback", { slug: child.slug });
        description =
          arDesc && /[\u0600-\u06FF]/.test(arDesc) ? arDesc : cat.descriptionAr;
      } else if (svc?.t) {
        name = svc.t.name || child.nameEn;
        description = svc.t.shortDescription || cat.descriptionEn;
      }
      return {
        slug: child.slug,
        href: child.href,
        name,
        description,
      };
    }),
  );

  const aeo = [
    {
      q: t("aeoWhatQ", { category: loc.name }),
      a: t("aeoWhatA", { category: loc.name, count: cat.childCount }),
    },
    { q: t("aeoBookQ"), a: t("aeoBookA") },
    { q: t("aeoCoverQ"), a: t("aeoCoverA") },
  ];

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[
            { href: "/", label: nav("home") },
            { href: "/services", label: nav("services") },
            { href: cat.href, label: loc.name },
          ]}
        />
      }
    >
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
            { name: loc.name, path: cat.href },
          ],
          locale,
        )}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: loc.name,
          description: loc.description,
          numberOfItems: cat.childCount,
        }}
      />
      <JsonLd data={faqJsonLd(aeo.map((x) => ({ q: x.q, a: x.a })))} />

      <PublicHero title={loc.name} lead={loc.description} kicker={loc.childCountLabel} />

      {cat.isCategoryOnlyHub ? (
        <Section>
          <p className="text-sm text-muted">{t("hubNote")}</p>
        </Section>
      ) : cat.anchorSlug ? (
        <Section>
          <p className="text-sm">
            <Link href={`/${cat.anchorSlug}`} className="font-medium text-accent">
              {t("viewOverview", { name: loc.name })}
            </Link>
          </p>
        </Section>
      ) : null}

      <Section tone="sand">
        <SectionHeader title={t("childrenTitle")} lead={t("childrenLead", { count: cat.childCount })} />
        <div className="mt-6">
          <CategoryChildGrid
            items={childrenWithNames}
            searchPlaceholder={t("searchPlaceholder")}
            emptyLabel={t("searchEmpty")}
            cta={home("viewService")}
          />
        </div>
      </Section>

      <Section>
        <SectionHeader title={t("aeoTitle")} />
        <div className="mt-6 grid gap-3">
          {aeo.map((block) => (
            <article key={block.q} className="rounded-md border border-line bg-white p-4">
              <h3 className="font-medium text-navy">{block.q}</h3>
              <p className="mt-2 text-sm text-muted">{block.a}</p>
            </article>
          ))}
        </div>
      </Section>

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
