-- A4.2: DiyGuide profileJson + Service.primaryDiyGuideId
CREATE TYPE "DiyProfileStatus" AS ENUM ('draft', 'safety_review', 'translation_review', 'approved', 'published', 'archived');
CREATE TYPE "DiyArabicReviewStatus" AS ENUM ('not_started', 'translation_review', 'ready_for_translation', 'reviewed');

ALTER TABLE "DiyGuide" ADD COLUMN IF NOT EXISTS "profileJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "DiyGuide" ADD COLUMN IF NOT EXISTS "profileStatus" "DiyProfileStatus" NOT NULL DEFAULT 'draft';
ALTER TABLE "DiyGuide" ADD COLUMN IF NOT EXISTS "profileVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DiyGuide" ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DiyGuide" ADD COLUMN IF NOT EXISTS "arabicReviewStatus" "DiyArabicReviewStatus" NOT NULL DEFAULT 'not_started';
ALTER TABLE "DiyGuide" ADD COLUMN IF NOT EXISTS "safetyReviewedBy" TEXT;
ALTER TABLE "DiyGuide" ADD COLUMN IF NOT EXISTS "safetyReviewedAt" TIMESTAMP(3);
ALTER TABLE "DiyGuide" ADD COLUMN IF NOT EXISTS "createdBy" TEXT NOT NULL DEFAULT 'system';
ALTER TABLE "DiyGuide" ADD COLUMN IF NOT EXISTS "updatedBy" TEXT NOT NULL DEFAULT 'system';

ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "primaryDiyGuideId" TEXT;

CREATE INDEX IF NOT EXISTS "DiyGuide_serviceId_isPrimary_idx" ON "DiyGuide"("serviceId", "isPrimary");
CREATE INDEX IF NOT EXISTS "DiyGuide_profileStatus_idx" ON "DiyGuide"("profileStatus");

DO $$ BEGIN
  ALTER TABLE "Service" ADD CONSTRAINT "Service_primaryDiyGuideId_fkey"
    FOREIGN KEY ("primaryDiyGuideId") REFERENCES "DiyGuide"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
