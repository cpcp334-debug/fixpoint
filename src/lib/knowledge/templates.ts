import { TEMPLATE_BANNER, type SopAudience } from "@/lib/knowledge/types";

export type TemplateSop = {
  sopCode: string;
  title: string;
  description: string;
  body: string;
  audiences: SopAudience[];
  categorySlug?: string;
  serviceSlug?: string;
};

function body(sections: string[]) {
  return [TEMPLATE_BANNER, "", ...sections].join("\n");
}

export const TEMPLATE_SOPS: TemplateSop[] = [
  {
    sopCode: "SOP-CS-001",
    title: "Customer Complaint Handling",
    description: "How staff record, escalate, and close customer complaints in the current platform.",
    audiences: ["cs", "ops"],
    body: body([
      "Purpose: Handle complaints without hiding evidence or inventing policy.",
      "1. Identify the channel: review, Q&A, lead/booking notes, or a phone complaint logged against the customer/lead.",
      "2. Do not approve, reject, or hide a review automatically. Negative reviews stay valid and, after human approval, remain public.",
      "3. Ratings of 2 stars or below may create a customer-service follow-up task when a manager has enabled that automation rule. The task is work for a person; it is not an auto-reply.",
      "4. Do not invent wait times, refunds, or compensation. Escalate operational disputes to a supervisor using the work order or booking record.",
      "5. If no matching SOP step exists for the case, say so and ask a manager. Do not fill gaps with unofficial promises.",
    ]),
  },
  {
    sopCode: "SOP-OPS-001",
    title: "Post-Completion Process",
    description: "What happens after a work order is marked completed in the platform.",
    audiences: ["ops"],
    body: body([
      "Purpose: Close completed work without auto-billing or auto-confirming payment.",
      "1. Only a human marks the work order completed after the on-site job is done.",
      "2. Completion may create an invoice task and a review-request task when that automation rule is enabled. Those are tasks for staff. The system must not create an Invoice row or mark an invoice paid by itself.",
      "3. Payment.unconfigured is not paid. Treat an invoice as paid only when Invoice status is PAID.",
      "4. Do not create a work order, confirm a booking, or change prices from this step.",
      "5. If a case is outside this flow (for example AMC or a special commercial agreement), the current SOP does not cover it — ask a manager.",
    ]),
  },
  {
    sopCode: "SOP-SALES-001",
    title: "HOT Lead Follow-Up",
    description: "Sales follow-up when LeadScore classifies a lead as HOT.",
    audiences: ["sales", "ops"],
    body: body([
      "Purpose: Follow HOT leads using stored LeadScore, not guesswork.",
      "1. HOT is the stored effective class on LeadScore. Do not recompute or invent a score in chat.",
      "2. Contact the lead promptly. When a manager has enabled the HOT-lead automation rule, the system may assign sales and create an urgent follow-up task. Automation must not overwrite a human assignment.",
      "3. Do not confirm a booking, send a customer WhatsApp/email, or create a quote from this SOP. Those remain human actions.",
      "4. Quality overrides (including setting HOT) are a manager/sales permission on the lead record, not an AI action.",
      "5. If the lead is quarantined or the class is not HOT, this SOP does not apply.",
    ]),
  },
  {
    sopCode: "SOP-OPS-002",
    title: "Booking Request vs Confirmed Appointment",
    description: "Difference between a booking request and a confirmed appointment in the platform.",
    audiences: ["ops", "sales", "cs"],
    body: body([
      "Purpose: Never treat a request as a confirmed visit.",
      "1. A public or staff booking in status requested is a request only. Preferred date/time is not confirmed.",
      "2. A confirmed appointment exists only after a human confirms date and time through the booking confirmation action. That is the confirmation event.",
      "3. Changing status labels without that confirmation action does not mean the customer has a locked appointment for automation or for customer messaging.",
      "4. Creating a work order is a separate human step. Confirmation does not auto-create a work order.",
      "5. If a customer asks whether they are booked, check the booking status. If it is not confirmed, say it is still a request.",
    ]),
  },
];
