"use client";

import { useState } from "react";
import { formStart } from "@/lib/analytics/client";

export function PendingReviewForm({
  locale,
}: {
  locale: string;
}) {
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const ar = locale === "ar";

  async function onSubmit(formData: FormData) {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorName: String(formData.get("authorName") || ""),
        stars: Number(formData.get("stars") || 0),
        title: String(formData.get("title") || ""),
        body: String(formData.get("body") || ""),
        website: String(formData.get("website") || ""),
      }),
    });
    setStatus(res.ok ? "ok" : "error");
  }

  return (
    <form action={onSubmit} className="mt-8 grid max-w-xl gap-3" onFocusCapture={formStart("REVIEW_START")}>
      <div className="hidden">
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <p className="text-sm text-muted">
        {ar
          ? "التقييم يبقى معلقاً حتى المراجعة. لا يُنشر تلقائياً ولا ننشئ شهادات وهمية."
          : "Reviews stay pending until moderation. They are not published automatically, and we do not create testimonials."}
      </p>
      <label className="text-sm font-medium" htmlFor="authorName">
        {ar ? "الاسم" : "Name"}
      </label>
      <input id="authorName" name="authorName" required className="rounded-md border border-line px-3 py-2" />
      <label className="text-sm font-medium" htmlFor="stars">
        {ar ? "النجوم" : "Stars"}
      </label>
      <select id="stars" name="stars" required className="rounded-md border border-line px-3 py-2" defaultValue="5">
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <label className="text-sm font-medium" htmlFor="title">
        {ar ? "العنوان" : "Title"}
      </label>
      <input id="title" name="title" className="rounded-md border border-line px-3 py-2" />
      <label className="text-sm font-medium" htmlFor="body">
        {ar ? "المراجعة" : "Review"}
      </label>
      <textarea id="body" name="body" required rows={4} className="rounded-md border border-line px-3 py-2" />
      <button type="submit" className="min-h-12 rounded-md border border-line px-4 font-medium">
        {ar ? "إرسال للمراجعة" : "Submit for moderation"}
      </button>
      {status === "ok" ? (
        <p role="status" className="text-sm text-accent">
          {ar ? "تم الاستلام. لن يظهر التقييم حتى يُعتمد." : "Received. It will not appear until it is approved."}
        </p>
      ) : null}
      {status === "error" ? (
        <p role="alert" className="text-sm text-danger">
          {ar ? "تعذر الإرسال." : "Could not send the review."}
        </p>
      ) : null}
    </form>
  );
}
