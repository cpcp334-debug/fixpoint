import { prisma } from "../src/server/db";

async function main() {
  const a = await prisma.article.findFirst({
    where: { slug: "abu-dhabi-dust-and-ac-filter-habits" },
    include: { translations: true },
  });
  if (!a) throw new Error("missing");
  const en = a.translations.find((t) => t.locale === "en")!;
  const body = (en.body || "").replace(/\n\n## Exclusive editorial lexicon[\s\S]*$/i, "").trim();
  console.log("LEN", body.length);
  console.log("---HEAD---");
  console.log(body.slice(0, 700));
  console.log("---TAIL---");
  console.log(body.slice(-700));
  console.log("CATS", a.categorySlugs, "IMG", a.heroImage);
  console.log("SEO", en.seoTitle);
  console.log("TITLE", en.title);
  console.log("DIY", (en.diySection || "").slice(0, 300));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
