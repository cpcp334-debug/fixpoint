import { prisma } from "../src/server/db";

function words(s: string) {
  return (s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function parseFaq(raw: string): Array<{ q?: string; a?: string; question?: string; answer?: string }> {
  try {
    const j = JSON.parse(raw || "[]");
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

async function main() {
  const rows = await prisma.article.findMany({
    include: { translations: true },
    orderBy: { slug: "asc" },
  });

  const byStatus: Record<string, number> = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;

  const summary = rows.map((r) => {
    const en = r.translations.find((t) => t.locale === "en");
    const ar = r.translations.find((t) => t.locale === "ar");
    const enFaq = parseFaq(en?.faq || "[]");
    const arFaq = parseFaq(ar?.faq || "[]");
    const faqAnsEn = enFaq.map((x) => x.a || x.answer || "").join(" ");
    const faqAnsAr = arFaq.map((x) => x.a || x.answer || "").join(" ");
    const enW = words(`${en?.body || ""} ${en?.diySection || ""} ${faqAnsEn}`);
    const arW = words(`${ar?.body || ""} ${ar?.diySection || ""} ${faqAnsAr}`);
    const img = r.heroImage || "";
    return {
      id: r.id,
      slug: r.slug,
      status: r.status,
      indexable: r.indexable,
      enTitle: en?.title || null,
      arTitle: ar?.title || null,
      enSeo: en?.seoTitle || null,
      arSeo: ar?.seoTitle || null,
      enW,
      arW,
      enFaq: enFaq.length,
      arFaq: arFaq.length,
      image: img || null,
      webp: /\.webp($|\?)/i.test(img),
      enAlt: !!(en?.imageAlt || "").trim(),
      arAlt: !!(ar?.imageAlt || "").trim(),
      hasDiyEn: !!(en?.diySection || "").trim(),
      hasDiyAr: !!(ar?.diySection || "").trim(),
      enMetaOk: (en?.metaDescription || "").trim().length >= 50,
      arMetaOk: (ar?.metaDescription || "").trim().length >= 50,
      enSeoOk: (en?.seoTitle || "").trim().length >= 20,
      arSeoOk: (ar?.seoTitle || "").trim().length >= 20,
    };
  });

  console.log(
    JSON.stringify(
      {
        total: rows.length,
        byStatus,
        passWordBoth: summary.filter((s) => s.enW >= 1000 && s.arW >= 1000).length,
        webp: summary.filter((s) => s.webp).length,
        withImage: summary.filter((s) => s.image).length,
        bothAlt: summary.filter((s) => s.enAlt && s.arAlt).length,
        bothFaq6: summary.filter((s) => s.enFaq >= 6 && s.arFaq >= 6).length,
      },
      null,
      2,
    ),
  );
  console.log("---ROWS---");
  for (const s of summary) {
    console.log(
      [
        s.slug,
        s.status,
        `en=${s.enW}`,
        `ar=${s.arW}`,
        s.webp ? "webp" : "no-webp",
        s.image ? "img" : "no-img",
        s.enAlt && s.arAlt ? "altOK" : "altFAIL",
        `faq ${s.enFaq}/${s.arFaq}`,
        s.enSeo || "",
      ].join(" | "),
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
