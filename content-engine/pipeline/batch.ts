/**
 * Batch / retry / checkpoint / idempotency helpers for Content Engine runs.
 */
import { GENERATION } from "../config/engine.config";

export function makeIdempotencyKey(parts: {
  contentKey: string;
  locale: string;
  generationVersion: string;
  kind: string;
}): string {
  return `${parts.kind}:${parts.contentKey}:${parts.locale}:${parts.generationVersion}`;
}

export function makeBatchKey(generationVersion: string, size: number, seq: number): string {
  return `engine-${generationVersion}-n${size}-b${seq}`;
}

export type Checkpoint = {
  batchKey: string;
  processed: number;
  succeeded: number;
  failed: number;
  lastContentKey?: string;
  updatedAt: string;
};

export function emptyCheckpoint(batchKey: string): Checkpoint {
  return {
    batchKey,
    processed: 0,
    succeeded: 0,
    failed: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function shouldRetry(attempt: number, maxAttempts = GENERATION.maxRetries): boolean {
  return attempt < maxAttempts;
}

export function* chunkArray<T>(items: T[], size: number): Generator<T[]> {
  for (let i = 0; i < items.length; i += size) {
    yield items.slice(i, i + size);
  }
}
