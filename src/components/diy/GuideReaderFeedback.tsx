"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FormShell, fieldControlClass, fieldLabelClass } from "@/components/public/FormShell";
import { formStart } from "@/lib/analytics/client";

export function GuideReaderFeedback({ guideSlug }: { guideSlug: string }) {
  const t = useTranslations("Diy");
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  async function onSubmit(formData: FormData) {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "guide",
        guideSlug,
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
    <FormShell className="mt-4">
      <form action={onSubmit} className="grid gap-4" onFocusCapture={formStart("REVIEW_START")}>
        <div className="hidden">
          <input name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <p className="text-sm text-muted">{t("readerDisclaimer")}</p>
        <div>
          <label className={fieldLabelClass} htmlFor="guide-author">
            {t("readerName")}
          </label>
          <input id="guide-author" name="authorName" required className={fieldControlClass} />
        </div>
        <div>
          <label className={fieldLabelClass} htmlFor="guide-stars">
            {t("rating")}
          </label>
          <select id="guide-stars" name="stars" required className={fieldControlClass} defaultValue="5">
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={fieldLabelClass} htmlFor="guide-title">
            {t("readerTitle")}
          </label>
          <input id="guide-title" name="title" className={fieldControlClass} />
        </div>
        <div>
          <label className={fieldLabelClass} htmlFor="guide-body">
            {t("readerBody")}
          </label>
          <textarea id="guide-body" name="body" required rows={4} className={`${fieldControlClass} min-h-[7rem] py-2`} />
        </div>
        <Button type="submit" variant="secondary">
          {t("readerSubmit")}
        </Button>
        {status === "ok" ? (
          <p role="status" className="text-sm text-accent">
            {t("readerThanks")}
          </p>
        ) : null}
        {status === "error" ? (
          <p role="alert" className="text-sm text-danger">
            {t("readerError")}
          </p>
        ) : null}
      </form>
    </FormShell>
  );
}
