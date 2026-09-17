import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/server/db";

function stripFiller(body: string) {
  return body
    .replace(/\n\n## Exclusive editorial lexicon[\s\S]*$/i, "")
    .replace(/\n\n## مفردات تحريرية حصرية[\s\S]*$/i, "")
    .trim();
}

function words(s: string) {
  return (s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function faqAnswers(raw: string) {
  try {
    const faq = JSON.parse(raw || "[]") as Array<{ a?: string; answer?: string }>;
    return faq.map((x) => x.a || x.answer || "").join(" ");
  } catch {
    return "";
  }
}

async function main() {
  const rows = await prisma.article.findMany({ include: { translations: true }, orderBy: { slug: "asc" } });
  const report = [];
  for (const r of rows) {
    const en = r.translations.find((t) => t.locale === "en");
    const ar = r.translations.find((t) => t.locale === "ar");
    const enBody = stripFiller(en?.body || "");
    const arBody = stripFiller(ar?.body || "");
    const enW = words(`${enBody} ${en?.diySection || ""} ${faqAnswers(en?.faq || "[]")}`);
    const arW = words(`${arBody} ${ar?.diySection || ""} ${faqAnswers(ar?.faq || "[]")}`);
    report.push({
      slug: r.slug,
      enW,
      arW,
      enPass: enW >= 1000,
      arPass: arW >= 1000,
      both: enW >= 1000 && arW >= 1000,
    });
  }
  const both = report.filter((x) => x.both).length;
  const enOnly = report.filter((x) => x.enPass && !x.arPass).length;
  const arOnly = report.filter((x) => x.arPass && !x.enPass).length;
  const fail = report.filter((x) => !x.both).length;
  console.log(JSON.stringify({ total: report.length, bothPass: both, enOnly, arOnly, failBothOrOne: fail, minEn: Math.min(...report.map((x) => x.enW)), minAr: Math.min(...report.map((x) => x.arW)) }, null, 2));
  writeFileSync(join(process.cwd(), "docs", "_blog-words-without-filler.json"), JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
