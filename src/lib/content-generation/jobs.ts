import type {
  ContentGenerationJob,
  ContentGenerationJobStatus,
  ContentGenerationKind,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { prisma as defaultPrisma } from "@/server/db";

export type EnqueueJobInput = {
  kind: ContentGenerationKind;
  idempotencyKey: string;
  batchKey: string;
  generationVersion: number;
  serviceId?: string | null;
  locationId?: string | null;
  serviceLocationId?: string | null;
  locale?: string | null;
  contentHash?: string | null;
  priority?: number;
  maxAttempts?: number;
  payloadJson?: string;
};

export type ListJobsFilter = {
  status?: ContentGenerationJobStatus | ContentGenerationJobStatus[];
  kind?: ContentGenerationKind | ContentGenerationKind[];
  batchKey?: string;
  serviceId?: string;
  locationId?: string;
  serviceLocationId?: string;
  take?: number;
  skip?: number;
};

function db(client?: PrismaClient) {
  return client ?? defaultPrisma;
}

/**
 * Idempotent enqueue: upsert by idempotencyKey.
 * Succeeded rows are left terminal (payload/meta may refresh).
 * Other statuses are reset to pending for safe re-queue.
 */
export async function enqueueJob(
  input: EnqueueJobInput,
  client?: PrismaClient,
): Promise<ContentGenerationJob> {
  const shared = {
    kind: input.kind,
    batchKey: input.batchKey,
    generationVersion: input.generationVersion,
    serviceId: input.serviceId ?? null,
    locationId: input.locationId ?? null,
    serviceLocationId: input.serviceLocationId ?? null,
    locale: input.locale ?? null,
    contentHash: input.contentHash ?? null,
    priority: input.priority ?? 0,
    maxAttempts: input.maxAttempts ?? 3,
    payloadJson: input.payloadJson ?? "{}",
  };

  const existing = await db(client).contentGenerationJob.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });

  if (!existing) {
    return db(client).contentGenerationJob.create({
      data: {
        ...shared,
        idempotencyKey: input.idempotencyKey,
        status: "pending",
        attempt: 0,
        error: null,
        resultJson: "{}",
        startedAt: null,
        finishedAt: null,
      },
    });
  }

  if (existing.status === "succeeded") {
    return db(client).contentGenerationJob.update({
      where: { id: existing.id },
      data: shared,
    });
  }

  return db(client).contentGenerationJob.update({
    where: { id: existing.id },
    data: {
      ...shared,
      status: "pending",
      error: null,
      startedAt: null,
      finishedAt: null,
    },
  });
}

export async function markRunning(id: string, client?: PrismaClient): Promise<ContentGenerationJob> {
  const now = new Date();
  const updated = await db(client).contentGenerationJob.updateMany({
    where: { id, status: { in: ["pending", "failed"] } },
    data: {
      status: "running",
      startedAt: now,
      finishedAt: null,
      error: null,
    },
  });
  if (updated.count !== 1) {
    throw new Error(`markRunning failed for ContentGenerationJob ${id} (not pending/failed)`);
  }
  return db(client).contentGenerationJob.findUniqueOrThrow({ where: { id } });
}

export async function markSucceeded(
  id: string,
  result?: { resultJson?: string; contentHash?: string | null },
  client?: PrismaClient,
): Promise<ContentGenerationJob> {
  return db(client).contentGenerationJob.update({
    where: { id },
    data: {
      status: "succeeded",
      finishedAt: new Date(),
      error: null,
      resultJson: result?.resultJson ?? "{}",
      ...(result?.contentHash !== undefined ? { contentHash: result.contentHash } : {}),
    },
  });
}

/**
 * Increment attempt; status becomes failed, or dead when attempt >= maxAttempts.
 */
export async function markFailed(
  id: string,
  error: string,
  client?: PrismaClient,
): Promise<ContentGenerationJob> {
  const row = await db(client).contentGenerationJob.findUniqueOrThrow({ where: { id } });
  const attempt = row.attempt + 1;
  const status: ContentGenerationJobStatus = attempt >= row.maxAttempts ? "dead" : "failed";
  return db(client).contentGenerationJob.update({
    where: { id },
    data: {
      attempt,
      status,
      error,
      finishedAt: new Date(),
      startedAt: null,
    },
  });
}

/**
 * Mark stale running jobs as failed (or dead if attempts exhausted).
 * Increments attempt once per reap, matching markFailed semantics.
 */
export async function reapStaleRunning(
  olderThanMs: number,
  client?: PrismaClient,
): Promise<{ reaped: number; dead: number; failed: number }> {
  const cutoff = new Date(Date.now() - olderThanMs);
  const stale = await db(client).contentGenerationJob.findMany({
    where: {
      status: "running",
      startedAt: { lte: cutoff },
    },
    select: { id: true },
    take: 500,
  });

  let reaped = 0;
  let dead = 0;
  let failed = 0;
  for (const row of stale) {
    const updated = await markFailed(row.id, "stale_running_reaped", client);
    reaped += 1;
    if (updated.status === "dead") dead += 1;
    else failed += 1;
  }
  return { reaped, dead, failed };
}

export async function listJobs(
  filter: ListJobsFilter = {},
  client?: PrismaClient,
): Promise<ContentGenerationJob[]> {
  const where: Prisma.ContentGenerationJobWhereInput = {};
  if (filter.status) {
    where.status = Array.isArray(filter.status) ? { in: filter.status } : filter.status;
  }
  if (filter.kind) {
    where.kind = Array.isArray(filter.kind) ? { in: filter.kind } : filter.kind;
  }
  if (filter.batchKey) where.batchKey = filter.batchKey;
  if (filter.serviceId) where.serviceId = filter.serviceId;
  if (filter.locationId) where.locationId = filter.locationId;
  if (filter.serviceLocationId) where.serviceLocationId = filter.serviceLocationId;

  return db(client).contentGenerationJob.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: filter.take ?? 100,
    skip: filter.skip ?? 0,
  });
}
