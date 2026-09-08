-- Phase 2G.5: per-staff Co-Founder daily chat usage (Asia/Dubai dayKey).
CREATE TABLE "StaffAiDailyUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAiDailyUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffAiDailyUsage_userId_dayKey_key" ON "StaffAiDailyUsage"("userId", "dayKey");
CREATE INDEX "StaffAiDailyUsage_dayKey_idx" ON "StaffAiDailyUsage"("dayKey");

ALTER TABLE "StaffAiDailyUsage" ADD CONSTRAINT "StaffAiDailyUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
