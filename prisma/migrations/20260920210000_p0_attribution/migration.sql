-- P0 Google Ads attribution: utm_* + click ids on Lead, Booking, Visitor (MySQL)
ALTER TABLE `Lead`
  ADD COLUMN `utmSource` VARCHAR(191) NULL,
  ADD COLUMN `utmMedium` VARCHAR(191) NULL,
  ADD COLUMN `utmCampaign` VARCHAR(191) NULL,
  ADD COLUMN `utmTerm` VARCHAR(191) NULL,
  ADD COLUMN `utmContent` VARCHAR(191) NULL,
  ADD COLUMN `gclid` VARCHAR(191) NULL,
  ADD COLUMN `gbraid` VARCHAR(191) NULL,
  ADD COLUMN `wbraid` VARCHAR(191) NULL,
  ADD COLUMN `landingPath` TEXT NULL;

CREATE INDEX `Lead_gclid_idx` ON `Lead`(`gclid`);
CREATE INDEX `Lead_utmSource_idx` ON `Lead`(`utmSource`);

ALTER TABLE `Booking`
  ADD COLUMN `utmSource` VARCHAR(191) NULL,
  ADD COLUMN `utmMedium` VARCHAR(191) NULL,
  ADD COLUMN `utmCampaign` VARCHAR(191) NULL,
  ADD COLUMN `utmTerm` VARCHAR(191) NULL,
  ADD COLUMN `utmContent` VARCHAR(191) NULL,
  ADD COLUMN `gclid` VARCHAR(191) NULL,
  ADD COLUMN `gbraid` VARCHAR(191) NULL,
  ADD COLUMN `wbraid` VARCHAR(191) NULL,
  ADD COLUMN `landingPath` TEXT NULL;

CREATE INDEX `Booking_gclid_idx` ON `Booking`(`gclid`);
CREATE INDEX `Booking_utmSource_idx` ON `Booking`(`utmSource`);

ALTER TABLE `Visitor`
  ADD COLUMN `utmSource` VARCHAR(191) NULL,
  ADD COLUMN `utmMedium` VARCHAR(191) NULL,
  ADD COLUMN `utmCampaign` VARCHAR(191) NULL,
  ADD COLUMN `utmTerm` VARCHAR(191) NULL,
  ADD COLUMN `utmContent` VARCHAR(191) NULL,
  ADD COLUMN `gclid` VARCHAR(191) NULL,
  ADD COLUMN `gbraid` VARCHAR(191) NULL,
  ADD COLUMN `wbraid` VARCHAR(191) NULL,
  ADD COLUMN `landingPath` TEXT NULL;
