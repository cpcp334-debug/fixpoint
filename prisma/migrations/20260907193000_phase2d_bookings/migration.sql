-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('standard', 'site_inspection', 'emergency', 'recurring_cleaning', 'amc_visit');

-- AlterTable Lead
ALTER TABLE "Lead" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "Lead" ADD COLUMN "city" TEXT;
ALTER TABLE "Lead" ADD COLUMN "preferredDate" TEXT;
ALTER TABLE "Lead" ADD COLUMN "preferredTime" TEXT;

-- AlterTable Booking
ALTER TABLE "Booking" ADD COLUMN "number" TEXT;
ALTER TABLE "Booking" ADD COLUMN "type" "BookingType" NOT NULL DEFAULT 'standard';
ALTER TABLE "Booking" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "Booking" ADD COLUMN "leadId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "conversationId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "cityId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "areaId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "Booking" ADD COLUMN "city" TEXT;
ALTER TABLE "Booking" ADD COLUMN "area" TEXT;
ALTER TABLE "Booking" ADD COLUMN "confirmedDate" TEXT;
ALTER TABLE "Booking" ADD COLUMN "confirmedTime" TEXT;
ALTER TABLE "Booking" ADD COLUMN "confirmedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "calendarEventId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "frequency" TEXT;
ALTER TABLE "Booking" ADD COLUMN "amcReference" TEXT;
ALTER TABLE "Booking" ADD COLUMN "technicianId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "supervisorId" TEXT;

UPDATE "Booking" SET "number" = 'ALN-LEGACY-' || "id" WHERE "number" IS NULL;

ALTER TABLE "Booking" ALTER COLUMN "number" SET NOT NULL;

CREATE UNIQUE INDEX "Booking_number_key" ON "Booking"("number");

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiConversation" ADD COLUMN "bookingId" TEXT;
