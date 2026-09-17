/**
 * Idempotent schema patches for local PGlite (prisma/pgdata).
 * PGlite DBs are often created via db push/seed without migrate history;
 * blog queries need Article.categorySlugs and related columns from schema catchup.
 */
import { prisma } from "../src/server/db";

const ARTICLE_PATCHES = [
  `ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "categorySlugs" TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "heroImage" TEXT`,
  `ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3)`,
  `ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "relatedDiySlugs" TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "relatedServiceSlugs" TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "ArticleI18n" ADD COLUMN IF NOT EXISTS "diySection" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "ArticleI18n" ADD COLUMN IF NOT EXISTS "faq" TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "ArticleI18n" ADD COLUMN IF NOT EXISTS "imageAlt" TEXT NOT NULL DEFAULT ''`,
];

async function main() {
  const url = process.env.DATABASE_URL || "";
  const isLocalPglite = /127\.0\.0\.1:5433|localhost:5433/.test(url);
  if (!isLocalPglite) {
    console.log("ensure-pglite-schema: skip (not local PGlite DATABASE_URL)");
    return;
  }

  for (const sql of ARTICLE_PATCHES) {
    await prisma.$executeRawUnsafe(sql);
  }

  await prisma.article.findMany({ take: 1, select: { slug: true, categorySlugs: true } });
  console.log("ensure-pglite-schema: Article columns OK");
}

main()
  .catch((e) => {
    console.error("ensure-pglite-schema failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
