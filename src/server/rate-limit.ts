import { createHash } from "node:crypto";
import { prisma } from "@/server/db";
import { resolveClientIp } from "@/server/trusted-proxy";

export type RateLimitStoreFailureMode = "closed" | "open";

export type RateLimitResult = { ok: boolean; remaining: number };

/** SHA-256 of the logical rate-limit key — stored in RateLimitBucket.keyHash only. */
export function hashRateLimitKey(logicalKey: string) {
  return createHash("sha256").update(logicalKey).digest("hex");
}

let pruneCounter = 0;

async function maybePruneExpired(now: Date) {
  pruneCounter += 1;
  if (pruneCounter % 50 !== 0) return;
  await prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lt: now } } }).catch(() => undefined);
}

export function onRateLimitStoreError(mode: RateLimitStoreFailureMode, limit: number): RateLimitResult {
  if (mode === "open") return { ok: true, remaining: limit };
  return { ok: false, remaining: 0 };
}

/**
 * Durable fixed-window rate limit (PostgreSQL RateLimitBucket).
 * Survives process restarts and is shared across instances using the same DATABASE_URL.
 *
 * @param onStoreError - "closed" (default) fail closed for security-critical paths;
 *                       "open" for analytics only.
 */
export async function rateLimit(
  logicalKey: string,
  limit: number,
  windowMs: number,
  opts?: { onStoreError?: RateLimitStoreFailureMode },
): Promise<RateLimitResult> {
  const failMode = opts?.onStoreError ?? "closed";
  const keyHash = hashRateLimitKey(logicalKey);
  const now = new Date();

  try {
    await maybePruneExpired(now);

    const existing = await prisma.rateLimitBucket.findUnique({ where: { keyHash } });

    if (!existing || existing.resetAt.getTime() <= now.getTime()) {
      const resetAt = new Date(now.getTime() + windowMs);
      await prisma.rateLimitBucket.upsert({
        where: { keyHash },
        create: { keyHash, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return { ok: true, remaining: Math.max(0, limit - 1) };
    }

    if (existing.count >= limit) {
      return { ok: false, remaining: 0 };
    }

    const updated = await prisma.rateLimitBucket.updateMany({
      where: {
        keyHash,
        count: { lt: limit },
        resetAt: { gt: now },
      },
      data: { count: { increment: 1 } },
    });

    if (updated.count === 0) {
      const again = await prisma.rateLimitBucket.findUnique({ where: { keyHash } });
      if (!again || again.resetAt.getTime() <= Date.now()) {
        const resetAt = new Date(Date.now() + windowMs);
        await prisma.rateLimitBucket.upsert({
          where: { keyHash },
          create: { keyHash, count: 1, resetAt },
          update: { count: 1, resetAt },
        });
        return { ok: true, remaining: Math.max(0, limit - 1) };
      }
      return { ok: false, remaining: 0 };
    }

    return { ok: true, remaining: Math.max(0, limit - existing.count - 1) };
  } catch {
    return onRateLimitStoreError(failMode, limit);
  }
}

/** Trusted-proxy-aware client IP for rate-limit keys. Never logs the value. */
export function clientIp(headers: Headers) {
  return resolveClientIp(headers);
}
