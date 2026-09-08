-- Phase 2G.1: internal Co-Founder conversations. No public AI / Visitor linkage.
CREATE TABLE "StaffAiConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "frozenRole" TEXT NOT NULL,
    "messagesJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAiConversation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StaffAiConversation_userId_updatedAt_idx" ON "StaffAiConversation"("userId", "updatedAt");

ALTER TABLE "StaffAiConversation" ADD CONSTRAINT "StaffAiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
