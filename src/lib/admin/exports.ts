import { prisma } from "@/server/db";
import { workbookToBuffer } from "@/lib/admin/excel";
import { renderListPdf } from "@/lib/admin/pdf";
import { adminAudit } from "@/lib/admin/numbers";
import { exportAllowed } from "@/lib/admin/rbac";
import { DATASETS, type ExportDataset } from "@/lib/admin/datasets";

export { DATASETS, type ExportDataset };

function iso(d: Date) {
  return d.toISOString();
}

export async function collectExportRows(dataset: ExportDataset): Promise<Array<Record<string, string | number | null | undefined>>> {
  if (dataset === "leads") {
    const rows = await prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 2000 });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      source: r.source,
      status: r.status,
      city: r.city,
      area: r.area,
      createdAt: iso(r.createdAt),
    }));
  }
  if (dataset === "customers") {
    const rows = await prisma.customer.findMany({ orderBy: { createdAt: "desc" }, take: 2000 });
    return rows.map((r) => ({ id: r.id, name: r.name, phone: r.phone, email: r.email, createdAt: iso(r.createdAt) }));
  }
  if (dataset === "bookings") {
    const rows = await prisma.booking.findMany({ orderBy: { createdAt: "desc" }, take: 2000 });
    return rows.map((r) => ({
      number: r.number,
      type: r.type,
      status: r.status,
      name: r.name,
      phone: r.phone,
      preferredDate: r.preferredDate,
      confirmedDate: r.confirmedDate,
      createdAt: iso(r.createdAt),
    }));
  }
  if (dataset === "work_orders") {
    const rows = await prisma.workOrder.findMany({ orderBy: { createdAt: "desc" }, take: 2000 });
    return rows.map((r) => ({
      number: r.number,
      status: r.status,
      serviceLabel: r.serviceLabel,
      locationLabel: r.locationLabel,
      scheduledDate: r.scheduledDate,
      createdAt: iso(r.createdAt),
    }));
  }
  if (dataset === "quotes") {
    const rows = await prisma.quote.findMany({ orderBy: { createdAt: "desc" }, take: 2000 });
    return rows.map((r) => ({
      quoteNumber: r.quoteNumber,
      status: r.status,
      customerName: r.customerName,
      totalLabel: r.totalLabel,
      createdAt: iso(r.createdAt),
    }));
  }
  if (dataset === "invoices") {
    const rows = await prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, take: 2000 });
    return rows.map((r) => ({
      number: r.number,
      status: r.status,
      customerName: r.customerName,
      totalLabel: r.totalLabel,
      createdAt: iso(r.createdAt),
    }));
  }
  if (dataset === "reviews") {
    const rows = await prisma.review.findMany({ orderBy: { createdAt: "desc" }, take: 2000 });
    return rows.map((r) => ({ id: r.id, type: r.type, status: r.status, stars: r.stars, authorName: r.authorName, createdAt: iso(r.createdAt) }));
  }
  if (dataset === "questions") {
    const rows = await prisma.question.findMany({ orderBy: { createdAt: "desc" }, take: 2000 });
    return rows.map((r) => ({ id: r.id, status: r.status, moderationStatus: r.moderationStatus, askerName: r.askerName, createdAt: iso(r.createdAt) }));
  }
  const rows = await prisma.service.findMany({ include: { translations: true }, orderBy: { slug: "asc" } });
  return rows.map((r) => ({
    slug: r.slug,
    status: r.status,
    indexable: r.indexable ? "yes" : "no",
    name: r.translations.find((t) => t.locale === "en")?.name || "",
  }));
}

export async function buildExport(opts: {
  dataset: ExportDataset;
  format: "xlsx" | "pdf";
  user: { id: string; email: string; role: string };
}) {
  if (!exportAllowed(opts.user.role, opts.dataset)) return { ok: false as const, error: "forbidden" as const };
  const rows = await collectExportRows(opts.dataset);
  await prisma.exportLog.create({
    data: {
      userId: opts.user.id,
      role: opts.user.role,
      dataset: opts.dataset,
      format: opts.format,
      resultCount: rows.length,
    },
  });
  await adminAudit({
    actor: opts.user.email,
    action: "export.download",
    entity: "ExportLog",
    meta: { dataset: opts.dataset, format: opts.format, count: rows.length },
  });
  if (opts.format === "xlsx") {
    return {
      ok: true as const,
      filename: `${opts.dataset}.xlsx`,
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: await workbookToBuffer(rows, opts.dataset),
    };
  }
  const headers = rows[0] ? Object.keys(rows[0]) : ["empty"];
  const table = rows.map((row) => headers.map((key) => String(row[key] ?? "")));
  return {
    ok: true as const,
    filename: `${opts.dataset}.pdf`,
    mime: "application/pdf",
    buffer: await renderListPdf(`Export: ${opts.dataset}`, headers, table),
  };
}
