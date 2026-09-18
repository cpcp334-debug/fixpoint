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
const FULL_LIST_PAGE_SIZE = 6;

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
  searchParams: Promise<{ page?: string; catPage?: string; q?: string }>;
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
  const catTotalPages = Math.max(1, Math.ceil(categories.length / CATEGORY_PAGE_SIZE));
  const catPage = Math.min(catTotalPages, Math.max(1, Number(sp.catPage || "1") || 1));
  const pageCategories = categories.slice((catPage - 1) * CATEGORY_PAGE_SIZE, catPage * CATEGORY_PAGE_SIZE);
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

  const q = sp.q?.trim().toLowerCase() || "";
  const qParam = sp.q?.trim() || undefined;
  const filteredChildren = q
    ? allChildren.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q),
      )
    : allChildren;

  const listTotalPages = Math.max(1, Math.ceil(filteredChildren.length / FULL_LIST_PAGE_SIZE));
  const listPage = Math.min(listTotalPages, Math.max(1, Number(sp.page || "1") || 1));
  const pageChildren = filteredChildren.slice(
    (listPage - 1) * FULL_LIST_PAGE_SIZE,
    listPage * FULL_LIST_PAGE_SIZE,
  );
  const catPageParam = catPage > 1 ? String(catPage) : undefined;

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
          currentPage={catPage}
          totalPages={catTotalPages}
          previousHref={
            catPage > 1
              ? listPageHref("/services", catPage - 1, { q: qParam, page: listPage > 1 ? String(listPage) : undefined }, { pageParam: "catPage" })
              : null
          }
          nextHref={
            catPage < catTotalPages
              ? listPageHref("/services", catPage + 1, { q: qParam, page: listPage > 1 ? String(listPage) : undefined }, { pageParam: "catPage" })
              : null
          }
          previousLabel={pager("previous")}
          nextLabel={pager("next")}
          pageOfLabel={pager("pageOf", { current: catPage, total: catTotalPages })}
        />
      </Section>

      <Section tone="sand">
        <SectionHeader title={t("fullListTitle")} lead={t("fullListLead", { count: allChildren.length })} />
        <div className="mt-6">
          <CategoryChildGrid
            items={pageChildren}
            searchPlaceholder={t("fullListSearch")}
            emptyLabel={t("fullListEmpty")}
            cta={home("viewService")}
            query={sp.q?.trim() || ""}
            filterLabel={pager("filter")}
            hiddenFields={catPageParam ? { catPage: catPageParam } : undefined}
          />
        </div>
        <PrevNextPagination
          currentPage={listPage}
          totalPages={listTotalPages}
          previousHref={
            listPage > 1 ? listPageHref("/services", listPage - 1, { q: qParam, catPage: catPageParam }) : null
          }
          nextHref={
            listPage < listTotalPages
              ? listPageHref("/services", listPage + 1, { q: qParam, catPage: catPageParam })
              : null
          }
          previousLabel={pager("previous")}
          nextLabel={pager("next")}
          pageOfLabel={pager("pageOf", { current: listPage, total: listTotalPages })}
        />
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
