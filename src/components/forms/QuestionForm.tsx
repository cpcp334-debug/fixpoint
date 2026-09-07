"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormShell, fieldControlClass, fieldLabelClass } from "@/components/public/FormShell";
import { formStart } from "@/lib/analytics/client";

export function QuestionForm({
  locale,
  serviceSlug,
  locationSlug,
  guideSlug,
}: {
  locale: string;
  serviceSlug?: string;
  locationSlug?: string;
  guideSlug?: string;
}) {
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const ar = locale === "ar";
  const suffix = [serviceSlug, locationSlug, guideSlug, "q"].filter(Boolean).join("-");

  async function onSubmit(formData: FormData) {
    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        askerName: String(formData.get("askerName") || ""),
        body: String(formData.get("body") || ""),
        serviceSlug,
        locationSlug,
        guideSlug,
        locale,
        website: String(formData.get("website") || ""),
      }),
    });
    setStatus(res.ok ? "ok" : "error");
  }

  return (
    <FormShell className="mt-6">
      <form action={onSubmit} className="grid gap-4" onFocusCapture={formStart("QUESTION_START")}>
        <div className="hidden">
          <input name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <p className="text-sm text-muted">
          {ar
            ? "السؤال يبقى غير منشور حتى تتم الإجابة واعتماد العرض العام."
            : "Questions stay unpublished until they are answered and approved for public display."}
        </p>
        <div>
          <label className={fieldLabelClass} htmlFor={`askerName-${suffix}`}>
            {ar ? "الاسم (اختياري)" : "Name (optional)"}
          </label>
          <input id={`askerName-${suffix}`} name="askerName" className={fieldControlClass} />
        </div>
        <div>
          <label className={fieldLabelClass} htmlFor={`q-body-${suffix}`}>
            {ar ? "سؤالك" : "Your question"}
          </label>
          <textarea
            id={`q-body-${suffix}`}
            name="body"
            required
            rows={3}
            className={`${fieldControlClass} min-h-[6rem] py-2`}
          />
        </div>
        <Button type="submit" variant="secondary">
          {ar ? "إرسال السؤال" : "Send question"}
        </Button>
        {status === "ok" ? (
          <p role="status" className="text-sm text-accent">
            {ar ? "تم استلام السؤال." : "Question received."}
          </p>
        ) : null}
        {status === "error" ? (
          <p role="alert" className="text-sm text-danger">
            {ar ? "تعذر الإرسال." : "Could not send the question."}
          </p>
        ) : null}
      </form>
    </FormShell>
  );
}
