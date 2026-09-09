-- A3.1 ServiceLocation foundation (additive).
-- Preserves existing ServiceLocation IDs. Does not insert new coverage rows.

CREATE TYPE "ServiceLocationLifecycle" AS ENUM ('draft', 'review', 'approved', 'published', 'archived');
CREATE TYPE "ServiceLocationQualityStatus" AS ENUM ('incomplete', 'ready_for_review', 'approved', 'publishable', 'indexable', 'failed_quality');
CREATE TYPE "ServiceLocationRevisionStatus" AS ENUM ('draft', 'approved', 'published', 'superseded');

ALTER TABLE "ServiceLocation"
  ADD COLUMN "covered" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "coverageStatus" "ServiceLocationLifecycle" NOT NULL DEFAULT 'draft',
  ADD COLUMN "qualityStatus" "ServiceLocationQualityStatus" NOT NULL DEFAULT 'incomplete',
  ADD COLUMN "indexableEn" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "indexableAr" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bookingEnabledOverride" BOOLEAN,
  ADD COLUMN "amcAvailableOverride" BOOLEAN,
  ADD COLUMN "emergencyAvailableOverride" BOOLEAN,
  ADD COLUMN "diyRestricted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "heroImageOverride" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedBy" TEXT;

ALTER TABLE "ServiceLocationI18n"
  ADD COLUMN "h1" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "body" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "directAnswer" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "geoIntro" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "imageAlt" TEXT NOT NULL DEFAULT '';

CREATE TABLE "ServiceLocationRevision" (
    "id" TEXT NOT NULL,
    "serviceLocationId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL DEFAULT 'system',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "changeReason" TEXT NOT NULL DEFAULT '',
    "previousRevisionId" TEXT,
    "status" "ServiceLocationRevisionStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceLocationRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceLocationRevision_serviceLocationId_locale_revisionNumber_key"
  ON "ServiceLocationRevision"("serviceLocationId", "locale", "revisionNumber");
CREATE INDEX "ServiceLocationRevision_serviceLocationId_status_idx"
  ON "ServiceLocationRevision"("serviceLocationId", "status");
CREATE INDEX "ServiceLocationRevision_serviceLocationId_locale_status_idx"
  ON "ServiceLocationRevision"("serviceLocationId", "locale", "status");

ALTER TABLE "ServiceLocationRevision"
  ADD CONSTRAINT "ServiceLocationRevision_serviceLocationId_fkey"
  FOREIGN KEY ("serviceLocationId") REFERENCES "ServiceLocation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ServiceLocation_coverageStatus_indexable_idx" ON "ServiceLocation"("coverageStatus", "indexable");
CREATE INDEX "ServiceLocation_indexable_updatedAt_idx" ON "ServiceLocation"("indexable", "updatedAt");
CREATE INDEX "ServiceLocation_locationId_coverageStatus_idx" ON "ServiceLocation"("locationId", "coverageStatus");
CREATE INDEX "ServiceLocation_serviceId_coverageStatus_idx" ON "ServiceLocation"("serviceId", "coverageStatus");
CREATE INDEX "ServiceLocation_qualityStatus_idx" ON "ServiceLocation"("qualityStatus");

-- Grandfather the existing 49 public pairs: keep IDs, URLs, and indexable flags.
UPDATE "ServiceLocation"
SET
  "covered" = true,
  "coverageStatus" = 'published',
  "qualityStatus" = 'indexable',
  "indexableEn" = true,
  "indexableAr" = true,
  "publishedAt" = COALESCE("publishedAt", "createdAt"),
  "approvedAt" = COALESCE("approvedAt", "createdAt"),
  "approvedBy" = COALESCE("approvedBy", 'a3.1-migration')
WHERE "indexable" = true;

-- Immutable snapshot of current working EN/AR copy (one published revision per locale).
INSERT INTO "ServiceLocationRevision" (
  "id",
  "serviceLocationId",
  "revisionNumber",
  "locale",
  "snapshotJson",
  "generatedBy",
  "approvedBy",
  "approvedAt",
  "changeReason",
  "status"
)
SELECT
  md5(i18n.id || ':a31-rev-1') ,
  i18n."serviceLocationId",
  1,
  i18n.locale,
  json_build_object(
    'locale', i18n.locale,
    'intro', i18n.intro,
    'localInfo', i18n."localInfo",
    'seoTitle', i18n."seoTitle",
    'metaDescription', i18n."metaDescription",
    'faq', i18n.faq,
    'h1', i18n.h1,
    'body', i18n.body,
    'directAnswer', i18n."directAnswer",
    'geoIntro', i18n."geoIntro",
    'imageAlt', i18n."imageAlt"
  )::text,
  'a3.1-migration',
  'a3.1-migration',
  sl."approvedAt",
  'Preserve existing 49 working copies as published revision 1',
  'published'
FROM "ServiceLocationI18n" i18n
INNER JOIN "ServiceLocation" sl ON sl.id = i18n."serviceLocationId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "ServiceLocationRevision" r
  WHERE r."serviceLocationId" = i18n."serviceLocationId"
    AND r.locale = i18n.locale
    AND r."revisionNumber" = 1
);

CREATE OR REPLACE FUNCTION service_location_revision_immutable()
RETURNS trigger AS $$
BEGIN
  IF NEW."snapshotJson" IS DISTINCT FROM OLD."snapshotJson"
     OR NEW."revisionNumber" IS DISTINCT FROM OLD."revisionNumber"
     OR NEW."locale" IS DISTINCT FROM OLD."locale"
     OR NEW."serviceLocationId" IS DISTINCT FROM OLD."serviceLocationId"
     OR NEW."generatedBy" IS DISTINCT FROM OLD."generatedBy"
     OR NEW."previousRevisionId" IS DISTINCT FROM OLD."previousRevisionId"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  THEN
    RAISE EXCEPTION 'ServiceLocationRevision snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER service_location_revision_immutable_trg
BEFORE UPDATE ON "ServiceLocationRevision"
FOR EACH ROW
EXECUTE PROCEDURE service_location_revision_immutable();
