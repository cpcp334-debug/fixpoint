import { brandName } from "@/config/site";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildVisitorNavTree, getNavCategoryLocalized } from "@/lib/catalog/approved-nav";
import { getActiveServices } from "@/lib/catalog";
import { toMasterServiceSlug } from '@/lib/slug/service-slug-map';
import { serviceHref } from "@/lib/slug/locale-slug";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Section, SectionHeader } from "@/components/ui/Section";
import { MainCategoryCard } from "@/components/catalog/MainCategoryCard";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaBand } from "@/components/public/CtaBand";
import { CategoryChildGrid } from "@/components/catalog/CategoryChildGrid";
import { listPageHref, PrevNextPagination } from "@/components/ui/PrevNextPagination";

const CATEGORY_PAGE_SIZE = 18;
const FULL_LIST_PAGE_SIZE = 24;

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
  // One catalogue read instead of one database query for every listed job.
  const activeServices = await getActiveServices(locale);
  const serviceMap = new Map(activeServices.map(s=>[toMasterServiceSlug(s.slug),s]));
  const allChildren = (
      categories.flatMap((cat) =>
        cat.children.map((child) => {
          const svc = serviceMap.get(toMasterServiceSlug(child.slug)) || (child.slug === 'water-tank-cleaning-service' ? serviceMap.get('water-tank-cleaning') : undefined);
          if (!svc) return null;
          const loc = getNavCategoryLocalized(cat, locale);
          return {
            slug: svc.slug,
            href: serviceHref(locale, svc.slug),
            name: svc.t.name || child.nameEn,
            description: svc.t.shortDescription || loc.description,
          };
        }),
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

      <Section tone="sand">
        <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-line bg-white p-6 sm:p-8">
          <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-wider text-accent">{locale === 'ar' ? 'الكهرباء أولاً' : 'Electrical services first'}</p><h2 className="mt-2 text-2xl font-bold text-navy">{locale === 'ar' ? 'اعثر على العمل المناسب، ثم ناقش التفاصيل.' : 'Find the right work. Then agree the details.'}</h2><p className="mt-3 text-muted">{locale === 'ar' ? 'تصفح ١٨ فئة و١٦٠ خدمة كهربائية. يؤكد الفريق النطاق والتوفر في عنوانك قبل الحجز.' : 'Explore 18 categories, including 160 electrical services. Scope and availability at your address are confirmed before booking.'}</p></div>
          <div className="flex flex-wrap gap-3"><a href={`/${locale}/services/electrical`} className="rounded-lg bg-navy px-5 py-3 font-semibold text-white">{locale === 'ar' ? 'خدمات الكهرباء' : 'Explore electrical'}</a><a href="#all-services" className="rounded-lg border border-line px-5 py-3 font-semibold text-navy">{locale === 'ar' ? 'ابحث في الخدمات' : 'Search all services'}</a></div>
        </div>
      </Section>
      <Section>
        <SectionHeader title={home("mainServicesTitle")} lead={home("mainServicesLead")} />
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

      <Section tone="sand" id="all-services">
        <SectionHeader title={t("fullListTitle")} lead={t("fullListLead", { count: allChildren.length })} />
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
