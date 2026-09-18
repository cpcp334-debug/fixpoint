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
import { getPublishedServiceFaqs } from "@/lib/faq/pages";
import { APPROVED_CATEGORIES } from "../../../../prisma/data/catalog-a1";

/** Rebuild after MySQL import / publish — avoid empty SSG baked at first Hostinger build. */
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "FaqPage" });
  return buildMetadata({ locale, title: `${t("title")} | ${brandName(locale)}`, description: t("lead"), path: "/faq", index: true });
}

export default async function FaqRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("FaqPage");
  const nav = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");
  const pages = await getPublishedServiceFaqs(locale);
  const names = new Map(
    APPROVED_CATEGORIES.map((row) => [row.slug, locale === "ar" && row.nameAr && row.nameAr !== "REVIEW_REQUIRED" ? row.nameAr : row.nameEn]),
  );
  const grouped = new Map<string, { slug: string; name: string; items: Array<{ slug: string; title: string; excerpt: string }> }>();
  for (const page of pages) {
    const key = page.categorySlug || "other";
    const current = grouped.get(key) || { slug: key, name: names.get(key) || key, items: [] };
    current.items.push({ slug: page.slug, title: page.title, excerpt: page.excerpt });
    grouped.set(key, current);
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
