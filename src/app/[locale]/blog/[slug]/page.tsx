import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { buildMetadata, blogPostingJsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FaqList } from "@/components/ui/Blocks";
import { Section, SectionHeader } from "@/components/ui/Section";
import { PageShell, ProseCard } from "@/components/public/PageShell";
import { PublicHero, publicCanonical } from "@/components/public/PublicHero";
import { CtaRow } from "@/components/public/CtaRow";
import { CtaBand } from "@/components/public/CtaBand";
import { getBlogArticleBySlug, getPublishedBlogArticles } from "@/lib/blog/catalog";
import { prisma } from "@/server/db";
import { getGuideBySlug } from "@/lib/catalog";

export async function generateStaticParams() {
  try {
    const rows = await prisma.article.findMany({
      where: { status: "published", indexable: true },
      select: { slug: true },
    });
    return rows.map((r) => ({ slug: r.slug }));
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
  const article = await getBlogArticleBySlug(slug, locale);
  if (!article) return {};
  return buildMetadata({
    locale,
    title: article.t.seoTitle,
    description: article.t.metaDescription,
    path: `/blog/${article.slug}`,
    ogType: "article",
    index: true,
  });
}

function renderBody(body: string) {
  const blocks = body.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block, i) => {
    if (block.startsWith("## ")) {
      return (
        <h2 key={i} className="mt-8 text-xl font-semibold text-navy">
          {block.replace(/^##\s+/, "")}
        </h2>
      );
    }
    if (block.startsWith("### ")) {
      return (
        <h3 key={i} className="mt-6 text-lg font-semibold text-navy">
          {block.replace(/^###\s+/, "")}
        </h3>
      );
    }
    if (block.startsWith("- ")) {
      const items = block.split("\n").map((l) => l.replace(/^- /, "").trim()).filter(Boolean);
      return (
        <ul key={i} className="mt-3 list-disc space-y-1 ps-5 text-sm leading-relaxed text-muted">
          {items.map((item) => (
            <li key={item.slice(0, 48)}>{item}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={i} className="mt-4 text-sm leading-relaxed text-muted whitespace-pre-line">
        {block}
      </p>
    );
  });
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const article = await getBlogArticleBySlug(slug, locale);
  if (!article) notFound();

  const t = await getTranslations("Blog");
  const nav = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");

  const related = (await getPublishedBlogArticles(locale))
    .filter((a) => a.slug !== article.slug)
    .filter((a) => a.categories.some((c) => article.categories.some((ac) => ac.slug === c.slug)))
    .slice(0, 4);

  const relatedServices = await prisma.service.findMany({
    where: { slug: { in: article.relatedServiceSlugs }, status: "active", indexable: true },
    include: { translations: true },
  });

  const relatedDiy = [];
  for (const diySlug of article.relatedDiySlugs.slice(0, 3)) {
    const g = await getGuideBySlug(diySlug, locale);
    if (g) relatedDiy.push(g);
  }

  const ctaLabels = {
    quote: cta("quote"),
    book: cta("book"),
    inspect: cta("inspect"),
    whatsapp: cta("whatsapp"),
    call: cta("call"),
  };

  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[
            { href: "/", label: nav("home") },
            { href: "/blog", label: t("title") },
            { href: `/blog/${article.slug}`, label: article.t.title },
          ]}
        />
      }
    >
      <JsonLd
        data={blogPostingJsonLd({
          title: article.t.title,
          description: article.t.metaDescription,
          path: `/blog/${article.slug}`,
          locale,
          image: article.heroImage,
          datePublished: article.publishedAt?.toISOString() || null,
          dateModified: article.updatedAt.toISOString(),
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: article.t.title, path: `/blog/${article.slug}` },
          ],
          locale,
        )}
      />
      {article.t.faq.length ? <JsonLd data={faqJsonLd(article.t.faq)} /> : null}

      <PublicHero
        kicker={article.categories.map((c) => c.label).join(" · ")}
        title={article.t.title}
        lead={article.t.excerpt}
        heroImage={article.heroImage || undefined}
        imageAlt={article.t.imageAlt}
        shareUrl={publicCanonical(locale, `/blog/${article.slug}`)}
        shareLabel={home("share")}
        copiedLabel={home("copied")}
        meta={
          article.publishedAt ? (
            <p>
              {article.publishedAt.toLocaleDateString(locale === "ar" ? "ar-AE" : "en-AE", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          ) : null
        }
      />

      <Section>
        <article className="mx-auto max-w-3xl">
          <div className="prose-article">{renderBody(article.t.body)}</div>
          {article.t.diySection ? (
            <div className="mt-10">
              <ProseCard title={t("diyHelp")}>
                <div className="whitespace-pre-line text-sm leading-relaxed">{article.t.diySection}</div>
              </ProseCard>
            </div>
          ) : null}
        </article>
        <div className="mt-10">
          <CtaRow labels={ctaLabels} />
        </div>
      </Section>

      {article.t.faq.length ? (
        <Section tone="sand">
          <SectionHeader title={t("faq")} />
          <div className="mt-6">
            <FaqList items={article.t.faq} />
          </div>
        </Section>
      ) : null}

      {relatedServices.length || relatedDiy.length ? (
        <Section>
          <div className="grid gap-8 md:grid-cols-2">
            {relatedServices.length ? (
              <div>
                <SectionHeader title={t("relatedService")} />
                <ul className="mt-4 space-y-2">
                  {relatedServices.map((s) => {
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
              </div>
            ) : null}
            {relatedDiy.length ? (
              <div>
                <SectionHeader title={t("relatedDiy")} />
                <ul className="mt-4 space-y-2">
                  {relatedDiy.map((g) => (
                    <li key={g.slug}>
                      <Link href={`/diy/${g.slug}`} className="text-sm font-medium text-accent">
                        {g.t.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {related.length ? (
        <Section tone="sand">
          <SectionHeader title={t("related")} />
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {related.map((a) => (
              <li key={a.slug} className="rounded-xl border border-line bg-white p-4">
                <Link href={`/blog/${a.slug}`} className="font-medium text-navy">
                  {a.title}
                </Link>
                <p className="mt-2 text-sm text-muted line-clamp-2">{a.excerpt}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

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
