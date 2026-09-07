-- AlterEnum
ALTER TYPE "ReviewType" ADD VALUE 'guide';

-- CreateTable
CREATE TABLE "DiyCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "indexable" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiyCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiyCategoryI18n" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "metaDescription" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "DiyCategoryI18n_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiyCategory_slug_key" ON "DiyCategory"("slug");
CREATE UNIQUE INDEX "DiyCategoryI18n_categoryId_locale_key" ON "DiyCategoryI18n"("categoryId", "locale");

ALTER TABLE "DiyCategoryI18n" ADD CONSTRAINT "DiyCategoryI18n_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DiyCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "DiyCategory" ("id", "slug", "status", "indexable", "sortOrder", "createdAt", "updatedAt") VALUES
  ('diy_cat_plumbing', 'plumbing', 'published', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('diy_cat_ac', 'ac', 'published', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "DiyCategoryI18n" ("id", "categoryId", "locale", "name", "description", "seoTitle", "metaDescription") VALUES
  ('diy_cat_plumbing_en', 'diy_cat_plumbing', 'en', 'Plumbing', 'Low-risk tap and water guides. Stop and book a plumber when isolation fails or water reaches the wall.', 'Plumbing DIY | ALNAJAH ALDAEM', 'Educational plumbing guides for simple tap jobs in the UAE. Not a substitute for a plumber when work is unclear or hazardous.'),
  ('diy_cat_plumbing_ar', 'diy_cat_plumbing', 'ar', 'السباكة', 'أدلة منخفضة الخطورة للحنفية والماء. توقف واحجز سباكاً إذا فشل العزل أو وصل الماء إلى الجدار.', 'إرشاد السباكة | النجاح الدائم', 'أدلة سباكة تعليمية لأعمال الحنفية البسيطة في الإمارات. ليست بديلاً عن السباك عندما يكون العمل غير واضح أو خطراً.'),
  ('diy_cat_ac_en', 'diy_cat_ac', 'en', 'Air conditioning', 'Filter cleaning only when the unit is off and reachable. No refrigerant or electrical DIY.', 'AC DIY | ALNAJAH ALDAEM', 'Educational AC filter guidance for UAE homes. Not for refrigerant, electrical, or high-unit work.'),
  ('diy_cat_ac_ar', 'diy_cat_ac', 'ar', 'التكييف', 'تنظيف الفلتر فقط والوحدة مطفأة وفي متناول اليد. لا إرشاد لوسيط التبريد أو الكهرباء.', 'إرشاد التكييف | النجاح الدائم', 'إرشاد تعليمي لفلتر التكييف في الإمارات. ليس لأعمال وسيط التبريد أو الكهرباء أو الوحدات المرتفعة.');

-- AlterTable
ALTER TABLE "DiyGuide" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "DiyGuide" ADD COLUMN "schemaType" TEXT NOT NULL DEFAULT 'article';
ALTER TABLE "DiyGuide" ADD COLUMN "relatedServiceSlugs" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "DiyGuide" ADD COLUMN "locationSlugs" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "DiyGuide" ADD COLUMN "publishedAt" TIMESTAMP(3);

UPDATE "DiyGuide" SET "categoryId" = 'diy_cat_plumbing' WHERE "categorySlug" = 'plumbing';
UPDATE "DiyGuide" SET "categoryId" = 'diy_cat_ac' WHERE "categorySlug" = 'ac';
UPDATE "DiyGuide" SET "schemaType" = 'howto', "publishedAt" = "createdAt" WHERE "status" = 'published';

ALTER TABLE "DiyGuide" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "DiyGuide" ADD CONSTRAINT "DiyGuide_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DiyCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DiyGuideI18n" ADD COLUMN "difficulty" TEXT NOT NULL DEFAULT '';
ALTER TABLE "DiyGuideI18n" ADD COLUMN "estimatedTime" TEXT NOT NULL DEFAULT '';

UPDATE "DiyGuideI18n" AS i
SET "difficulty" = g."difficulty",
    "estimatedTime" = g."estimatedTime"
FROM "DiyGuide" AS g
WHERE i."guideId" = g."id";
