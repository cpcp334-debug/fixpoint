/**
 * Staff alert email for new quote / booking / contact leads.
 * Supports Resend (preferred) or SMTP (e.g. Gmail / Hostinger).
 * Never throws to callers — lead/booking writes must succeed even if mail fails.
 */

export type StaffAlertKind = "quote" | "booking" | "contact";

export type StaffAlertPayload = {
  kind: StaffAlertKind;
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  serviceLabel?: string | null;
  locationLabel?: string | null;
  cityArea?: string | null;
  requirement: string;
  locale?: string | null;
  bookingNumber?: string | null;
};

function staffAlertTo() {
  return (
    process.env.STAFF_ALERT_EMAIL?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    "alnajahaldaem42@gmail.com"
  );
}

function mailFrom() {
  return process.env.MAIL_FROM?.trim() || process.env.SMTP_USER?.trim() || "";
}

function provider(): "resend" | "smtp" | null {
  const explicit = (process.env.AUTOMATION_EMAIL_PROVIDER || "").trim().toLowerCase();
  if (explicit === "resend" || explicit === "smtp") return explicit;
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  if (process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim()) {
    return "smtp";
  }
  return null;
}

function siteBase() {
  const raw = process.env.SITE_URL?.trim() || "https://fixpoint.ae";
  return raw.replace(/\/$/, "");
}

function buildSubject(p: StaffAlertPayload) {
  const kind =
    p.kind === "quote" ? "Quote" : p.kind === "booking" ? "Booking" : "Contact";
  const who = p.name.slice(0, 40);
  return `[Fixpoint] New ${kind}: ${who}`;
}

function buildText(p: StaffAlertPayload) {
  const adminPath =
    p.kind === "booking"
      ? `${siteBase()}/admin/bookings`
      : `${siteBase()}/admin/leads/${p.id}`;
  const lines = [
    `New ${p.kind} request on Fixpoint`,
    "",
    `Name: ${p.name}`,
    `Phone: ${p.phone}`,
    p.email ? `Email: ${p.email}` : null,
    p.serviceLabel ? `Service: ${p.serviceLabel}` : null,
    p.locationLabel ? `Emirate: ${p.locationLabel}` : null,
    p.cityArea ? `City / area: ${p.cityArea}` : null,
    p.bookingNumber ? `Booking #: ${p.bookingNumber}` : null,
    p.locale ? `Locale: ${p.locale}` : null,
    "",
    "Requirement:",
    p.requirement.slice(0, 2000),
    "",
    `Admin: ${adminPath}`,
    `Ref: ${p.id}`,
  ];
  return lines.filter((x) => x !== null).join("\n");
}

async function sendViaResend(opts: { to: string; from: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY missing");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`resend_${res.status}:${body.slice(0, 200)}`);
  }
}

async function sendViaSmtp(opts: { to: string; from: string; subject: string; text: string }) {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) throw new Error("SMTP env incomplete");
  const port = Number(process.env.SMTP_PORT || "465");
  const secure = process.env.SMTP_SECURE !== "0" && port === 465;

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  await transporter.sendMail({
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
  });
}

/** Fire-and-forget safe: never throws. */
export async function notifyStaffAlert(payload: StaffAlertPayload): Promise<{ sent: boolean; reason?: string }> {
  try {
    const mode = provider();
    if (!mode) return { sent: false, reason: "provider_unconfigured" };
    const to = staffAlertTo();
    const from = mailFrom();
    if (!to) return { sent: false, reason: "no_recipient" };
    if (!from) return { sent: false, reason: "no_from" };

    const subject = buildSubject(payload);
    const text = buildText(payload);
    if (mode === "resend") await sendViaResend({ to, from, subject, text });
    else await sendViaSmtp({ to, from, subject, text });
    return { sent: true };
  } catch {
    return { sent: false, reason: "send_failed" };
  }
}
