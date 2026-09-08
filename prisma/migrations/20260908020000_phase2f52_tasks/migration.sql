-- Phase 2F.5.2: task inbox fields. No CRM event tables.
ALTER TABLE "OpsTask" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "OpsTask" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'automation';
CREATE INDEX "OpsTask_priority_idx" ON "OpsTask"("priority");
