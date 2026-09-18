import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { siteConfig, brandName } from "@/config/site";
import {
  getApprovedGuideFeedback,
  getApprovedGuideQuestions,
  getDiyCategoryBySlug,
  getGuideBySlug,
  getPublishedGuides,
} from "@/lib/catalog";
import { prisma } from "@/server/db";
import {
  breadcrumbJsonLd,
  buildMetadata,
  collectionPageJsonLd,
  faqJsonLd,
  howToJsonLd,
} from "@/lib/seo";
import { parseJson } from "@/lib/utils";
import { parseFaqJson } from "@/lib/faq";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Disclaimer, FaqList } from "@/components/ui/Blocks";
import { VoteButtons } from "@/components/diy/VoteButtons";
import { GuideReaderFeedback } from "@/components/diy/GuideReaderFeedback";
import { QuestionForm } from "@/components/forms/QuestionForm";
import { EmptyState, Section, SectionHeader } from "@/components/ui/Section";
import { DiyCard, ServiceCard } from "@/components/home/Cards";
import { PageShell, ProseCard } from "@/components/public/PageShell";
import { PublicHero, publicCanonical } from "@/components/public/PublicHero";
import { CtaRow } from "@/components/public/CtaRow";
import { CtaBand } from "@/components/public/CtaBand";
import { topicWebpForDiyCategory, altForTopic } from "@/lib/media/topic-webp";
import { listPageHref, PrevNextPagination } from "@/components/ui/PrevNextPagination";
import { diyCategoryPathSlug, diyPathSlug } from "@/lib/slug/diy-slug-map";

const DIY_CATEGORY_PAGE_SIZE = 6;

export async function generateStaticParams() {
  try {
    const [guides, categories] = await Promise.all([
      prisma.diyGuide.findMany({
        where: { status: "published", indexable: true },
        select: { slug: true },
      }),
      prisma.diyCategory.findMany({
        where: { status: "published", indexable: true },
        select: { slug: true },
      }),
    ]);
    return [...categories, ...guides].map((row) => ({ slug: row.slug }));
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
  const category = await getDiyCategoryBySlug(slug, locale);
  if (category) {
    return buildMetadata({
      locale,
      title: category.t.seoTitle || `${category.t.name} | ${brandName(locale)}`,
      description: category.t.metaDescription || category.t.description,
      path: `/diy/${category.slug}`,
      index: true,
    });
  }
  const guide = await getGuideBySlug(slug, locale);
  if (!guide) return {};
  return buildMetadata({
    locale,
    title: guide.t.seoTitle,
    description: guide.t.metaDescription,
    path: `/diy/${guide.slug}`,
    ogType: "article",
    index: true,
  });
}

export default async function DiySegmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const category = await getDiyCategoryBySlug(slug, locale);
  if (category) return <DiyCategoryView locale={locale} category={category} pageHint={sp.page} />;
  const guide = await getGuideBySlug(slug, locale);
  if (guide) return <DiyGuideView locale={locale} slug={slug} />;
  notFound();
}

