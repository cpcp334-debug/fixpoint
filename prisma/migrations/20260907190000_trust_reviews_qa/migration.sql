-- AlterTable WorkOrder
ALTER TABLE "WorkOrder" ADD COLUMN "serviceId" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "locationId" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "bookingId" TEXT;

ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Review
ALTER TABLE "Review" ADD COLUMN "bookingId" TEXT;
ALTER TABLE "Review" ADD COLUMN "area" TEXT;
ALTER TABLE "Review" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "Review" ADD COLUMN "adminResponse" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Review" ADD COLUMN "adminRespondedAt" TIMESTAMP(3);
ALTER TABLE "Review" ADD COLUMN "flagCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Question
ALTER TABLE "Question" ADD COLUMN "locationId" TEXT;
ALTER TABLE "Question" ADD COLUMN "customerId" TEXT;
ALTER TABLE "Question" ADD COLUMN "moderationStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Question" ADD COLUMN "flagCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Question" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en';

UPDATE "Question" SET "moderationStatus" = 'APPROVED' WHERE "status" = 'published';

ALTER TABLE "Question" ADD CONSTRAINT "Question_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ReviewVote" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewVote_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ReviewVote" ADD CONSTRAINT "ReviewVote_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ReviewInsight" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT,
    "serviceId" TEXT,
    "locationId" TEXT,
    "sentiment" TEXT NOT NULL DEFAULT 'unknown',
    "themes" TEXT NOT NULL DEFAULT '[]',
    "punctuality" TEXT NOT NULL DEFAULT '',
    "communication" TEXT NOT NULL DEFAULT '',
    "visibility" "KnowledgeScope" NOT NULL DEFAULT 'INTERNAL',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewInsight_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ReviewInsight" ADD CONSTRAINT "ReviewInsight_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ContentReport" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);
