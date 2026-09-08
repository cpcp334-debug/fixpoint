-- Phase 2F.5.4: minimal AMC admin fields. Renewal scan uses status + endDate.
ALTER TABLE "AmcContract" ADD COLUMN "reference" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AmcContract" ADD COLUMN "locationLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AmcContract" ADD COLUMN "notes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AmcContract" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "AmcContract" ADD COLUMN "assignedStaffId" TEXT;

CREATE INDEX "AmcContract_status_endDate_idx" ON "AmcContract"("status", "endDate");
