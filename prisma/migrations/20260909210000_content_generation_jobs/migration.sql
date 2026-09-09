-- Content generation job queue (enums + table + indexes)
CREATE TYPE "ContentGenerationJobStatus" AS ENUM ('pending', 'running', 'succeeded', 'failed', 'dead');
CREATE TYPE "ContentGenerationKind" AS ENUM (
  'diy_profile',
  'service_canonical',
  'service_location_locale',
  'image_asset',
  'sitemap_shard',
  'arabic_locale'
);

CREATE TABLE "ContentGenerationJob" (
  "id" TEXT NOT NULL,
  "kind" "ContentGenerationKind" NOT NULL,
  "status" "ContentGenerationJobStatus" NOT NULL DEFAULT 'pending',
  "serviceId" TEXT,
  "locationId" TEXT,
  "serviceLocationId" TEXT,
  "locale" TEXT,
  "batchKey" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "generationVersion" INTEGER NOT NULL,
  "contentHash" TEXT,
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "payloadJson" TEXT NOT NULL DEFAULT '{}',
  "resultJson" TEXT NOT NULL DEFAULT '{}',
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ContentGenerationJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentGenerationJob_idempotencyKey_key" ON "ContentGenerationJob"("idempotencyKey");
CREATE INDEX "ContentGenerationJob_status_idx" ON "ContentGenerationJob"("status");
CREATE INDEX "ContentGenerationJob_kind_idx" ON "ContentGenerationJob"("kind");
CREATE INDEX "ContentGenerationJob_batchKey_idx" ON "ContentGenerationJob"("batchKey");
CREATE INDEX "ContentGenerationJob_updatedAt_idx" ON "ContentGenerationJob"("updatedAt");
