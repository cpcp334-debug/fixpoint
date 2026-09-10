import type {
  ContentGenerationJob,
  ContentGenerationJobStatus,
  ContentGenerationKind,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { prisma as defaultPrisma } from "@/server/db";
import { recordPipelineMetric } from "@/lib/observability/pipeline-metrics";

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
  /** When true, reset a succeeded job back to pending for safe regeneration. */
  requeueSucceeded?: boolean;
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
    if (input.requeueSucceeded) {
      return db(client).contentGenerationJob.update({
        where: { id: existing.id },
        data: {
          ...shared,
          status: "pending",
          attempt: 0,
          error: null,
          startedAt: null,
          finishedAt: null,
        },
      });
    }
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
  const row = await db(client).contentGenerationJob.findUniqueOrThrow({ where: { id } });
  if (row.status !== "pending" && row.status !== "failed") {
    throw new Error(`markRunning failed for ContentGenerationJob ${id} (not pending/failed)`);
  }

  let result: Record<string, unknown> = {};
  try {
    result = JSON.parse(row.resultJson || "{}") as Record<string, unknown>;
  } catch {
    result = {};
  }
  if (row.error) {
    const history = Array.isArray(result.errorHistory) ? [...(result.errorHistory as unknown[])] : [];
    history.push({
      at: now.toISOString(),
      event: "start_run_preserving_prior_error",
      attempt: row.attempt,
      priorError: row.error,
    });
    result.errorHistory = history.slice(-50);
  }

  const updated = await db(client).contentGenerationJob.updateMany({
    where: { id, status: { in: ["pending", "failed"] } },
    data: {
      status: "running",
      startedAt: now,
      finishedAt: null,
      // keep row.error until success so audit still shows last failure during run
      resultJson: JSON.stringify(result),
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
  }).then((row) => {
    recordPipelineMetric({ metric: "generation_job_succeeded", tags: { kind: row.kind, locale: row.locale } });
    return row;
  });
}

/**
 * Increment attempt; status becomes failed, or dead when attempt >= maxAttempts.
 * Appends to resultJson.errorHistory for audit (does not erase prior errors).
 */
export async function markFailed(
  id: string,
  error: string,
  client?: PrismaClient,
): Promise<ContentGenerationJob> {
  const row = await db(client).contentGenerationJob.findUniqueOrThrow({ where: { id } });
  const attempt = row.attempt + 1;
  const status: ContentGenerationJobStatus = attempt >= row.maxAttempts ? "dead" : "failed";
  let result: Record<string, unknown> = {};
  try {
    result = JSON.parse(row.resultJson || "{}") as Record<string, unknown>;
  } catch {
    result = {};
  }
  const history = Array.isArray(result.errorHistory) ? [...(result.errorHistory as unknown[])] : [];
  history.push({
    at: new Date().toISOString(),
    attempt,
    status,
    error: error.slice(0, 4000),
  });
  result.errorHistory = history.slice(-50);

  const updated = await db(client).contentGenerationJob.update({
    where: { id },
    data: {
      attempt,
      status,
      error,
      finishedAt: new Date(),
      startedAt: null,
      resultJson: JSON.stringify(result),
    },
  });
  recordPipelineMetric({
    metric: "generation_job_failed",
    tags: { kind: updated.kind, locale: updated.locale, status: updated.status, attempt: updated.attempt },
  });
  return updated;
}

/**
 * Safe FAILED → PENDING requeue only.
 * Preserves serviceId/locationId/locale/generationVersion/attempt/error and
 * appends a requeue event to resultJson.errorHistory. Does NOT touch succeeded/dead/published content.
 */
export async function requeueFailedJobs(
  opts: { take?: number; kind?: ContentGenerationKind } = {},
  client?: PrismaClient,
): Promise<{ requeued: number; ids: string[] }> {
  const rows = await db(client).contentGenerationJob.findMany({
    where: {
      status: "failed",
      ...(opts.kind ? { kind: opts.kind } : {}),
    },
    take: opts.take ?? 500,
    orderBy: { updatedAt: "asc" },
  });

  const ids: string[] = [];
  for (const row of rows) {
    let result: Record<string, unknown> = {};
    try {
      result = JSON.parse(row.resultJson || "{}") as Record<string, unknown>;
    } catch {
      result = {};
    }
    const history = Array.isArray(result.errorHistory) ? [...(result.errorHistory as unknown[])] : [];
    history.push({
      at: new Date().toISOString(),
      event: "requeue_failed_to_pending",
      attempt: row.attempt,
      priorError: row.error,
    });
    result.errorHistory = history.slice(-50);

    await db(client).contentGenerationJob.update({
      where: { id: row.id },
      data: {
        status: "pending",
        startedAt: null,
        finishedAt: null,
        // intentionally keep: attempt, error, serviceId, locationId, locale, generationVersion
        resultJson: JSON.stringify(result),
      },
    });
    ids.push(row.id);
  }
  return { requeued: ids.length, ids };
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
