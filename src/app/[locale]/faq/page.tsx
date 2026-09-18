import { brandName } from "@/config/site";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata, collectionPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Section } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaBand } from "@/components/public/CtaBand";
import { FaqDirectory } from "@/components/faq/FaqDirectory";
import { QuestionForm } from "@/components/forms/QuestionForm";
import { listPageHref, PrevNextPagination } from "@/components/ui/PrevNextPagination";
import { getPublishedServiceFaqs } from "@/lib/faq/pages";
import { APPROVED_CATEGORIES } from "../../../../prisma/data/catalog-a1";

/** Rebuild after MySQL import / publish — avoid empty SSG baked at first Hostinger build. */
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "FaqPage" });
  return buildMetadata({ locale, title: `${t("title")} | ${brandName(locale)}`, description: t("lead"), path: "/faq", index: true });
}

export default async function FaqRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("FaqPage");
  const nav = await getTranslations("Nav");
  const pager = await getTranslations("Pagination");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");
  const pages = await getPublishedServiceFaqs(locale);
  const names = new Map(
    APPROVED_CATEGORIES.map((row) => [row.slug, locale === "ar" && row.nameAr && row.nameAr !== "REVIEW_REQUIRED" ? row.nameAr : row.nameEn]),
  );

  const q = sp.q?.trim().toLowerCase() || "";
  type FlatItem = { slug: string; title: string; excerpt: string; categorySlug: string; categoryName: string };
  const flat: FlatItem[] = pages.map((page) => {
    const categorySlug = page.categorySlug || "other";
    return {
      slug: page.slug,
      title: page.title,
      excerpt: page.excerpt,
      categorySlug,
      categoryName: names.get(categorySlug) || categorySlug,
    };
  });

  const filtered = q
    ? flat.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.categoryName.toLowerCase().includes(q) ||
          item.excerpt.toLowerCase().includes(q),
      )
    : flat;

  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(totalPages, Math.max(1, Number(sp.page || "1") || 1));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const grouped = new Map<string, { slug: string; name: string; items: Array<{ slug: string; title: string; excerpt: string }> }>();
  for (const item of pageItems) {
    const current = grouped.get(item.categorySlug) || {
      slug: item.categorySlug,
      name: item.categoryName,
      items: [],
    };
    current.items.push({ slug: item.slug, title: item.title, excerpt: item.excerpt });
    grouped.set(item.categorySlug, current);
  }
  const groups = [...grouped.values()];

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[{ href: "/", label: nav("home") }, { href: "/faq", label: t("title") }]}
        />
      }
    >
      <JsonLd
        data={collectionPageJsonLd({
          name: t("title"),
          description: t("lead"),
          path: "/faq",
          locale,
        })}
      />
      <PublicHero locale={locale} kicker={t("title")} title={t("title")} lead={t("lead")} compact />
      <Section>
        <FaqDirectory
          groups={groups}
          searchPlaceholder={t("search")}
          emptyLabel={t("empty")}
          openLabel={t("open")}
          query={sp.q?.trim() || ""}
          filterLabel={pager("filter")}
        />
        <PrevNextPagination
          currentPage={page}
          totalPages={totalPages}
          previousHref={page > 1 ? listPageHref("/faq", page - 1, { q: sp.q?.trim() }) : null}
          nextHref={page < totalPages ? listPageHref("/faq", page + 1, { q: sp.q?.trim() }) : null}
          previousLabel={pager("previous")}
          nextLabel={pager("next")}
          pageOfLabel={pager("pageOf", { current: page, total: totalPages })}
        />
        <div className="mt-10">
          <QuestionForm locale={locale} />
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
