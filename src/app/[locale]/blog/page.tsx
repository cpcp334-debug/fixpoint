import { ReviewedSectionPhoto } from "@/components/public/ReviewedSectionPhoto";
import { brandName } from "@/config/site";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata, collectionPageJsonLd, faqJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { EmptyState, Section, SectionHeader } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";
import { CtaBand } from "@/components/public/CtaBand";
import { listPageHref, PrevNextPagination } from "@/components/ui/PrevNextPagination";
import { getPublishedBlogArticlesPage } from "@/lib/blog/catalog";
import { PUBLIC_BLOG_CATEGORIES } from "@/lib/blog/categories";
import { getPublishedGuides } from "@/lib/catalog";
import { prisma } from "@/server/db";

/** Rebuild after MySQL import / publish — avoid empty SSG baked at first Hostinger build. */
export const revalidate = 300;

const BLOG_PAGE_SIZE = 12;

type BlogSearchParams = {
  category?: string | string[];
  q?: string | string[];
  page?: string | string[];
};

type BlogPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<BlogSearchParams>;
};

function firstQueryValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim();
}

function blogQuery(searchParams: BlogSearchParams) {
  const requestedPage = Number(firstQueryValue(searchParams.page));
  return {
    category: firstQueryValue(searchParams.category),
    q: firstQueryValue(searchParams.q),
    pageHint: Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
  };
}

export async function generateMetadata({ params, searchParams }: BlogPageProps) {
  const { locale } = await params;
  const { category, q, pageHint } = blogQuery(await searchParams);
  const t = await getTranslations({ locale, namespace: "Blog" });
  const { total } = await getPublishedBlogArticlesPage(locale, { skip: 0, take: 1, category, q });
  const totalPages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
  const page = Math.min(totalPages, pageHint);
  return buildMetadata({
    locale,
    title: `${t("title")} | ${brandName(locale)}`,
    description: t("lead"),
    path: listPageHref("/blog", page, { category, q }),
    index: total > 0,
  });
}

function readMinutes(text: string) {
  const words = text.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(4, Math.round(words / 220));
}

