"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormShell, fieldControlClass, fieldLabelClass } from "@/components/public/FormShell";
import { formStart } from "@/lib/analytics/client";

export function ReviewForm({
  locale,
  type = "service",
  serviceSlug,
  locationSlug,
  guideSlug,
  labels,
}: {
  locale: string;
  type?: "service" | "guide";
  serviceSlug?: string;
  locationSlug?: string;
  guideSlug?: string;
  labels: {
    title: string;
    disclaimer: string;
    name: string;
    stars: string;
    reviewTitle: string;
    body: string;
    area: string;
    photo: string;
    submit: string;
    thanks: string;
    error: string;
  };
}) {
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  async function onSubmit(formData: FormData) {
    formData.set("type", type);
    formData.set("locale", locale);
    if (serviceSlug) formData.set("serviceSlug", serviceSlug);
    if (locationSlug) formData.set("locationSlug", locationSlug);
    if (guideSlug) formData.set("guideSlug", guideSlug);
    const res = await fetch("/api/reviews", { method: "POST", body: formData });
    setStatus(res.ok ? "ok" : "error");
  }

  return (
    <FormShell className="mt-6">
      <form action={onSubmit} className="grid gap-4" encType="multipart/form-data" onFocusCapture={formStart("REVIEW_START")}>
        <div className="hidden">
          <input name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <h3 className="text-lg font-semibold text-navy">{labels.title}</h3>
        <p className="text-sm text-muted">{labels.disclaimer}</p>
        <div>
          <label className={fieldLabelClass} htmlFor={`rev-name-${type}`}>
            {labels.name}
          </label>
          <input id={`rev-name-${type}`} name="authorName" required className={fieldControlClass} />
        </div>
        <div>
          <label className={fieldLabelClass} htmlFor={`rev-stars-${type}`}>
            {labels.stars}
          </label>
          <select id={`rev-stars-${type}`} name="stars" required defaultValue="5" className={fieldControlClass}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={fieldLabelClass} htmlFor={`rev-title-${type}`}>
            {labels.reviewTitle}
          </label>
          <input id={`rev-title-${type}`} name="title" className={fieldControlClass} />
        </div>
        {type === "service" ? (
          <div>
            <label className={fieldLabelClass} htmlFor={`rev-area-${type}`}>
              {labels.area}
            </label>
            <input id={`rev-area-${type}`} name="area" className={fieldControlClass} />
          </div>
        ) : null}
        <div>
          <label className={fieldLabelClass} htmlFor={`rev-body-${type}`}>
            {labels.body}
          </label>
          <textarea
            id={`rev-body-${type}`}
            name="body"
            required
            rows={4}
            className={`${fieldControlClass} min-h-[7rem] py-2`}
          />
        </div>
        {type === "service" ? (
          <div>
            <label className={fieldLabelClass} htmlFor={`rev-photo-${type}`}>
              {labels.photo}
            </label>
            <input id={`rev-photo-${type}`} name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
          </div>
        ) : null}
        <Button type="submit" variant="secondary">
          {labels.submit}
        </Button>
        {status === "ok" ? (
          <p role="status" className="text-sm text-accent">
            {labels.thanks}
          </p>
        ) : null}
        {status === "error" ? (
          <p role="alert" className="text-sm text-danger">
            {labels.error}
          </p>
        ) : null}
      </form>
    </FormShell>
  );
}
