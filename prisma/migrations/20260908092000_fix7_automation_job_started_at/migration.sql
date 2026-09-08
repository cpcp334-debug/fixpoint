-- FIX 7: AutomationJob lease for stuck-running recovery
ALTER TABLE "AutomationJob" ADD COLUMN "startedAt" TIMESTAMP(3);

CREATE INDEX "AutomationJob_status_startedAt_idx" ON "AutomationJob"("status", "startedAt");
