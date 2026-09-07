-- Phase 2F.2: explainable lead quality. Unused LeadScore stub is expanded; no rows expected.
ALTER TABLE "LeadScore" DROP COLUMN "band";
ALTER TABLE "LeadScore" DROP COLUMN "explanation";

CREATE TYPE "LeadQualityClass" AS ENUM ('HOT', 'WARM', 'NORMAL', 'REVIEW', 'SPAM');
CREATE TYPE "LeadScoreCause" AS ENUM ('SYSTEM', 'OVERRIDE', 'RECOMPUTE');

ALTER TABLE "LeadScore" ADD COLUMN "systemClass" "LeadQualityClass" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "LeadScore" ADD COLUMN "humanClass" "LeadQualityClass";
ALTER TABLE "LeadScore" ADD COLUMN "effectiveClass" "LeadQualityClass" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "LeadScore" ADD COLUMN "reasonsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "LeadScore" ADD COLUMN "modelVersion" TEXT NOT NULL DEFAULT '2f2.1';
ALTER TABLE "LeadScore" ADD COLUMN "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "LeadScore" ADD COLUMN "overrideAt" TIMESTAMP(3);
ALTER TABLE "LeadScore" ADD COLUMN "overrideBy" TEXT;
ALTER TABLE "LeadScore" ADD COLUMN "overrideNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LeadScore" ADD COLUMN "quarantined" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "LeadScoreHistory" (
    "id" TEXT NOT NULL,
    "leadScoreId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "systemClass" "LeadQualityClass" NOT NULL,
    "effectiveClass" "LeadQualityClass" NOT NULL,
    "reasonsJson" TEXT NOT NULL DEFAULT '[]',
    "actor" TEXT NOT NULL,
    "cause" "LeadScoreCause" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadScoreHistory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "LeadScoreHistory" ADD CONSTRAINT "LeadScoreHistory_leadScoreId_fkey" FOREIGN KEY ("leadScoreId") REFERENCES "LeadScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "LeadScore_effectiveClass_idx" ON "LeadScore"("effectiveClass");
CREATE INDEX "LeadScore_quarantined_idx" ON "LeadScore"("quarantined");
CREATE INDEX "LeadScoreHistory_leadId_createdAt_idx" ON "LeadScoreHistory"("leadId", "createdAt");
