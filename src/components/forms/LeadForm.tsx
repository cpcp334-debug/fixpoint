"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import { FormGroup, FormShell, fieldControlClass, fieldLabelClass } from "@/components/public/FormShell";
import { formStart } from "@/lib/analytics/client";
import { getAttributionForSubmit } from "@/lib/attribution/client";
import { pushDataLayer } from "@/lib/analytics/datalayer";

type Mode = "quote" | "booking" | "contact";

export function LeadForm({
  mode,
  locale,
  services,
  locations,
  defaultService,
  defaultLocation,
}: {
  mode: Mode;
  locale: string;
  services: Array<{ slug: string; name: string }>;
  locations: Array<{ slug: string; name: string }>;
  defaultService?: string;
  defaultLocation?: string;
}) {
  const t = useTranslations("Quote");
  const b = useTranslations("Booking");
  const c = useTranslations("Contact");
  const err = useTranslations("Errors");
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "ok" | "error" | "rateLimit" | "incomplete">("idle");
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(formData: FormData) {
    const next: Record<string, string> = {};
    const name = String(formData.get("name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const requirement = String(formData.get("requirement") || "").trim();
    if (name.length < 2) next.name = err("nameRequired");
    if (phone.replace(/\D/g, "").length < 8) next.phone = err("phoneRequired");
    if (requirement.length < 8) next.requirement = err("requirementRequired");
    return next;
  }

  async function onSubmit(formData: FormData) {
    const clientErrors = validate(formData);
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length) {
      // Field warnings only — do not show the generic "could not send" server error.
      setStatus("incomplete");
      return;
    }

    setPending(true);
    setStatus("idle");
    try {
      const attribution = getAttributionForSubmit();
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") || ""),
          phone: String(formData.get("phone") || ""),
          email: String(formData.get("email") || ""),
          serviceSlug: String(formData.get("serviceSlug") || "") || undefined,
          locationSlug: String(formData.get("locationSlug") || "") || undefined,
          propertyType: String(formData.get("propertyType") || "") || undefined,
          requirement: String(formData.get("requirement") || ""),
          urgency: (formData.get("urgency") as "normal" | "urgent") || "normal",
          preferredDate: String(formData.get("preferredDate") || "") || undefined,
          preferredTime: String(formData.get("preferredTime") || "") || undefined,
          locale,
          source: mode === "booking" ? "booking" : mode === "contact" ? "contact" : "quote",
          website: String(formData.get("website") || ""),
          ...(attribution ? { attribution } : {}),
        }),
      });
      const result = await res.json();
      if (!result.ok) {
        setFieldErrors(result.fieldErrors || {});
        setStatus(result.error === "rateLimit" ? "rateLimit" : "error");
        return;
      }
      // Honeypot / ignored — never convert.
      if (result.ignored) {
        setFieldErrors({});
        setStatus("ok");
        return;
      }
      setFieldErrors({});

      if (mode === "quote" && result.id && !result.duplicate) {
        router.push(`/get-a-quote/received?ref=${encodeURIComponent(result.id)}`);
        return;
      }

      if (mode === "contact" && result.id && !result.duplicate) {
        pushDataLayer("contact_submit_success", {
          conversion_ref: String(result.id).slice(0, 80),
          locale: locale === "ar" ? "ar" : "en",
        });
      }

      setStatus("ok");
    } catch {
      setStatus("error");
    } finally {
      setPending(false);
    }
  }

  const success =
    mode === "booking" ? b("success") : mode === "contact" ? c("success") : t("success");
  const submitLabel =
    mode === "booking" ? b("submit") : mode === "contact" ? c("submit") : t("submit");

  return (
    <FormShell>
      <form
        action={onSubmit}
        className="grid gap-6"
        noValidate
        onFocusCapture={formStart(mode === "contact" ? "CONTACT_START" : mode === "booking" ? "BOOKING_START" : "QUOTE_START")}
      >
        <div className="hidden">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <FormGroup legend={t("groupContact")}>
          <Field id="name" name="name" label={t("name")} required error={fieldErrors.name} />
          <Field id="phone" name="phone" label={t("phone")} type="tel" required error={fieldErrors.phone} />
          <Field id="email" name="email" label={t("email")} type="email" error={fieldErrors.email} />
        </FormGroup>
        <FormGroup legend={t("groupJob")}>
          <Select
            id="serviceSlug"
            name="serviceSlug"
            label={t("service")}
            defaultValue={defaultService}
            options={[{ value: "", label: t("select") }, ...services.map((s) => ({ value: s.slug, label: s.name }))]}
          />
          <Select
            id="locationSlug"
            name="locationSlug"
            label={t("location")}
            defaultValue={defaultLocation}
            options={[{ value: "", label: t("select") }, ...locations.map((s) => ({ value: s.slug, label: s.name }))]}
          />
          {mode !== "contact" ? (
            <Select
              id="propertyType"
              name="propertyType"
              label={t("property")}
              options={[
                { value: "", label: t("select") },
                { value: "villa", label: t("villa") },
                { value: "apartment", label: t("apartment") },
                { value: "office", label: t("office") },
                { value: "building", label: t("building") },
                { value: "other", label: t("other") },
              ]}
            />
          ) : null}
          {mode === "quote" ? (
            <Select
              id="urgency"
              name="urgency"
              label={t("urgency")}
              defaultValue="normal"
              options={[
                { value: "normal", label: t("normal") },
                { value: "urgent", label: t("urgent") },
              ]}
            />
          ) : null}
          <div>
            <label htmlFor="requirement" className={fieldLabelClass}>
              {t("message")}
            </label>
            <textarea
              id="requirement"
              name="requirement"
              required
              rows={5}
              aria-invalid={Boolean(fieldErrors.requirement)}
              className={`${fieldControlClass} min-h-[8rem] py-2`}
            />
            {fieldErrors.requirement ? <p className="mt-1 text-sm text-danger">{fieldErrors.requirement}</p> : null}
          </div>
        </FormGroup>
        {mode === "booking" ? (
          <FormGroup legend={t("groupSchedule")}>
            <Field id="preferredDate" name="preferredDate" label={b("date")} type="date" />
            <Field id="preferredTime" name="preferredTime" label={b("time")} />
          </FormGroup>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "..." : submitLabel}
        </Button>
        {status === "ok" ? <p role="status" className="text-sm text-accent">{success}</p> : null}
        {status === "incomplete" ? (
          <p role="alert" className="text-sm text-danger">
            {err("formIncomplete")}
          </p>
        ) : null}
        {status === "error" ? <p role="alert" className="text-sm text-danger">{t("error")}</p> : null}
        {status === "rateLimit" ? <p role="alert" className="text-sm text-danger">{err("rateLimit")}</p> : null}
      </form>
    </FormShell>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  required,
  error,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        aria-invalid={Boolean(error)}
        className={fieldControlClass}
      />
      {error ? <p className="mt-1 text-sm text-danger">{error}</p> : null}
    </div>
  );
}

function Select({
  id,
  name,
  label,
  options,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className={fieldControlClass}
      >
        {options.map((opt) => (
          <option key={opt.value + opt.label} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
