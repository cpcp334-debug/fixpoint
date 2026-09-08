-- Phase 2F.5.1: automation engine foundation. No business-event wiring.
CREATE TYPE "AutomationTrigger" AS ENUM (
  'NEW_LEAD',
  'HOT_LEAD',
  'QUOTE_CREATED',
  'QUOTE_SENT',
  'QUOTE_ACCEPTED',
  'QUOTE_REJECTED',
  'BOOKING_REQUESTED',
  'BOOKING_CONFIRMED',
  'BOOKING_RESCHEDULED',
  'WORK_ORDER_ASSIGNED',
  'WORK_ORDER_STARTED',
  'WORK_ORDER_COMPLETED',
  'INVOICE_ISSUED',
  'INVOICE_PAID',
  'REVIEW_RECEIVED',
  'LOW_RATING_REVIEW',
  'QNA_RECEIVED',
  'AMC_RENEWAL_APPROACHING'
);

CREATE TYPE "AutomationJobStatus" AS ENUM ('pending', 'running', 'succeeded', 'failed', 'dead');

CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "trigger" "AutomationTrigger" NOT NULL,
    "delaySeconds" INTEGER NOT NULL DEFAULT 0,
    "conditionsJson" TEXT NOT NULL DEFAULT '[]',
    "actionsJson" TEXT NOT NULL DEFAULT '[]',
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutomationRule_key_key" ON "AutomationRule"("key");
CREATE INDEX "AutomationRule_enabled_trigger_priority_idx" ON "AutomationRule"("enabled", "trigger", "priority");

CREATE TABLE "AutomationJob" (
    "id" TEXT NOT NULL,
    "status" "AutomationJobStatus" NOT NULL DEFAULT 'pending',
    "trigger" "AutomationTrigger" NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL DEFAULT '{}',
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "idempotencyKey" TEXT NOT NULL,
    "lastError" TEXT NOT NULL DEFAULT '',
    "ruleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutomationJob_idempotencyKey_key" ON "AutomationJob"("idempotencyKey");
CREATE INDEX "AutomationJob_status_runAt_idx" ON "AutomationJob"("status", "runAt");
CREATE INDEX "AutomationJob_trigger_subjectType_subjectId_idx" ON "AutomationJob"("trigger", "subjectType", "subjectId");

ALTER TABLE "AutomationJob" ADD CONSTRAINT "AutomationJob_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "ruleId" TEXT,
    "trigger" "AutomationTrigger" NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "conditionPassed" BOOLEAN NOT NULL,
    "conditionDetailJson" TEXT NOT NULL DEFAULT '[]',
    "actionsJson" TEXT NOT NULL DEFAULT '[]',
    "ok" BOOLEAN NOT NULL,
    "error" TEXT NOT NULL DEFAULT '',
    "attempt" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AutomationRun_ruleId_createdAt_idx" ON "AutomationRun"("ruleId", "createdAt");
CREATE INDEX "AutomationRun_ok_createdAt_idx" ON "AutomationRun"("ok", "createdAt");
CREATE INDEX "AutomationRun_createdAt_idx" ON "AutomationRun"("createdAt");
CREATE INDEX "AutomationRun_jobId_idx" ON "AutomationRun"("jobId");

ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AutomationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "OpsTask" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'generic',
    "status" TEXT NOT NULL DEFAULT 'open',
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "assigneeStaffId" TEXT,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "ruleId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpsTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpsTask_idempotencyKey_key" ON "OpsTask"("idempotencyKey");
CREATE INDEX "OpsTask_status_dueAt_idx" ON "OpsTask"("status", "dueAt");
CREATE INDEX "OpsTask_subjectType_subjectId_idx" ON "OpsTask"("subjectType", "subjectId");
CREATE INDEX "OpsTask_assigneeStaffId_idx" ON "OpsTask"("assigneeStaffId");

ALTER TABLE "OpsTask" ADD CONSTRAINT "OpsTask_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AdminNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "staffId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "readAt" TIMESTAMP(3),
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminNotification_idempotencyKey_key" ON "AdminNotification"("idempotencyKey");
CREATE INDEX "AdminNotification_userId_createdAt_idx" ON "AdminNotification"("userId", "createdAt");
CREATE INDEX "AdminNotification_staffId_createdAt_idx" ON "AdminNotification"("staffId", "createdAt");