async function DiyCategoryView({
  locale,
  category,
  pageHint,
}: {
  locale: string;
  category: NonNullable<Awaited<ReturnType<typeof getDiyCategoryBySlug>>>;
  pageHint?: string;
}) {
  const t = await getTranslations("Diy");
  const nav = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const cta = await getTranslations("Cta");
  const pager = await getTranslations("Pagination");
  const guides = category.publishedGuides;
  const totalPages = Math.max(1, Math.ceil(guides.length / DIY_CATEGORY_PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Number(pageHint || "1") || 1));
  const pageGuides = guides.slice((page - 1) * DIY_CATEGORY_PAGE_SIZE, page * DIY_CATEGORY_PAGE_SIZE);
  const categoryPath = `/diy/${category.slug}`;
  return (
    <PageShell
      breadcrumbs={
        <Breadcrumbs
          label={nav("breadcrumb")}
          items={[
            { href: "/", label: nav("home") },
            { href: "/diy", label: t("title") },
            { href: categoryPath, label: category.t.name },
          ]}
        />
      }
    >
      <JsonLd
        data={collectionPageJsonLd({
          name: category.t.name,
          description: category.t.description,
          path: categoryPath,
          locale,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: "Home", path: "/" },
            { name: "DIY", path: "/diy" },
            { name: category.t.name, path: categoryPath },
          ],
          locale,
        )}
      />
      <PublicHero locale={locale} kicker={t("title")} title={category.t.name} lead={category.t.description} />
      <Section>
        <Disclaimer>{siteConfig.disclaimers.diy[locale === "ar" ? "ar" : "en"]}</Disclaimer>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {pageGuides.map((guide) => (
            <li key={guide.slug}>
              <DiyCard
                slug={guide.slug}
                title={guide.t.title}
                category={category.t.name}
                difficulty={guide.t.difficulty || guide.difficulty}
                time={guide.t.estimatedTime || guide.estimatedTime}
                summary={guide.t.quickAnswer}
                cta={home("readGuide")}
              />
            </li>
          ))}
        </ul>
        <PrevNextPagination
          currentPage={page}
          totalPages={totalPages}
          previousHref={page > 1 ? listPageHref(categoryPath, page - 1) : null}
          nextHref={page < totalPages ? listPageHref(categoryPath, page + 1) : null}
          previousLabel={pager("previous")}
          nextLabel={pager("next")}
          pageOfLabel={pager("pageOf", { current: page, total: totalPages })}
        />
      </Section>
      <CtaBand
        title={home("ctaTitle")}
        body={home("ctaBody")}
        quote={home("ctaQuote")}
        ai={home("ctaAi")}
        whatsapp={cta("whatsapp")}
        aiHref={`/${locale}#alnajah-ai`}
      />
    </PageShell>
  );
}

