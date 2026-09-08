-- Phase 2G.2: internal SOP fields on KnowledgeDocument. PRIVATE remains non-retrievable.
CREATE TYPE "KnowledgeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

ALTER TABLE "KnowledgeDocument" ADD COLUMN "sopCode" TEXT;
ALTER TABLE "KnowledgeDocument" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "KnowledgeDocument" ADD COLUMN "status" "KnowledgeStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "KnowledgeDocument" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "KnowledgeDocument" ADD COLUMN "audienceJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "KnowledgeDocument" ADD COLUMN "categorySlug" TEXT NOT NULL DEFAULT '';
ALTER TABLE "KnowledgeDocument" ADD COLUMN "serviceSlug" TEXT NOT NULL DEFAULT '';
ALTER TABLE "KnowledgeDocument" ADD COLUMN "effectiveDate" TEXT NOT NULL DEFAULT '';
ALTER TABLE "KnowledgeDocument" ADD COLUMN "reviewDate" TEXT NOT NULL DEFAULT '';
ALTER TABLE "KnowledgeDocument" ADD COLUMN "updatedBy" TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX "KnowledgeDocument_sopCode_key" ON "KnowledgeDocument"("sopCode");
CREATE INDEX "KnowledgeDocument_scope_status_idx" ON "KnowledgeDocument"("scope", "status");
CREATE INDEX "KnowledgeDocument_status_sopCode_idx" ON "KnowledgeDocument"("status", "sopCode");
CREATE INDEX "KnowledgeDocument_categorySlug_idx" ON "KnowledgeDocument"("categorySlug");
CREATE INDEX "KnowledgeDocument_serviceSlug_idx" ON "KnowledgeDocument"("serviceSlug");

CREATE TABLE "KnowledgeDocumentRevision" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "status" "KnowledgeStatus" NOT NULL,
    "audienceJson" TEXT NOT NULL DEFAULT '[]',
    "updatedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeDocumentRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KnowledgeDocumentRevision_documentId_version_idx" ON "KnowledgeDocumentRevision"("documentId", "version");

ALTER TABLE "KnowledgeDocumentRevision" ADD CONSTRAINT "KnowledgeDocumentRevision_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
