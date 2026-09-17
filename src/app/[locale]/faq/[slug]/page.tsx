import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { prisma } from "@/server/db";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FaqList } from "@/components/ui/Blocks";
import { Section, SectionHeader } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";
import { PublicHero } from "@/components/public/PublicHero";
import { CtaBand } from "@/components/public/CtaBand";
import { getServiceFaqBySlug } from "@/lib/faq/pages";
import { isServiceFaqSlug } from "@/lib/faq/service-faq";

export async function generateStaticParams() {
  try {
    const rows = await prisma.article.findMany({
      where: { status: "published", indexable: true, slug: { startsWith: "faq-" } },
      select: { slug: true },
    });
    return rows.filter((row) => isServiceFaqSlug(row.slug)).map((row) => ({ slug: row.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const page = await getServiceFaqBySlug(slug, locale);
  if (!page) return {};
  return buildMetadata({
    locale,
    title: page.t.seoTitle,
    description: page.t.metaDescription,
    path: `/faq/${page.slug}`,
    index: true,
  });
}

function renderBody(body: string) {
  return body
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      if (block.startsWith("## ")) {
        return (
          <h2 key={index} className="mt-8 text-xl font-semibold text-navy">
            {block.replace(/^##\s+/, "")}
          </h2>
        );
      }
      return (
        <p key={index} className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
          {block}
        </p>
      );
    });
}

export default async function ServiceFaqPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const page = await getServiceFaqBySlug(slug, locale);
  if (!page) notFound();
  const t = await getTranslations("FaqPage");
  const nav = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");
  const serviceSlug = page.relatedServiceSlugs[0];
  const diySlug = page.relatedDiySlugs[0];

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[
            { href: "/", label: nav("home") },
            { href: "/faq", label: t("title") },
            { href: `/faq/${page.slug}`, label: page.t.title },
          ]}
        />
      }
    >
      <JsonLd data={faqJsonLd(page.t.faq)} />
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: "Home", path: "/" },
            { name: t("title"), path: "/faq" },
            { name: page.t.title, path: `/faq/${page.slug}` },
          ],
          locale,
        )}
      />
      <PublicHero locale={locale} kicker={t("title")} title={page.t.title} lead={page.t.excerpt} compact />
      <Section>
        <div>{renderBody(page.t.body)}</div>
        <div className="mt-10">
          <SectionHeader title={t("questions")} />
          <div className="mt-6">
            <FaqList items={page.t.faq} />
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold">
          {serviceSlug ? (
            <Link href={`/${serviceSlug}`} className="text-navy underline">
              {t("openService")}
            </Link>
          ) : null}
          {diySlug ? (
            <Link href={`/diy/${diySlug}`} className="text-navy underline">
              {t("openDiy")}
            </Link>
          ) : null}
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
