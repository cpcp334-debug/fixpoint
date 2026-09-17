import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";
import { SIMILARITY_THRESHOLD, tokenOverlapRatio } from "../src/lib/service-location/content-similarity";

function textOf(t: { body: string; diySection: string; faq: string }) {
  let faqAns = "";
  try {
    const faq = JSON.parse(t.faq || "[]") as Array<{ a?: string; answer?: string }>;
    faqAns = faq.map((x) => x.a || x.answer || "").join(" ");
  } catch {
    faqAns = "";
  }
  return `${t.body}\n${t.diySection}\n${faqAns}`;
}

async function main() {
  const rows = await prisma.article.findMany({
    where: { status: "published" },
    include: { translations: true },
    orderBy: { slug: "asc" },
  });

  const en = rows.map((r) => {
    const t = r.translations.find((x) => x.locale === "en")!;
    return { slug: r.slug, text: textOf(t) };
  });

  const hits: Array<{ a: string; b: string; ratio: number }> = [];
  for (let i = 0; i < en.length; i++) {
    for (let j = i + 1; j < en.length; j++) {
      const ratio = tokenOverlapRatio(en[i]!.text, en[j]!.text);
      if (ratio >= SIMILARITY_THRESHOLD) hits.push({ a: en[i]!.slug, b: en[j]!.slug, ratio });
    }
  }

  const claimRe = /\b(best|#1|number one|cheapest|guaranteed|certified|licensed|24\/7|fastest|official)\b/i;
  const fillerRe = /\b(ambergris|bamboo|birch|calcite|camphor|densifier|editorialintent|rawambergris|agedbamboo|mattemarble)\b/i;
  const claimHits: string[] = [];
  const fillerHits: string[] = [];
  for (const r of rows) {
    for (const t of r.translations) {
      const blob = [t.title, t.body, t.diySection, t.seoTitle, t.metaDescription].join("\n");
      if (claimRe.test(blob)) claimHits.push(`${r.slug}:${t.locale}`);
      if (fillerRe.test(blob) || /raw[a-z]{6,}|aged[a-z]{6,}|fine[a-z]{6,}/i.test(t.body)) {
        fillerHits.push(`${r.slug}:${t.locale}`);
      }
    }
  }

  const out = {
    articles: rows.length,
    threshold: SIMILARITY_THRESHOLD,
    blockingPairs: hits.length,
    hits: hits.slice(0, 20),
    claimCount: claimHits.length,
    claimHits: claimHits.slice(0, 40),
    fillerCount: fillerHits.length,
    fillerHits: fillerHits.slice(0, 40),
  };
  writeFileSync(join(process.cwd(), "docs", "_blog-gate-audit.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
