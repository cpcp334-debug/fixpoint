"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import type { PublicBookingType } from "@/lib/bookings";
import { Button } from "@/components/ui/Button";
import { FormGroup, FormShell, fieldControlClass, fieldLabelClass } from "@/components/public/FormShell";
import { formStart } from "@/lib/analytics/client";
import { getAttributionForSubmit } from "@/lib/attribution/client";

export function BookingForm({
  locale,
  type,
  services,
  locations,
  labels,
}: {
  locale: string;
  type: PublicBookingType;
  services: Array<{ slug: string; name: string }>;
  locations: Array<{ slug: string; name: string }>;
  labels: {
    name: string;
    phone: string;
    whatsapp: string;
    email: string;
    service: string;
    emirate: string;
    city: string;
    area: string;
    property: string;
    select: string;
    villa: string;
    apartment: string;
    office: string;
    building: string;
    other: string;
    requirement: string;
    preferredDate: string;
    preferredTime: string;
    frequency: string;
    weekly: string;
    biweekly: string;
    monthly: string;
    amcReference: string;
    photo: string;
    submit: string;
    error: string;
    rateLimit: string;
    emergencyNote: string;
    requestNote: string;
  };
}) {
  const router = useRouter();
  const t = useTranslations("Quote");
  const err = useTranslations("Errors");
  const [status, setStatus] = useState<"idle" | "error" | "rateLimit" | "incomplete">("idle");
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
      setStatus("incomplete");
      return;
    }

    formData.set("type", type);
    formData.set("locale", locale);
    const attribution = getAttributionForSubmit();
    if (attribution) formData.set("attribution", JSON.stringify(attribution));
    setPending(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/bookings", { method: "POST", body: formData });
      const result = await res.json();
      if (!result.ok || !result.number) {
        setFieldErrors(result.fieldErrors || {});
        setStatus(result.error === "rateLimit" ? "rateLimit" : "error");
        return;
      }
      router.push(`/book-a-service/received?ref=${encodeURIComponent(result.number)}`);
    } catch {
      setStatus("error");
    } finally {
      setPending(false);
    }
  }

  return (
    <FormShell>
      <form
        action={onSubmit}
        className="grid gap-6"
        noValidate
        onFocusCapture={formStart("BOOKING_START")}
      >
        <div className="hidden">
          <input name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <p className="text-sm text-muted">{labels.requestNote}</p>
        {type === "emergency" ? (
          <p className="rounded-[12px] bg-white px-4 py-3 text-sm text-navy">{labels.emergencyNote}</p>
        ) : null}
        <FormGroup legend={t("groupContact")}>
          <Field id="bk-name" name="name" label={labels.name} required error={fieldErrors.name} />
          <Field id="bk-phone" name="phone" label={labels.phone} type="tel" required error={fieldErrors.phone} />
          <Field id="bk-whatsapp" name="whatsapp" label={labels.whatsapp} type="tel" />
          <Field id="bk-email" name="email" label={labels.email} type="email" />
        </FormGroup>
        <FormGroup legend={t("groupJob")}>
          <Select
            id="bk-service"
            name="serviceSlug"
            label={labels.service}
            options={[{ value: "", label: labels.select }, ...services.map((s) => ({ value: s.slug, label: s.name }))]}
          />
          <Select
            id="bk-emirate"
            name="locationSlug"
            label={labels.emirate}
            options={[{ value: "", label: labels.select }, ...locations.map((s) => ({ value: s.slug, label: s.name }))]}
          />
          <Field id="bk-city" name="city" label={labels.city} />
          <Field id="bk-area" name="area" label={labels.area} />
          <Select
            id="bk-property"
            name="propertyType"
            label={labels.property}
            options={[
              { value: "", label: labels.select },
              { value: "villa", label: labels.villa },
              { value: "apartment", label: labels.apartment },
              { value: "office", label: labels.office },
              { value: "building", label: labels.building },
              { value: "other", label: labels.other },
            ]}
          />
          {type === "recurring_cleaning" ? (
            <Select
              id="bk-frequency"
              name="frequency"
              label={labels.frequency}
              options={[
                { value: "weekly", label: labels.weekly },
                { value: "biweekly", label: labels.biweekly },
                { value: "monthly", label: labels.monthly },
              ]}
            />
          ) : null}
          {type === "amc_visit" ? <Field id="bk-amc" name="amcReference" label={labels.amcReference} /> : null}
          <div>
            <label htmlFor="bk-requirement" className={fieldLabelClass}>
              {labels.requirement}
            </label>
            <textarea
              id="bk-requirement"
              name="requirement"
              required
              rows={5}
              aria-invalid={Boolean(fieldErrors.requirement)}
              className={`${fieldControlClass} min-h-[8rem] py-2`}
            />
            {fieldErrors.requirement ? (
              <p className="mt-1 text-sm text-danger">{fieldErrors.requirement}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="bk-photos" className={fieldLabelClass}>
              {labels.photo}
            </label>
            <input
              id="bk-photos"
              name="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="w-full text-sm"
            />
          </div>
        </FormGroup>
        <FormGroup legend={t("groupSchedule")}>
          <Field id="bk-date" name="preferredDate" label={labels.preferredDate} type="date" />
          <Field id="bk-time" name="preferredTime" label={labels.preferredTime} />
        </FormGroup>
        <Button type="submit" disabled={pending}>
          {pending ? "..." : labels.submit}
        </Button>
        {status === "incomplete" ? (
          <p role="alert" className="text-sm text-danger">
            {err("formIncomplete")}
          </p>
        ) : null}
        {status === "error" ? <p role="alert" className="text-sm text-danger">{labels.error}</p> : null}
        {status === "rateLimit" ? <p role="alert" className="text-sm text-danger">{labels.rateLimit}</p> : null}
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
}: {
  id: string;
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>
      <select id={id} name={name} className={fieldControlClass}>
        {options.map((opt) => (
          <option key={opt.value + opt.label} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
