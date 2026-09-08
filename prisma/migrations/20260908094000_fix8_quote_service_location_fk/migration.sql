-- FIX 8: Quote.serviceId / Quote.locationId real FKs (Restrict delete, Cascade update).
-- Aborts if orphan non-null references exist. Does not delete Quote rows.

DO $$
DECLARE
  orphan_svc int;
  orphan_loc int;
BEGIN
  SELECT COUNT(*) INTO orphan_svc
  FROM "Quote" q
  WHERE q."serviceId" IS NOT NULL
    AND q."serviceId" <> ''
    AND NOT EXISTS (SELECT 1 FROM "Service" s WHERE s.id = q."serviceId");

  SELECT COUNT(*) INTO orphan_loc
  FROM "Quote" q
  WHERE q."locationId" IS NOT NULL
    AND q."locationId" <> ''
    AND NOT EXISTS (SELECT 1 FROM "Location" l WHERE l.id = q."locationId");

  IF orphan_svc > 0 OR orphan_loc > 0 THEN
    RAISE EXCEPTION
      'FIX8 abort: orphan Quote references (service=%, location=%). Remediating manually before FK.',
      orphan_svc, orphan_loc;
  END IF;
END $$;

-- Empty string cannot be a valid FK target; normalize to NULL (non-destructive).
UPDATE "Quote" SET "serviceId" = NULL WHERE "serviceId" = '';
UPDATE "Quote" SET "locationId" = NULL WHERE "locationId" = '';

ALTER TABLE "Quote"
  ADD CONSTRAINT "Quote_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Quote"
  ADD CONSTRAINT "Quote_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
