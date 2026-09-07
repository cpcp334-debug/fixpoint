import { prisma } from "@/server/db";

export async function nextDocumentNumber(kind: "quote" | "invoice") {
  const year = new Date().getFullYear();
  const id = kind === "quote" ? `quote-${year}` : `invoice-${year}`;
  const row = await prisma.numberSequence.upsert({
    where: { id },
    create: { id, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  const n = String(row.lastValue).padStart(6, "0");
  return kind === "quote" ? `ALN-Q-${year}-${n}` : `ALN-INV-${year}-${n}`;
}

export async function nextWorkOrderNumber() {
  const year = new Date().getFullYear();
  const id = `wo-${year}`;
  const row = await prisma.numberSequence.upsert({
    where: { id },
    create: { id, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  return `ALN-WO-${year}-${String(row.lastValue).padStart(6, "0")}`;
}

export async function adminAudit(opts: {
  actor: string;
  action: string;
  entity: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      actor: opts.actor,
      action: opts.action,
      entity: opts.entity,
      entityId: opts.entityId || "",
      meta: JSON.stringify(opts.meta || {}),
    },
  });
}
