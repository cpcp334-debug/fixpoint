-- Phase 2G.3: Co-Founder task proposals. Pending until staff approve. No public page.
CREATE TABLE "StaffAiProposal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "actorEmail" TEXT NOT NULL DEFAULT '',
    "frozenRole" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "actionType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "sopCode" TEXT NOT NULL DEFAULT '',
    "sopTitle" TEXT NOT NULL DEFAULT '',
    "sideEffects" TEXT NOT NULL DEFAULT '',
    "itemsJson" TEXT NOT NULL DEFAULT '[]',
    "resultJson" TEXT NOT NULL DEFAULT '{}',
    "error" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT NOT NULL DEFAULT '',
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "StaffAiProposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StaffAiProposal_userId_createdAt_idx" ON "StaffAiProposal"("userId", "createdAt");
CREATE INDEX "StaffAiProposal_status_createdAt_idx" ON "StaffAiProposal"("status", "createdAt");
CREATE INDEX "StaffAiProposal_conversationId_idx" ON "StaffAiProposal"("conversationId");

ALTER TABLE "StaffAiProposal" ADD CONSTRAINT "StaffAiProposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffAiProposal" ADD CONSTRAINT "StaffAiProposal_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "StaffAiConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
