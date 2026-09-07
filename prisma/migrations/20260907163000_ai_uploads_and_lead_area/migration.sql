-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "area" TEXT;

-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ready';
ALTER TABLE "MediaAsset" ADD COLUMN "conversationId" TEXT;

-- AlterTable
ALTER TABLE "AiConversation" ADD COLUMN "tokenHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AiConversation" ADD COLUMN "photoIds" TEXT NOT NULL DEFAULT '[]';

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
