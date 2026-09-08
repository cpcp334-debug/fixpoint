import { prisma } from "@/server/db";
import { adminAudit } from "@/lib/admin/numbers";

export type AmcInput = {
  customerId: string;
  reference: string;
  startDate: string;
  endDate: string;
  frequency: string;
  coveredServices: string;
  locationLabel: string;
  propertyLabel: string;
  notes: string;
  status: "active" | "inactive";
};

function parseDubaiDate(value: string) {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const date = new Date(`${trimmed}T00:00:00+04:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function clip(value: string, max: number) {
  return value.trim().slice(0, max);
}

export function normalizeAmcInput(input: AmcInput) {
  if (!input.customerId) return { ok: false as const, error: "customer" as const };
  const startDate = input.startDate ? parseDubaiDate(input.startDate) : null;
  const endDate = input.endDate ? parseDubaiDate(input.endDate) : null;
  if (input.endDate && !endDate) return { ok: false as const, error: "dates" as const };
  if (input.startDate && !startDate) return { ok: false as const, error: "dates" as const };
  const status = input.status === "inactive" ? "inactive" : "active";
  return {
    ok: true as const,
    data: {
      customerId: input.customerId,
      reference: clip(input.reference, 80),
      startDate,
      endDate,
      frequency: clip(input.frequency, 80),
      coveredServices: clip(input.coveredServices, 1000),
      locationLabel: clip(input.locationLabel, 160),
      propertyLabel: clip(input.propertyLabel, 160),
      notes: clip(input.notes, 4000),
      status,
    },
  };
}

export async function createAmcContract(input: AmcInput, actorEmail: string) {
  const parsed = normalizeAmcInput(input);
  if (!parsed.ok) return parsed;
  const customer = await prisma.customer.findUnique({ where: { id: parsed.data.customerId } });
  if (!customer) return { ok: false as const, error: "customer" as const };
  const row = await prisma.amcContract.create({ data: parsed.data });
  await adminAudit({
    actor: actorEmail,
    action: "amc.create",
    entity: "AmcContract",
    entityId: row.id,
    meta: { status: row.status, reference: row.reference },
  });
  return { ok: true as const, row };
}

export async function updateAmcContract(id: string, input: AmcInput, actorEmail: string) {
  const existing = await prisma.amcContract.findUnique({ where: { id } });
  if (!existing) return { ok: false as const, error: "missing" as const };
  const parsed = normalizeAmcInput(input);
  if (!parsed.ok) return parsed;
  const customer = await prisma.customer.findUnique({ where: { id: parsed.data.customerId } });
  if (!customer) return { ok: false as const, error: "customer" as const };
  const row = await prisma.amcContract.update({ where: { id }, data: parsed.data });
  const statusChanged = existing.status !== row.status;
  await adminAudit({
    actor: actorEmail,
    action: statusChanged ? (row.status === "active" ? "amc.activate" : "amc.deactivate") : "amc.update",
    entity: "AmcContract",
    entityId: row.id,
    meta: { status: row.status, previousStatus: existing.status, reference: row.reference },
  });
  return { ok: true as const, row };
}

export function amcDateInput(value: Date | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}
