CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

ALTER TABLE "Quote" ADD COLUMN "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Quote" ADD COLUMN "serviceId" TEXT;
ALTER TABLE "Quote" ADD COLUMN "locationId" TEXT;
ALTER TABLE "Quote" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "Quote" ADD COLUMN "customerName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Quote" ADD COLUMN "customerPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Quote" ADD COLUMN "customerEmail" TEXT;
ALTER TABLE "Quote" ADD COLUMN "notes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Quote" ADD COLUMN "subtotalLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Quote" ADD COLUMN "discountLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Quote" ADD COLUMN "taxLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Quote" ADD COLUMN "totalLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Quote" ADD COLUMN "sentAt" TIMESTAMP(3);

CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" TEXT NOT NULL DEFAULT '1',
    "unit" TEXT NOT NULL DEFAULT '',
    "unitPrice" TEXT NOT NULL DEFAULT '',
    "lineTotal" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'item',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD COLUMN "quoteId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "bookingId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "workOrderId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "customerName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Invoice" ADD COLUMN "customerPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Invoice" ADD COLUMN "customerEmail" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "locationLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Invoice" ADD COLUMN "serviceLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Invoice" ADD COLUMN "notes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Invoice" ADD COLUMN "subtotalLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Invoice" ADD COLUMN "discountLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Invoice" ADD COLUMN "taxLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Invoice" ADD COLUMN "totalLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Invoice" ADD COLUMN "issueDate" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "dueDate" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "statusEnum" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT';
UPDATE "Invoice" SET "statusEnum" = 'DRAFT';
ALTER TABLE "Invoice" DROP COLUMN "status";
ALTER TABLE "Invoice" RENAME COLUMN "statusEnum" TO "status";
ALTER TABLE "Invoice" DROP COLUMN "amountLabel";

CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" TEXT NOT NULL DEFAULT '1',
    "unit" TEXT NOT NULL DEFAULT '',
    "unitPrice" TEXT NOT NULL DEFAULT '',
    "lineTotal" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'item',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serviceId" TEXT,
    "method" "QuoteMethod" NOT NULL DEFAULT 'inspection',
    "unitLabel" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'customer_service',
    "staffId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ExportLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "dataset" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "filters" TEXT NOT NULL DEFAULT '{}',
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExportLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NumberSequence" (
    "id" TEXT NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("id")
);
