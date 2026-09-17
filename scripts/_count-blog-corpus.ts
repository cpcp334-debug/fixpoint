import { prisma } from "../src/server/db";

async function main() {
  const articles = await prisma.article.count();
  const blog = await prisma.article.count({ where: { NOT: [{ slug: { startsWith: "faq-" } }] } });
  const pub = await prisma.article.count({
    where: { status: "published", indexable: true, NOT: [{ slug: { startsWith: "faq-" } }] },
  });
  const bySlug = await prisma.article.groupBy({
    by: ["status"],
    where: { NOT: [{ slug: { startsWith: "faq-" } }] },
    _count: true,
  });
  let jobStats: unknown = null;
  try {
    jobStats = await prisma.contentGenerationJob.groupBy({ by: ["status", "kind"], _count: true });
  } catch (e) {
    jobStats = { error: String(e) };
  }
  const sl = await prisma.serviceLocation.count();
  console.log(JSON.stringify({ articles, blogArticles: blog, publishedBlog: pub, bySlug, jobStats, serviceLocations: sl }, null, 2));
}

main()
  .finally(() => prisma.$disconnect());
