import { prisma } from "../src/server/db";

async function main() {
  const [faqRows, faqArticles, faqPubArticles, blogs] = await Promise.all([
    prisma.faq.count(),
    prisma.article.count({ where: { slug: { startsWith: "faq-" } } }),
    prisma.article.count({
      where: { slug: { startsWith: "faq-" }, status: "published", indexable: true },
    }),
    prisma.article.count({
      where: { status: "published", NOT: [{ slug: { startsWith: "faq-" } }] },
    }),
  ]);
  console.log(JSON.stringify({ faqRows, faqArticles, faqPubArticles, blogs }, null, 2));
}

main().finally(() => prisma.$disconnect());
