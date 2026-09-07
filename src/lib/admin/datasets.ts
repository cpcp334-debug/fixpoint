export const DATASETS = [
  "leads",
  "customers",
  "bookings",
  "work_orders",
  "quotes",
  "invoices",
  "reviews",
  "questions",
  "services",
] as const;

export type ExportDataset = (typeof DATASETS)[number];
