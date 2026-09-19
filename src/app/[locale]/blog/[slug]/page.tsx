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
import { ArPublicSlugNormalize } from "@/components/public/ArPublicSlugNormalize";
import { CtaRow } from "@/components/public/CtaRow";
import { CtaBand } from "@/components/public/CtaBand";
import { getBlogArticleBySlug, getPublishedBlogArticles } from "@/lib/blog/catalog";
import { prisma } from "@/server/db";
import { getGuideBySlug } from "@/lib/catalog";

/** Avoid SSG of 100k+ service×estate×city blog pages (Hostinger OOM). */
export function generateStaticParams() {
  return [];
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

function headingId(title: string) {
  return `s-${title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64)}`;
}

function extractHeadings(body: string) {
  const seen = new Set<string>();
  return body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("## "))
    .map((line) => line.replace(/^##\s+/, ""))
    .filter((title) => {
      if (
        /^Field detail\b/i.test(title) ||
        /^تفصيل ميداني\b/i.test(title) ||
        /^Exclusive checkpoint\b/i.test(title) ||
        /^نقطة تحقق حصرية\b/i.test(title) ||
        /^Documentation markers\b/i.test(title) ||
        /^علامات توثيق\b/i.test(title)
      ) {
        return false;
      }
      // padToWords historically repeated heading blocks — keep TOC unique.
      if (seen.has(title)) return false;
      seen.add(title);
      return true;
    });
}

function renderBody(body: string) {
  // Collapse historically padded duplicate ## sections (padToWords bug):
  // when a heading title repeats, drop that heading and its following blocks
  // until the next unique ## heading.
  const rawBlocks = body.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  const seenH2 = new Set<string>();
  const blocks: string[] = [];
  let skippingDupSection = false;
  for (const block of rawBlocks) {
    if (block.startsWith("## ")) {
      const title = block.replace(/^##\s+/, "").trim();
      if (seenH2.has(title)) {
        skippingDupSection = true;
        continue;
      }
      seenH2.add(title);
      skippingDupSection = false;
      blocks.push(block);
      continue;
    }
    if (skippingDupSection) continue;
    blocks.push(block);
  }
  return blocks.map((block, i) => {
    if (block.startsWith("## ")) {
      const title = block.replace(/^##\s+/, "");
      return (
        <h2 key={i} id={headingId(title)} className="mt-8 scroll-mt-24 text-xl font-semibold text-navy">
          {title}
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
        <ul key={i} className="mt-3 list-disc space-y-1 ps-5 text-sm leading-relaxed text-muted sm:text-base">
          {items.map((item) => (
            <li key={item.slice(0, 48)}>{item}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={i} className="mt-4 text-sm leading-relaxed text-muted whitespace-pre-line sm:text-base">
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

  const outline = extractHeadings(article.t.body);

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
      <ArPublicSlugNormalize locale={locale} preferredSegment={article.slug} />
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

      <PublicHero locale={locale}
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
          {outline.length ? (
            <nav
              aria-label={locale === "ar" ? "محتويات المقال" : "Article contents"}
              className="mb-8 rounded-xl border border-line bg-sand/60 p-4 sm:p-5"
            >
              <p className="text-sm font-semibold text-navy">
                {locale === "ar" ? "محتويات المقال" : "In this article"}
              </p>
              <ol className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
                {outline.map((heading) => (
                  <li key={heading}>
                    <a href={`#${headingId(heading)}`} className="hover:text-accent">
                      {heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          <div className="prose-article">{renderBody(article.t.body)}</div>
          {article.t.diySection ? (
            <div className="mt-10">
              <ProseCard title={t("diyHelp")}>
                <div className="whitespace-pre-line text-sm leading-relaxed sm:text-base">{article.t.diySection}</div>
              </ProseCard>
            </div>
          ) : null}
          <div className="mt-10 rounded-xl border border-gold/30 bg-sand p-4 sm:p-5">
            <p className="text-sm font-semibold text-navy">
              {locale === "ar" ? "الخطوة التالية" : "Next step"}
            </p>
            <p className="mt-2 text-sm text-muted">
              {locale === "ar"
                ? "إذا احتجت مساعدة مهنية، اطلب عرض سعر مع الصور وملاحظات الوصول."
                : "If you need professional help, request a quote with photos and access notes."}
            </p>
            <div className="mt-4">
              <Link
                href="/get-a-quote"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
              >
                {cta("quote")}
              </Link>
            </div>
          </div>
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
