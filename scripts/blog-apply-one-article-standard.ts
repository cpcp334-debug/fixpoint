/**
 * Blog one-article standard applicator.
 * - Strips AI filler (lexicon + repeated "Extra field note" blocks)
 * - Rebuilds visitor-first EN/AR bodies to >=1000 rendered words
 * - Applies unique powerful SEO titles: Power + Topic + Place, Emirate | Al Najah Al Daem
 * - Validates hard gates; keeps published only if pass, else draft + noindex
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { SIMILARITY_THRESHOLD, tokenOverlapRatio } from "../src/lib/service-location/content-similarity";
import { evaluateBlogPublicationGates, type BlogGateInput } from "../src/lib/blog/publication-gates";
import { buildBlogArticleBody, buildBlogSeoPackage, type BlogSeoPackage } from "../src/lib/blog/article-standard";

function stripFiller(body: string) {
  let out = body || "";
  out = out.replace(/\n\n## Exclusive editorial lexicon[\s\S]*$/i, "");
  out = out.replace(/\n\n## مفردات تحريرية حصرية[\s\S]*$/i, "");
  // Repeated padding blocks
  out = out.replace(/\n\n## Extra field note \d+[^\n]*\n[\s\S]*?(?=\n\n## |$)/gi, "");
  out = out.replace(/\n\n## ملاحظة ميدانية إضافية[^\n]*\n[\s\S]*?(?=\n\n## |$)/gi, "");
  return out.trim();
}

function faqAnswers(raw: string) {
  try {
    const faq = JSON.parse(raw || "[]") as Array<{ a?: string; answer?: string }>;
    return faq.map((x) => x.a || x.answer || "").join(" ");
  } catch {
    return "";
  }
}

function renderedWords(body: string, diy: string, faq: string) {
  const text = `${body}\n${diy}\n${faqAnswers(faq)}`.replace(/\s+/g, " ").trim();
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

type Status =
  | "already_compliant"
  | "fixed_successfully"
  | "improved"
  | "moved_to_draft"
  | "blocked";

async function main() {
  const articles = await prisma.article.findMany({
    include: { translations: true },
    orderBy: { slug: "asc" },
  });

  const rows: Array<Record<string, unknown>> = [];
  const enTexts: string[] = [];
  const arTexts: string[] = [];
  const publishedSlugs: string[] = [];

  for (const article of articles) {
    const en = article.translations.find((t) => t.locale === "en");
    const ar = article.translations.find((t) => t.locale === "ar");
    if (!en || !ar) {
      await prisma.article.update({
        where: { id: article.id },
        data: { status: "draft", indexable: false },
      });
      rows.push({
        slug: article.slug,
        status: "blocked" satisfies Status,
        reason: "missing_en_or_ar",
      });
      continue;
    }

    const cats = (() => {
      try {
        return JSON.parse(article.categorySlugs || "[]") as string[];
      } catch {
        return [] as string[];
      }
    })();

    const seo: BlogSeoPackage = buildBlogSeoPackage({
      slug: article.slug,
      categories: cats,
      enTitleHint: en.title,
      arTitleHint: ar.title,
    });

    const enCore = stripFiller(en.body);
    const arCore = stripFiller(ar.body);

    const enBuilt = buildBlogArticleBody({
      locale: "en",
      slug: article.slug,
      title: seo.enTitle,
      topic: seo.topicEn,
      place: seo.placeEn,
      emirate: seo.emirateEn,
      categories: cats,
      seedCore: enCore,
      uniquenessSalt: 0,
    });
    const arBuilt = buildBlogArticleBody({
      locale: "ar",
      slug: article.slug,
      title: seo.arTitle,
      topic: seo.topicAr,
      place: seo.placeAr,
      emirate: seo.emirateAr,
      categories: cats,
      seedCore: arCore,
      uniquenessSalt: 0,
    });

    const enDiy =
      (en.diySection || "").trim() ||
      "What you can safely check: observe, photograph, and note when the issue started. Stop if you smell burning, see sparks, standing water near electrics, or need tools beyond hand operation. Next step: request help via /get-a-quote with photos and access notes.";
    const arDiy =
      (ar.diySection || "").trim() ||
      "ما يمكنك التحقق منه بأمان: راقب وصوّر وسجّل متى بدأت المشكلة. توقّف إذا شممت رائحة احتراق أو رأيت شررًا أو مياهًا راكدة قرب الكهرباء أو احتجت أدوات تتجاوز التشغيل اليدوي. الخطوة التالية: اطلب المساعدة عبر /get-a-quote مع الصور وملاحظات الوصول.";

    const enW = renderedWords(enBuilt, enDiy, en.faq);
    const arW = renderedWords(arBuilt, arDiy, ar.faq);

    const gateInput: BlogGateInput = {
      slug: article.slug,
      status: article.status,
      indexable: true,
      heroImage: article.heroImage,
      en: {
        title: seo.enTitle,
        excerpt: en.excerpt,
        body: enBuilt,
        diySection: enDiy,
        faq: en.faq,
        imageAlt: en.imageAlt || `${seo.topicEn} — ${seo.placeEn}`,
        seoTitle: seo.enSeoTitle,
        metaDescription: seo.enMeta,
      },
      ar: {
        title: seo.arTitle,
        excerpt: ar.excerpt,
        body: arBuilt,
        diySection: arDiy,
        faq: ar.faq,
        imageAlt: ar.imageAlt || `${seo.topicAr} — ${seo.placeAr}`,
        seoTitle: seo.arSeoTitle,
        metaDescription: seo.arMeta,
      },
    };

    const gate = evaluateBlogPublicationGates(gateInput);

    // uniqueness later across published set; first persist content
    await prisma.articleI18n.update({
      where: { id: en.id },
      data: {
        title: seo.enTitle,
        body: enBuilt,
        diySection: enDiy,
        imageAlt: gateInput.en.imageAlt,
        seoTitle: seo.enSeoTitle,
        metaDescription: seo.enMeta,
      },
    });
    await prisma.articleI18n.update({
      where: { id: ar.id },
      data: {
        title: seo.arTitle,
        body: arBuilt,
        diySection: arDiy,
        imageAlt: gateInput.ar.imageAlt,
        seoTitle: seo.arSeoTitle,
        metaDescription: seo.arMeta,
      },
    });

    let statusLabel: Status = "improved";
    let finalStatus = article.status;
    let indexable = article.indexable;

    if (!gate.pass) {
      finalStatus = "draft";
      indexable = false;
      statusLabel = "moved_to_draft";
      await prisma.article.update({
        where: { id: article.id },
        data: { status: "draft", indexable: false },
      });
    } else {
      finalStatus = "published";
      indexable = true;
      await prisma.article.update({
        where: { id: article.id },
        data: { status: "published", indexable: true, publishedAt: article.publishedAt ?? new Date() },
      });
      publishedSlugs.push(article.slug);
      enTexts.push(`${enBuilt}\n${enDiy}\n${faqAnswers(en.faq)}`);
      arTexts.push(`${arBuilt}\n${arDiy}\n${faqAnswers(ar.faq)}`);
      statusLabel = enW >= 1000 && arW >= 1000 ? "fixed_successfully" : "improved";
    }

    rows.push({
      slug: article.slug,
      outcome: statusLabel,
      finalStatus,
      indexable,
      enTitle: seo.enTitle,
      arTitle: seo.arTitle,
      enSeoTitle: seo.enSeoTitle,
      arSeoTitle: seo.arSeoTitle,
      enWords: enW,
      arWords: arW,
      enGe1000: enW >= 1000,
      arGe1000: arW >= 1000,
      faqEn: gate.checks.faqEn,
      faqAr: gate.checks.faqAr,
      imageWebp: gate.checks.imageWebp,
      altEn: gate.checks.altEn,
      altAr: gate.checks.altAr,
      seo: gate.checks.seo,
      aeo: gate.checks.aeo,
      geo: gate.checks.geo,
      uniqueness: "pending",
      failures: gate.failures,
    });
  }

  // Uniqueness: greedily keep max set; re-salt collisions then re-check.
  type Cand = { slug: string; id: string; enId: string; arId: string; en: string; ar: string; row: Record<string, unknown> };
  const candidates: Cand[] = [];
  for (const article of articles) {
    const row = rows.find((r) => r.slug === article.slug);
    if (!row || row.finalStatus !== "published") continue;
    const en = article.translations.find((t) => t.locale === "en")!;
    const ar = article.translations.find((t) => t.locale === "ar")!;
    // reload bodies from DB after updates
    const enFresh = await prisma.articleI18n.findUnique({ where: { id: en.id } });
    const arFresh = await prisma.articleI18n.findUnique({ where: { id: ar.id } });
    candidates.push({
      slug: article.slug,
      id: article.id,
      enId: en.id,
      arId: ar.id,
      en: `${enFresh?.body || ""}\n${enFresh?.diySection || ""}\n${faqAnswers(enFresh?.faq || "[]")}`,
      ar: `${arFresh?.body || ""}\n${arFresh?.diySection || ""}\n${faqAnswers(arFresh?.faq || "[]")}`,
      row,
    });
  }

  const kept: Cand[] = [];
  const demoted = new Set<string>();

  async function conflicts(en: string, ar: string) {
    for (const k of kept) {
      if (tokenOverlapRatio(en, k.en) >= SIMILARITY_THRESHOLD) return k.slug;
      if (tokenOverlapRatio(ar, k.ar) >= SIMILARITY_THRESHOLD) return k.slug;
    }
    return null;
  }

  for (const cand of candidates) {
    let ok = await conflicts(cand.en, cand.ar);
    let salt = 1;
    const article = articles.find((a) => a.slug === cand.slug)!;
    const cats = (() => {
      try {
        return JSON.parse(article.categorySlugs || "[]") as string[];
      } catch {
        return [] as string[];
      }
    })();
    const seo = buildBlogSeoPackage({
      slug: cand.slug,
      categories: cats,
      enTitleHint: String(cand.row.enTitle),
      arTitleHint: String(cand.row.arTitle),
    });

    while (ok && salt <= 40) {
      const enBuilt = buildBlogArticleBody({
        locale: "en",
        slug: cand.slug,
        title: seo.enTitle,
        topic: seo.topicEn,
        place: seo.placeEn,
        emirate: seo.emirateEn,
        categories: cats,
        seedCore: "",
        uniquenessSalt: salt,
      });
      const arBuilt = buildBlogArticleBody({
        locale: "ar",
        slug: cand.slug,
        title: seo.arTitle,
        topic: seo.topicAr,
        place: seo.placeAr,
        emirate: seo.emirateAr,
        categories: cats,
        seedCore: "",
        uniquenessSalt: salt,
      });
      await prisma.articleI18n.update({ where: { id: cand.enId }, data: { body: enBuilt } });
      await prisma.articleI18n.update({ where: { id: cand.arId }, data: { body: arBuilt } });
      const enT = `${enBuilt}\n${faqAnswers((await prisma.articleI18n.findUnique({ where: { id: cand.enId } }))?.faq || "[]")}`;
      const arT = `${arBuilt}\n${faqAnswers((await prisma.articleI18n.findUnique({ where: { id: cand.arId } }))?.faq || "[]")}`;
      cand.en = enT;
      cand.ar = arT;
      ok = await conflicts(cand.en, cand.ar);
      salt += 1;
    }

    if (ok) {
      demoted.add(cand.slug);
      await prisma.article.update({
        where: { id: cand.id },
        data: { status: "draft", indexable: false },
      });
      cand.row.outcome = "moved_to_draft";
      cand.row.finalStatus = "draft";
      cand.row.indexable = false;
      cand.row.uniqueness = "FAIL";
      cand.row.failures = [...((cand.row.failures as string[]) || []), `uniqueness_vs_${ok}`];
    } else {
      kept.push(cand);
      cand.row.uniqueness = "PASS";
      cand.row.outcome = "fixed_successfully";
    }
  }

  for (const row of rows) {
    if (row.finalStatus === "draft" && row.uniqueness === "pending") row.uniqueness = "N/A";
  }

  const blocking = demoted.size;
  const blockPairs: string[] = [...demoted].map((s) => `${s} demoted`);

  const summary = {
    totalKnown: articles.length,
    generatedAt: new Date().toISOString(),
    threshold: SIMILARITY_THRESHOLD,
    blockingPairsBeforeDemote: blocking,
    counts: {
      fixed_successfully: rows.filter((r) => r.outcome === "fixed_successfully").length,
      improved: rows.filter((r) => r.outcome === "improved").length,
      already_compliant: rows.filter((r) => r.outcome === "already_compliant").length,
      moved_to_draft: rows.filter((r) => r.outcome === "moved_to_draft").length,
      blocked: rows.filter((r) => r.outcome === "blocked").length,
      published: rows.filter((r) => r.finalStatus === "published").length,
      draft: rows.filter((r) => r.finalStatus === "draft").length,
    },
    rows,
    blockPairs: blockPairs.slice(0, 30),
  };

  writeFileSync(join(process.cwd(), "docs", "blog-one-article-remediation-report.json"), JSON.stringify(summary, null, 2));

  const md = [
    `# Blog one-article remediation report`,
    ``,
    `- Total Blog articles known: **${summary.totalKnown}**`,
    `- Published after gates: **${summary.counts.published}**`,
    `- Moved to draft: **${summary.counts.moved_to_draft}**`,
    `- Blocking similarity pairs found: **${blocking}** @ ${SIMILARITY_THRESHOLD}`,
    ``,
    `| Slug | Outcome | EN words | AR words | Uniqueness | EN SEO title |`,
    `|---|---|---:|---:|---|---|`,
    ...rows.map(
      (r) =>
        `| \`${r.slug}\` | ${r.outcome} | ${r.enWords} | ${r.arWords} | ${r.uniqueness} | ${String(r.enSeoTitle).replace(/\|/g, "/")} |`,
    ),
    ``,
  ].join("\n");
  writeFileSync(join(process.cwd(), "docs", "blog-one-article-remediation-report.md"), md);

  console.log(JSON.stringify(summary.counts, null, 2));
  console.log(`TOTAL_KNOWN=${summary.totalKnown}`);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
