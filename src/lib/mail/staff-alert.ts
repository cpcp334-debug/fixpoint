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

function env(name: string) {
  const raw = process.env[name];
  if (!raw) return "";
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function staffAlertTo() {
  return env("STAFF_ALERT_EMAIL") || env("ADMIN_EMAIL") || "alnajahaldaem42@gmail.com";
}

function mailFrom() {
  return env("MAIL_FROM") || env("SMTP_USER") || "";
}

function provider(): "resend" | "smtp" | null {
  const explicit = env("AUTOMATION_EMAIL_PROVIDER").toLowerCase();
  if (explicit === "resend" || explicit === "smtp") return explicit;
  if (env("RESEND_API_KEY")) return "resend";
  if (env("SMTP_HOST") && env("SMTP_USER") && env("SMTP_PASS")) return "smtp";
  return null;
}

function siteBase() {
  const raw = env("SITE_URL") || "https://fixpoint.ae";
  return raw.replace(/\/$/, "");
}

function buildSubject(p: StaffAlertPayload) {
  const kind = p.kind === "quote" ? "Quote" : p.kind === "booking" ? "Booking" : "Contact";
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
  const key = env("RESEND_API_KEY");
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
  const host = env("SMTP_HOST");
  const user = env("SMTP_USER");
  const pass = env("SMTP_PASS");
  if (!host || !user || !pass) throw new Error("SMTP env incomplete");
  const port = Number(env("SMTP_PORT") || "465");
  const secure = env("SMTP_SECURE") !== "0" && port === 465;

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

/** Never throws to callers. */
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
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 180) : "send_failed";
    return { sent: false, reason };
  }
}
