"use client";

import { useState } from "react";
import { RatingStars } from "@/components/trust/RatingStars";
import { VerifiedBadge } from "@/components/trust/VerifiedBadge";

export type PublicReview = {
  id: string;
  stars: number;
  title: string;
  body: string;
  authorName: string;
  verified: boolean;
  showVerified: boolean;
  adminResponse: string;
  photoUrl?: string | null;
  serviceName?: string;
  locationName?: string;
  area?: string | null;
};

export function ReviewList({
  reviews,
  labels,
}: {
  reviews: PublicReview[];
  labels: {
    verified: string;
    response: string;
    helpful: string;
    report: string;
    thanks: string;
  };
}) {
  if (!reviews.length) return null;
  return (
    <ul className="mt-6 grid gap-4">
      {reviews.map((review) => (
        <li key={review.id} className="rounded-xl border border-line bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <RatingStars value={review.stars} />
            {review.showVerified ? <VerifiedBadge label={labels.verified} /> : null}
          </div>
          <p className="mt-2 text-sm font-medium text-navy">{review.authorName}</p>
          {review.serviceName || review.locationName ? (
            <p className="text-xs text-muted">
              {[review.serviceName, review.locationName, review.area].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {review.title ? <p className="mt-2 font-medium">{review.title}</p> : null}
          <p className="mt-2 text-muted">{review.body}</p>
          {review.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={review.photoUrl} alt="" className="mt-3 max-h-48 rounded-md border border-line" />
          ) : null}
          {review.adminResponse ? (
            <p className="mt-3 rounded-[12px] bg-sand px-3 py-2 text-sm text-muted">
              <span className="font-medium text-navy">{labels.response}: </span>
              {review.adminResponse}
            </p>
          ) : null}
          <ReviewActions id={review.id} labels={labels} />
        </li>
      ))}
    </ul>
  );
}

function ReviewActions({
  id,
  labels,
}: {
  id: string;
  labels: { helpful: string; report: string; thanks: string };
}) {
  const [done, setDone] = useState<"idle" | "voted" | "reported">("idle");
  if (done !== "idle") return <p className="mt-3 text-xs text-muted">{labels.thanks}</p>;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        className="min-h-11 rounded-[12px] border border-line bg-white px-3 text-xs text-navy hover:border-navy/30"
        onClick={() => {
          void fetch("/api/reviews/helpful", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reviewId: id, helpful: true }),
          }).then(() => setDone("voted"));
        }}
      >
        {labels.helpful}
      </button>
      <button
        type="button"
        className="min-h-11 rounded-[12px] border border-line bg-white px-3 text-xs text-navy hover:border-navy/30"
        onClick={() => {
          void fetch("/api/trust/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entity: "review", id, reason: "reader-report" }),
          }).then(() => setDone("reported"));
        }}
      >
        {labels.report}
      </button>
    </div>
  );
}
