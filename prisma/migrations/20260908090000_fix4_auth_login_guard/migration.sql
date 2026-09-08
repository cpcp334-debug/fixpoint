-- FIX 4: staff login lockout guards + session indexes
CREATE TABLE "AuthLoginGuard" (
    "emailHash" TEXT NOT NULL,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthLoginGuard_pkey" PRIMARY KEY ("emailHash")
);

CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
