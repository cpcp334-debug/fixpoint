import { brandName } from "@/config/site";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildVisitorNavTree, getNavCategoryLocalized } from "@/lib/catalog/approved-nav";
import { getServiceBySlug } from "@/lib/catalog";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Section, SectionHeader } from "@/components/ui/Section";
import { MainCategoryCard } from "@/components/catalog/MainCategoryCard";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaBand } from "@/components/public/CtaBand";
import { CategoryChildGrid } from "@/components/catalog/CategoryChildGrid";
import { listPageHref, PrevNextPagination } from "@/components/ui/PrevNextPagination";

const CATEGORY_PAGE_SIZE = 6;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Services" });
  return buildMetadata({ locale, title: `${t("title")} | ${brandName(locale)}`, description: t("lead"), path: "/services" });
}

export default async function ServicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Services");
  const nav = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");
  const pager = await getTranslations("Pagination");
  const categories = buildVisitorNavTree();
  const totalPages = Math.max(1, Math.ceil(categories.length / CATEGORY_PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Number(sp.page || "1") || 1));
  const pageCategories = categories.slice((page - 1) * CATEGORY_PAGE_SIZE, page * CATEGORY_PAGE_SIZE);
  const allChildren = (
    await Promise.all(
      categories.flatMap((cat) =>
        cat.children.map(async (child) => {
          const svc = await getServiceBySlug(child.slug, locale);
          if (!svc) return null;
          const loc = getNavCategoryLocalized(cat, locale);
          return {
            slug: child.slug,
            href: child.href,
            name: svc.t.name || child.nameEn,
            description: svc.t.shortDescription || loc.description,
          };
        }),
      ),
    )
  ).filter((item): item is { slug: string; href: string; name: string; description: string } => Boolean(item?.name));

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[{ href: "/", label: nav("home") }, { href: "/services", label: t("title") }]}
        />
      }
    >
      <PublicHero locale={locale} title={t("title")} lead={home("mainServicesLead")} />

      <Section>
        <SectionHeader title={home("mainServicesTitle")} lead={home("mainServicesLead")} />
        <ul className="mt-3 grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pageCategories.map((cat) => (
            <li key={cat.slug} className="flex h-full">
              <MainCategoryCard category={cat} locale={locale} />
            </li>
          ))}
        </ul>
        <PrevNextPagination
          currentPage={page}
          totalPages={totalPages}
          previousHref={page > 1 ? listPageHref("/services", page - 1) : null}
          nextHref={page < totalPages ? listPageHref("/services", page + 1) : null}
          previousLabel={pager("previous")}
          nextLabel={pager("next")}
          pageOfLabel={pager("pageOf", { current: page, total: totalPages })}
        />
      </Section>

      <Section tone="sand">
        <SectionHeader title={t("fullListTitle")} lead={t("fullListLead", { count: allChildren.length })} />
        <div className="mt-6">
          <CategoryChildGrid
            items={allChildren}
            searchPlaceholder={t("fullListSearch")}
            emptyLabel={t("fullListEmpty")}
            cta={home("viewService")}
          />
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
