import type { ValidationResult } from "../config/types";

export type ReviewQueueItem = {
  contentKey: string;
  lifecycle: string;
  validation: ValidationResult;
  queuedAt: string;
};

/** In-memory review queue for Phase 1 dry-runs (DB-backed later via ContentEngineValidation). */
const reviewQueue: ReviewQueueItem[] = [];

export function enqueueReview(item: Omit<ReviewQueueItem, "queuedAt">) {
  const row: ReviewQueueItem = { ...item, queuedAt: new Date().toISOString() };
  reviewQueue.push(row);
  return row;
}

export function listReviewQueue() {
  return [...reviewQueue];
}

export function clearReviewQueue() {
  reviewQueue.length = 0;
}
