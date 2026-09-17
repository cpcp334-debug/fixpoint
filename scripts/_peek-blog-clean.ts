import { prisma } from "../src/server/db";

function clean(body: string) {
  return body
    .replace(/\n\n## Exclusive editorial lexicon[\s\S]*$/i, "")
    .replace(/\n\n## مفردات تحريرية حصرية[\s\S]*$/i, "")
    .replace(/\n\n## Extra field note \d+ for [\s\S]*?(?=\n\n## |$)/gi, "")
    .replace(/\n\n## ملاحظة ميدانية إضافية \d+[\s\S]*?(?=\n\n## |$)/gi, "")
    .trim();
}

function words(s: string) {
  return s.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

async function main() {
  const a = await prisma.article.findFirst({
    where: { slug: "abu-dhabi-dust-and-ac-filter-habits" },
    include: { translations: true },
  });
  const en = a!.translations.find((t) => t.locale === "en")!;
  const cleaned = clean(en.body);
  console.log("cleaned words body", words(cleaned));
  console.log("has extra notes", /Extra field note/i.test(en.body));
  console.log("note count", (en.body.match(/## Extra field note/gi) || []).length);
  console.log("--- cleaned tail ---");
  console.log(cleaned.slice(-500));
  console.log("--- headings ---");
  console.log(
    cleaned
      .split("\n")
      .filter((l) => l.startsWith("## "))
      .join("\n"),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