export default async function BlogIndexPage({
  params,
  searchParams,
}: BlogPageProps) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Blog");
  const nav = await getTranslations("Nav");
  const pager = await getTranslations("Pagination");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");

  const { category, q, pageHint } = blogQuery(sp);
  const first = await getPublishedBlogArticlesPage(locale, {
    skip: 0,
    take: BLOG_PAGE_SIZE,
    category,
    q,
  });
  const totalPages = Math.max(1, Math.ceil(first.total / BLOG_PAGE_SIZE));
  const page = Math.min(totalPages, pageHint);
  const pagePack =
    page === 1
      ? first
      : await getPublishedBlogArticlesPage(locale, {
          skip: (page - 1) * BLOG_PAGE_SIZE,
          take: BLOG_PAGE_SIZE,
          category,
          q,
        });
  const pageItems = pagePack.items;
  const total = pagePack.total;
  const featured = (page === 1 ? pageItems : first.items).slice(0, 3);

  const guides = (await getPublishedGuides(locale)).slice(0, 6);
  const services = await prisma.service.findMany({
    where: { status: "active", indexable: true },
    include: { translations: true },
    take: 6,
    orderBy: { updatedAt: "desc" },
  });

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[{ href: "/", label: nav("home") }, { href: "/blog", label: t("title") }]}
        />
      }
    >
      <JsonLd
        data={collectionPageJsonLd({
          name: t("title"),
          description: t("lead"),
          path: listPageHref("/blog", page, { category, q }),
          locale,
        })}
      />

      <Section>
        <h1 className="text-[2rem] font-semibold text-navy">{t("title")}</h1>
        <p className="mt-3 max-w-3xl text-muted">{t("lead")}</p>
        <ReviewedSectionPhoto section="blog" locale={locale} title={t("title")} />

        <form className="mt-6 flex flex-wrap gap-3" method="get">
          <input
            type="search"
            name="q"
            defaultValue={q || ""}
            placeholder={locale === "ar" ? "ابحث في المدونة" : "Search the blog"}
            className="min-w-[12rem] flex-1 rounded-md border border-line bg-white px-3 py-2 text-sm"
          />
          <select
            name="category"
            defaultValue={category || ""}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="">{t("all")}</option>
            {PUBLIC_BLOG_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {locale === "ar" ? c.ar : c.en}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-md bg-navy px-4 py-2 text-sm text-white">
            {locale === "ar" ? "تصفية" : "Filter"}
          </button>
        </form>
      </Section>

      <Section>
        <SectionHeader title={t("categories")} />
        <ul className="mt-4 flex flex-wrap gap-2">
          {PUBLIC_BLOG_CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/blog?category=${c.slug}`}
                className="rounded-full border border-line bg-white px-3 py-1 text-sm text-navy hover:border-accent"
              >
                {locale === "ar" ? c.ar : c.en}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {!total ? (
        <Section>
          <EmptyState body={t("empty")} />
        </Section>
      ) : (
        <>
          {featured.length ? (
            <Section tone="sand">
              <SectionHeader title={t("featured")} />
              <ul className="mt-8 grid gap-6 md:grid-cols-3">
                {featured.map((a) => (
                  <li key={a.slug} className="overflow-hidden rounded-xl border border-line bg-white">
                    {a.heroImage ? (
                      <div className="relative aspect-[16/10] bg-sand">
                        <Image src={a.heroImage} alt={a.imageAlt} fill className="object-cover" sizes="(max-width:768px) 100vw, 33vw" />
                      </div>
                    ) : null}
                    <div className="p-4">
                      <p className="text-xs text-muted">{a.categories.map((c) => c.label).join(" · ")}</p>
                      <h2 className="mt-2 text-lg font-semibold text-navy">
                        <Link href={`/blog/${a.slug}`}>{a.title}</Link>
                      </h2>
                      <p className="mt-2 text-sm text-muted line-clamp-3">{a.excerpt}</p>
                      <p className="mt-3 text-xs text-muted">
                        {readMinutes(a.excerpt)} {t("minutes")}
                      </p>
                      <Link href={`/blog/${a.slug}`} className="mt-3 inline-block text-sm font-medium text-accent">
                        {t("readFull")}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section>
            <SectionHeader title={t("latest")} />
            <PrevNextPagination
              currentPage={page}
              totalPages={totalPages}
              previousHref={
                page > 1
                  ? listPageHref("/blog", page - 1, { category, q })
                  : null
              }
              nextHref={
                page < totalPages
                  ? listPageHref("/blog", page + 1, { category, q })
                  : null
              }
              previousLabel={pager("previous")}
              nextLabel={pager("next")}
              pageOfLabel={pager("pageOf", { current: page, total: totalPages })}
            />
            {pageItems.length ? (
              <ul className="mt-8 grid gap-6 md:grid-cols-2">
                {pageItems.map((a) => (
                  <li key={`latest-${a.slug}`} className="flex gap-4 rounded-xl border border-line bg-white p-4">
                    {a.heroImage ? (
                      <div className="relative hidden h-24 w-32 shrink-0 overflow-hidden rounded-md sm:block">
                        <Image src={a.heroImage} alt={a.imageAlt} fill className="object-cover" sizes="128px" />
                      </div>
                    ) : null}
                    <div>
                      <p className="text-xs text-muted">{a.categories.map((c) => c.label).join(" · ")}</p>
                      <h2 className="mt-1 font-semibold text-navy">
                        <Link href={`/blog/${a.slug}`}>{a.title}</Link>
                      </h2>
                      <p className="mt-2 text-sm text-muted line-clamp-2">{a.excerpt}</p>
                      <Link href={`/blog/${a.slug}`} className="mt-2 inline-block text-sm text-accent">
                        {t("readFull")}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-8">
                <EmptyState body={t("empty")} />
              </div>
            )}
            <PrevNextPagination
              currentPage={page}
              totalPages={totalPages}
              previousHref={
                page > 1
                  ? listPageHref("/blog", page - 1, { category, q })
                  : null
              }
              nextHref={
                page < totalPages
                  ? listPageHref("/blog", page + 1, { category, q })
                  : null
              }
              previousLabel={pager("previous")}
              nextLabel={pager("next")}
              pageOfLabel={pager("pageOf", { current: page, total: totalPages })}
            />
          </Section>
        </>
      )}

      <Section tone="sand">
        <SectionHeader title={t("fromGuides")} />
        <p className="mt-2 max-w-2xl text-sm text-muted">{t("fromGuidesLead")}</p>
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link href={`/diy/${g.slug}`} className="text-sm font-medium text-accent">
                {g.t.title}
              </Link>
            </li>
          ))}
          {services.map((s) => {
            const name = s.translations.find((x) => x.locale === locale)?.name || s.slug;
            return (
              <li key={s.slug}>
                <Link href={`/${s.slug}`} className="text-sm font-medium text-accent">
                  {name}
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      <CtaBand
        title={t("ctaTitle")}
        body={t("ctaBody")}
        quote={home("ctaQuote")}
        ai={home("ctaAi")}
        whatsapp={cta("whatsapp")}
        aiHref={`/${locale}#alnajah-ai`}
      />
    </PageShell>
  );
}
