-- Phase 2F.3: journey indexes and Quote/Invoice foreign keys. No TimelineEvent table.
UPDATE "Quote" SET "leadId" = NULL
WHERE "leadId" IS NOT NULL AND "leadId" NOT IN (SELECT "id" FROM "Lead");

UPDATE "Invoice" SET "quoteId" = NULL
WHERE "quoteId" IS NOT NULL AND "quoteId" NOT IN (SELECT "id" FROM "Quote");

UPDATE "Invoice" SET "bookingId" = NULL
WHERE "bookingId" IS NOT NULL AND "bookingId" NOT IN (SELECT "id" FROM "Booking");

UPDATE "Invoice" SET "workOrderId" = NULL
WHERE "workOrderId" IS NOT NULL AND "workOrderId" NOT IN (SELECT "id" FROM "WorkOrder");

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Lead_customerId_idx" ON "Lead"("customerId");
CREATE INDEX "Quote_leadId_idx" ON "Quote"("leadId");
CREATE INDEX "Quote_customerId_idx" ON "Quote"("customerId");
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");
CREATE INDEX "Invoice_quoteId_idx" ON "Invoice"("quoteId");
CREATE INDEX "Invoice_bookingId_idx" ON "Invoice"("bookingId");
CREATE INDEX "Invoice_workOrderId_idx" ON "Invoice"("workOrderId");
CREATE INDEX "Booking_leadId_idx" ON "Booking"("leadId");
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");
CREATE INDEX "Booking_technicianId_idx" ON "Booking"("technicianId");
CREATE INDEX "WorkOrder_bookingId_idx" ON "WorkOrder"("bookingId");
CREATE INDEX "WorkOrder_customerId_idx" ON "WorkOrder"("customerId");
CREATE INDEX "WorkOrder_technicianId_idx" ON "WorkOrder"("technicianId");
CREATE INDEX "AmcContract_customerId_idx" ON "AmcContract"("customerId");
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
