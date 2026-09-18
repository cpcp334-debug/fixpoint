import { brandName } from "@/config/site";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { buildApprovedNavTree, getNavCategory, getNavCategoryLocalized } from "@/lib/catalog/approved-nav";
import { getApprovedCatalogServiceBySlug, getServiceBySlug } from "@/lib/catalog";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Section, SectionHeader } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaBand } from "@/components/public/CtaBand";
import { CategoryChildGrid } from "@/components/catalog/CategoryChildGrid";
import { TopElectricalServices } from "@/components/catalog/TopElectricalServices";
import { TOP_ELECTRICAL_SLUGS } from "../../../../../prisma/data/electrical-service-copy";
import { listPageHref, PrevNextPagination } from "@/components/ui/PrevNextPagination";
import { serviceHref } from "@/lib/slug/locale-slug";

const CHILD_PAGE_SIZE = 6;

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
    title: `${loc.name} | ${brandName(locale)}`,
    description: loc.description,
    path: `/services/${cat.slug}`,
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { locale, category } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const cat = getNavCategory(category);
  if (!cat) notFound();

  const t = await getTranslations("Category");
  const nav = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");
  const pager = await getTranslations("Pagination");
  const loc = getNavCategoryLocalized(cat, locale);

  const anchorPublished = cat.anchorSlug ? Boolean(await getServiceBySlug(cat.anchorSlug, locale)) : false;
  const childrenWithNames = await Promise.all(
    cat.children.map(async (child) => {
      const svc = await getApprovedCatalogServiceBySlug(child.slug, locale);
      let name = child.nameEn;
      let description = locale === "ar" ? cat.descriptionAr : cat.descriptionEn;
      if (svc) {
        name = svc.t.name || child.nameEn;
        description = svc.t.shortDescription || (locale === "ar" ? cat.descriptionAr : cat.descriptionEn);
      } else if (locale === "ar") {
        name = t("serviceFallback", { slug: child.slug });
      }
      return {
        slug: svc?.slug || child.slug,
        href: serviceHref(locale, svc?.slug || child.slug),
        name,
        description,
      };
    }),
  );

  const sortedChildren =
    cat.slug === "electrical"
      ? [...childrenWithNames].sort((a, b) => {
          const rank = (slug: string) => {
            const i = TOP_ELECTRICAL_SLUGS.indexOf(slug as (typeof TOP_ELECTRICAL_SLUGS)[number]);
            return i === -1 ? 100 : i;
          };
          return rank(a.slug) - rank(b.slug);
        })
      : childrenWithNames;

  const q = sp.q?.trim().toLowerCase() || "";
  const qParam = sp.q?.trim() || undefined;
  const filtered = q
    ? sortedChildren.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q),
      )
    : sortedChildren;

  const totalPages = Math.max(1, Math.ceil(filtered.length / CHILD_PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Number(sp.page || "1") || 1));
  const pageItems = filtered.slice((page - 1) * CHILD_PAGE_SIZE, page * CHILD_PAGE_SIZE);
  const categoryPath = `/services/${cat.slug}`;

  const aeo = [
    {
      q: t("aeoWhatQ", { category: loc.name }),
      a: t("aeoWhatA", { category: loc.name, count: childrenWithNames.length }),
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
          numberOfItems: childrenWithNames.length,
        }}
      />
      <JsonLd data={faqJsonLd(aeo.map((x) => ({ q: x.q, a: x.a })))} />

      <PublicHero locale={locale} title={loc.name} lead={loc.description} kicker={loc.childCountLabel} />

      {cat.slug === "electrical" ? (
        <Section>
          <TopElectricalServices
            locale={locale}
            title={t("topElectricalTitle")}
            lead={t("topElectricalLead")}
            cta={home("viewService")}
          />
        </Section>
      ) : null}

      {cat.isCategoryOnlyHub ? (
        <Section>
          <p className="text-sm text-muted">{t("hubNote")}</p>
        </Section>
      ) : cat.anchorSlug && anchorPublished ? (
        <Section>
          <p className="text-sm">
            <Link href={`/${cat.anchorSlug}`} className="font-medium text-accent">
              {t("viewOverview", { name: loc.name })}
            </Link>
          </p>
        </Section>
      ) : null}

      <Section tone="sand">
        <SectionHeader title={t("childrenTitle")} lead={t("childrenLead", { count: childrenWithNames.length })} />
        <div className="mt-6">
          <CategoryChildGrid
            items={pageItems}
            searchPlaceholder={t("searchPlaceholder")}
            emptyLabel={t("searchEmpty")}
            cta={home("viewService")}
            query={sp.q?.trim() || ""}
            filterLabel={pager("filter")}
          />
        </div>
        <PrevNextPagination
          currentPage={page}
          totalPages={totalPages}
          previousHref={page > 1 ? listPageHref(categoryPath, page - 1, { q: qParam }) : null}
          nextHref={page < totalPages ? listPageHref(categoryPath, page + 1, { q: qParam }) : null}
          previousLabel={pager("previous")}
          nextLabel={pager("next")}
          pageOfLabel={pager("pageOf", { current: page, total: totalPages })}
        />
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
