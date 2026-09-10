import type { ValidationResult } from "../config/types";

export type PublicationQueueItem = {
  contentKey: string;
  validation: ValidationResult;
  humanApproved: boolean;
  queuedAt: string;
};

const publicationQueue: PublicationQueueItem[] = [];

/**
 * Only validated + human-approved content enters publication queue.
 * AI never publishes.
 */
export function enqueuePublication(item: {
  contentKey: string;
  validation: ValidationResult;
  humanApproved: boolean;
}): { ok: boolean; reason?: string; item?: PublicationQueueItem } {
  if (!item.humanApproved) {
    return { ok: false, reason: "Human approval required" };
  }
  if (!item.validation.passed || !item.validation.score.publicationEligible) {
    return { ok: false, reason: "Validation / publication gate failed" };
  }
  const row: PublicationQueueItem = {
    ...item,
    queuedAt: new Date().toISOString(),
  };
  publicationQueue.push(row);
  return { ok: true, item: row };
}

export function listPublicationQueue() {
  return [...publicationQueue];
}

export function clearPublicationQueue() {
  publicationQueue.length = 0;
}
