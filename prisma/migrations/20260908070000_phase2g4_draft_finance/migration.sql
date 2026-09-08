-- Phase 2G.4: Co-Founder draft quote/invoice idempotency. Human records keep sourceKey null.
ALTER TABLE "Quote" ADD COLUMN "sourceKey" TEXT;
CREATE UNIQUE INDEX "Quote_sourceKey_key" ON "Quote"("sourceKey");

ALTER TABLE "Invoice" ADD COLUMN "sourceKey" TEXT;
CREATE UNIQUE INDEX "Invoice_sourceKey_key" ON "Invoice"("sourceKey");
