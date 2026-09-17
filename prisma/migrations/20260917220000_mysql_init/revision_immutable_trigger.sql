-- Optional: run after prisma migrate deploy.
-- App also enforces immutability in src/lib/service-location/revisions.ts

DROP TRIGGER IF EXISTS service_location_revision_immutable_trg;

CREATE TRIGGER service_location_revision_immutable_trg
BEFORE UPDATE ON `ServiceLocationRevision`
FOR EACH ROW
BEGIN
  IF NEW.`snapshotJson` <> OLD.`snapshotJson`
     OR NEW.`revisionNumber` <> OLD.`revisionNumber`
     OR NEW.`locale` <> OLD.`locale`
     OR NEW.`serviceLocationId` <> OLD.`serviceLocationId`
     OR NEW.`generatedBy` <> OLD.`generatedBy`
     OR NOT (NEW.`previousRevisionId` <=> OLD.`previousRevisionId`)
     OR NEW.`createdAt` <> OLD.`createdAt`
  THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ServiceLocationRevision snapshot is immutable';
  END IF;
END;