async function DiyGuideView({ locale, slug }: { locale: string; slug: string }) {
  const guide = await getGuideBySlug(slug, locale);
  if (!guide) notFound();
  const t = await getTranslations("Diy");
  const nav = await getTranslations("Nav");
  const cta = await getTranslations("Cta");
  const home = await getTranslations("Home");
  const tools = parseJson<string[]>(guide.t.tools, []);
  const materials = parseJson<string[]>(guide.t.materials, []);
  const steps = parseJson<string[]>(guide.t.steps, []);
  const faqs = parseFaqJson(guide.t.faq);
  const categoryPublicSlug = diyCategoryPathSlug(locale, guide.categorySlug);
  const relatedSlugs = parseJson<string[]>(guide.relatedSlugs, []);
  const published = await getPublishedGuides(locale);
  const relatedPublic = new Set(relatedSlugs.map((s) => diyPathSlug(locale, s)));
  const relatedGuides = published.filter((row) => relatedPublic.has(row.slug) && row.slug !== guide.slug);
  const [questions, feedback] = await Promise.all([
    getApprovedGuideQuestions(guide.id),
    getApprovedGuideFeedback(guide.id),
  ]);
  const useHowTo = guide.schemaType === "howto" && guide.riskLevel === "green" && steps.length >= 2;
  const difficulty = guide.t.difficulty || guide.difficulty;
  const estimatedTime = guide.t.estimatedTime || guide.estimatedTime;
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
            { href: "/diy", label: t("title") },
            ...(guide.categoryT
              ? [{ href: `/diy/${categoryPublicSlug}`, label: guide.categoryT.name }]
              : []),
            { href: `/diy/${guide.slug}`, label: guide.t.title },
          ]}
        />
      }
    >
      {useHowTo ? (
        <JsonLd
          data={howToJsonLd({
            name: guide.t.title,
            description: guide.t.quickAnswer,
            steps,
          })}
        />
      ) : null}
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: "Home", path: "/" },
            { name: "DIY", path: "/diy" },
            ...(guide.categoryT
              ? [{ name: guide.categoryT.name, path: `/diy/${categoryPublicSlug}` }]
              : []),
            { name: guide.t.title, path: `/diy/${guide.slug}` },
          ],
          locale,
        )}
      />
      <JsonLd data={faqJsonLd(faqs)} />

      <PublicHero locale={locale}
        kicker={guide.categoryT?.name || t("title")}
        title={guide.t.title}
        lead={guide.t.problem}
        heroImage={topicWebpForDiyCategory(guide.categorySlug)}
        imageAlt={altForTopic(
          locale === "ar" ? "ar" : "en",
          guide.categoryT?.name || guide.categorySlug,
          guide.categoryT?.name || guide.categorySlug,
        )}
        shareUrl={publicCanonical(locale, `/diy/${guide.slug}`)}
        shareLabel={home("share")}
        copiedLabel={home("copied")}
        meta={
          <p>
            {t("difficulty")}: {difficulty} · {t("time")}: {estimatedTime}
          </p>
        }
      />

      <Section>
        <ProseCard title={t("quickAnswer")}>{guide.t.quickAnswer}</ProseCard>
        <div className="mt-4">
          <ProseCard title={t("safety")}>{guide.t.safety}</ProseCard>
        </div>
        {tools.length ? (
          <div className="mt-8">
            <h2 className="font-semibold text-navy">{t("tools")}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {tools.map((item) => (
                <li key={item} className="rounded-full bg-sand px-3 py-1 text-sm text-navy">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {materials.length ? (
          <div className="mt-8">
            <h2 className="font-semibold text-navy">{t("materials")}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {materials.map((item) => (
                <li key={item} className="rounded-full bg-sand px-3 py-1 text-sm text-navy">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      {steps.length ? (
        <Section tone="sand">
          <SectionHeader title={t("steps")} />
          <ol className="mt-8 grid gap-4">
            {steps.map((step, index) => (
              <li key={step} className="rounded-xl border border-line bg-white p-5">
                <p className="text-xs font-medium text-accent">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step}</p>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      <Section>
        <div className="grid gap-4">
          {guide.t.checkWork ? <ProseCard title={t("check")}>{guide.t.checkWork}</ProseCard> : null}
          <ProseCard title={t("stop")}>{guide.t.whenToStop}</ProseCard>
          <ProseCard title={t("fallback")}>{guide.t.professionalFallback}</ProseCard>
        </div>
        <div className="mt-8">
          <CtaRow labels={ctaLabels} />
        </div>
      </Section>

      {guide.serviceT && guide.service ? (
        <Section tone="sand">
          <SectionHeader title={t("relatedService")} />
          <div className="mt-8 max-w-lg">
            <ServiceCard
              slug={guide.service.slug}
              name={guide.serviceT.name}
              description={guide.serviceT.shortDescription}
              cta={home("viewService")}
            />
          </div>
        </Section>
      ) : null}

      {relatedGuides.length ? (
        <Section>
          <SectionHeader title={t("relatedGuides")} />
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {relatedGuides.map((rel) => (
              <li key={rel.slug}>
                <DiyCard
                  slug={rel.slug}
                  title={rel.t.title}
                  category={rel.categoryT?.name}
                  difficulty={rel.t.difficulty || rel.difficulty}
                  time={rel.t.estimatedTime || rel.estimatedTime}
                  summary={rel.t.quickAnswer}
                  cta={home("readGuide")}
                />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section>
        <VoteButtons guideId={guide.id} />
        <div className="mt-10">
          <h2 className="text-[1.5rem] font-semibold text-navy">{t("readerTitleSection")}</h2>
          {feedback.length ? (
            <ul className="mt-4 grid gap-3">
              {feedback.map((item) => (
                <li key={item.id} className="rounded-xl border border-line bg-white p-4">
                  <p className="text-sm font-medium text-navy">
                    {item.authorName} · {item.stars}/5
                  </p>
                  {item.title ? <p className="mt-1 font-medium">{item.title}</p> : null}
                  <p className="mt-2 text-sm text-muted">{item.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState body={t("readerEmpty")} />
            </div>
          )}
          <GuideReaderFeedback guideSlug={guide.slug} />
        </div>
        <div className="mt-10">
          <h2 className="text-[1.5rem] font-semibold text-navy">{t("qaTitle")}</h2>
          {questions.length ? (
            <dl className="mt-4 grid gap-3">
              {questions.map((item) => (
                <div key={item.id} className="rounded-xl border border-line bg-white p-5">
                  <dt className="font-medium text-navy">{item.body}</dt>
                  <dd className="mt-2 text-sm text-muted">{item.answer}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="mt-4">
              <EmptyState body={t("qaEmpty")} />
            </div>
          )}
          <QuestionForm locale={locale} guideSlug={guide.slug} />
        </div>
        <div className="mt-8">
          <Disclaimer>{siteConfig.disclaimers.diy[locale === "ar" ? "ar" : "en"]}</Disclaimer>
        </div>
        {faqs.length ? (
          <div className="mt-10">
            <h2 className="text-[1.5rem] font-semibold text-navy">FAQ</h2>
            <div className="mt-6">
              <FaqList items={faqs} />
            </div>
          </div>
        ) : null}
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
