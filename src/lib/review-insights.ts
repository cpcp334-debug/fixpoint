import type { Review } from "@prisma/client";
import { prisma } from "@/server/db";

const NEGATIVE_WORDS = /\b(late|rude|no.?show|didn't come|did not come|poor|worst|scam)\b/i;

/** Internal only. Never auto-rejects or deletes a review. */
export function suggestReviewFlags(text: string) {
  const flags: string[] = [];
  if (NEGATIVE_WORDS.test(text)) flags.push("possible_quality_complaint");
  return flags;
}

export function draftInsight(review: Pick<Review, "id" | "stars" | "body" | "serviceId" | "locationId">) {
  const sentiment = review.stars >= 4 ? "positive" : review.stars === 3 ? "neutral" : "negative";
  return {
    reviewId: review.id,
    serviceId: review.serviceId,
    locationId: review.locationId,
    sentiment,
    themes: JSON.stringify(suggestReviewFlags(review.body)),
    visibility: "INTERNAL" as const,
    notes: "Draft insight. Not public. Negative sentiment must not cause auto-rejection.",
  };
}

export async function storeReviewInsight(review: Pick<Review, "id" | "stars" | "body" | "serviceId" | "locationId">) {
  const data = draftInsight(review);
  return prisma.reviewInsight.create({ data });
}
