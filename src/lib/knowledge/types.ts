export const SOP_AUDIENCES = ["ops", "sales", "cs", "management"] as const;

export type SopAudience = (typeof SOP_AUDIENCES)[number];

export const SOP_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

export type SopStatus = (typeof SOP_STATUSES)[number];

export type SopInput = {
  title: string;
  sopCode: string;
  description: string;
  body: string;
  audiences: SopAudience[];
  categorySlug?: string;
  serviceSlug?: string;
  effectiveDate?: string;
  reviewDate?: string;
};

export const TEMPLATE_BANNER =
  "TEMPLATE (platform-aligned). This describes how the current ALNAJAH platform behaves. Confirm local policy with management before treating it as a signed company rule.";
