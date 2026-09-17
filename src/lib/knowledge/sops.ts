import type { KnowledgeDocument, KnowledgeStatus, PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db";
import { adminAudit } from "@/lib/admin/numbers";
import { parseAudiences, sessionMayReadSop } from "@/lib/knowledge/access";
import { TEMPLATE_SOPS } from "@/lib/knowledge/templates";
import { SOP_AUDIENCES, type SopAudience, type SopInput } from "@/lib/knowledge/types";

const SEARCH_SCAN = 20;
const SEARCH_RETURN = 8;
const EXCERPT = 420;
const BODY_MAX = 4000;

export type KnowledgeActor = { email: string; role: string; staffId: string | null; frozenRole?: string };

function clip(value: string, max: number) {
  return value.trim().slice(0, max);
}

export function parseAudienceList(values: string[]): SopAudience[] {
  const unique = new Set<SopAudience>();
  for (const value of values) {
    if ((SOP_AUDIENCES as readonly string[]).includes(value)) unique.add(value as SopAudience);
  }
  return [...unique];
}

function excerptAround(body: string, query: string) {
  const lower = body.toLowerCase();
  const q = query.trim().toLowerCase();
  const idx = q ? lower.indexOf(q) : 0;
  const start = Math.max(0, (idx < 0 ? 0 : idx) - 80);
  const slice = body.slice(start, start + EXCERPT).trim();
  return `${start > 0 ? "…" : ""}${slice}${start + EXCERPT < body.length ? "…" : ""}`;
}

function publicSopFields(row: KnowledgeDocument) {
  return {
    id: row.id,
    title: row.title,
    sopCode: row.sopCode || "",
    description: row.description,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
    audience: parseAudiences(row.audienceJson),
    categorySlug: row.categorySlug || undefined,
    serviceSlug: row.serviceSlug || undefined,
    status: row.status,
    source: {
      type: "sop" as const,
      title: row.title,
      sopCode: row.sopCode || "",
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
    },
  };
}

async function snapshotRevision(row: KnowledgeDocument) {
  await prisma.knowledgeDocumentRevision.create({
    data: {
      documentId: row.id,
      version: row.version,
      title: row.title,
      description: row.description,
      body: row.body,
      status: row.status,
      audienceJson: row.audienceJson,
      updatedBy: row.updatedBy,
    },
  });
}

export async function createInternalSop(input: SopInput, actorEmail: string) {
  const sopCode = clip(input.sopCode, 40).toUpperCase();
  if (!clip(input.title, 160) || !sopCode) return { ok: false as const, error: "invalid" as const };
  const existing = await prisma.knowledgeDocument.findUnique({ where: { sopCode } });
  if (existing) return { ok: false as const, error: "duplicate" as const };
  const row = await prisma.knowledgeDocument.create({
    data: {
      scope: "INTERNAL",
      status: "DRAFT",
      title: clip(input.title, 160),
      sopCode,
      description: clip(input.description, 400),
      body: clip(input.body, 20000),
      audienceJson: JSON.stringify(input.audiences),
      categorySlug: clip(input.categorySlug || "", 80),
      serviceSlug: clip(input.serviceSlug || "", 80),
      effectiveDate: clip(input.effectiveDate || "", 20),
      reviewDate: clip(input.reviewDate || "", 20),
      updatedBy: actorEmail,
      version: 1,
    },
  });
  await adminAudit({
    actor: actorEmail,
    action: "knowledge.create",
    entity: "KnowledgeDocument",
    entityId: row.id,
    meta: { sopCode: row.sopCode, status: row.status },
  });
  return { ok: true as const, row };
}

export async function updateInternalSop(id: string, input: SopInput, actorEmail: string) {
  const existing = await prisma.knowledgeDocument.findUnique({ where: { id } });
  if (!existing || existing.scope !== "INTERNAL") return { ok: false as const, error: "missing" as const };
  const sopCode = clip(input.sopCode, 40).toUpperCase();
  if (!clip(input.title, 160) || !sopCode) return { ok: false as const, error: "invalid" as const };
  const clash = await prisma.knowledgeDocument.findFirst({ where: { sopCode, id: { not: id } } });
  if (clash) return { ok: false as const, error: "duplicate" as const };
  await snapshotRevision(existing);
  const row = await prisma.knowledgeDocument.update({
    where: { id },
    data: {
      title: clip(input.title, 160),
      sopCode,
      description: clip(input.description, 400),
      body: clip(input.body, 20000),
      audienceJson: JSON.stringify(input.audiences),
      categorySlug: clip(input.categorySlug || "", 80),
      serviceSlug: clip(input.serviceSlug || "", 80),
      effectiveDate: clip(input.effectiveDate || "", 20),
      reviewDate: clip(input.reviewDate || "", 20),
      updatedBy: actorEmail,
      version: existing.version + 1,
    },
  });
  await adminAudit({
    actor: actorEmail,
    action: "knowledge.update",
    entity: "KnowledgeDocument",
    entityId: row.id,
    meta: { sopCode: row.sopCode, version: row.version, previousVersion: existing.version },
  });
  return { ok: true as const, row };
}

export async function setInternalSopStatus(id: string, status: KnowledgeStatus, actorEmail: string) {
  const existing = await prisma.knowledgeDocument.findUnique({ where: { id } });
  if (!existing || existing.scope !== "INTERNAL") return { ok: false as const, error: "missing" as const };
  const row = await prisma.knowledgeDocument.update({
    where: { id },
    data: { status, updatedBy: actorEmail },
  });
  const action =
    status === "ACTIVE" ? "knowledge.activate" : status === "ARCHIVED" ? "knowledge.archive" : "knowledge.deactivate";
  await adminAudit({
    actor: actorEmail,
    action,
    entity: "KnowledgeDocument",
    entityId: row.id,
    meta: { sopCode: row.sopCode, status, previousStatus: existing.status },
  });
  return { ok: true as const, row };
}

export async function listInternalSops(opts: {
  q?: string;
  status?: string;
  audience?: string;
  take?: number;
}) {
  const q = clip(opts.q || "", 80);
  const status = opts.status && ["DRAFT", "ACTIVE", "ARCHIVED"].includes(opts.status) ? (opts.status as KnowledgeStatus) : undefined;
  const rows = await prisma.knowledgeDocument.findMany({
    where: {
      scope: "INTERNAL",
      status,
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { sopCode: { contains: q } },
              { description: { contains: q } },
              { audienceJson: { contains: q } },
              { categorySlug: { contains: q } },
              { serviceSlug: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    take: Math.min(opts.take || 80, 100),
  });
  const audience = clip(opts.audience || "", 20);
  if (!audience) return rows;
  return rows.filter((row) => parseAudiences(row.audienceJson).includes(audience as SopAudience));
}

export async function getInternalSopAdmin(id: string) {
  const row = await prisma.knowledgeDocument.findFirst({ where: { id, scope: "INTERNAL" } });
  return row;
}

async function auditAccess(actor: KnowledgeActor, action: string, row: KnowledgeDocument | null, extra?: Record<string, unknown>) {
  await adminAudit({
    actor: actor.email,
    action,
    entity: "KnowledgeDocument",
    entityId: row?.id || "",
    meta: { sopCode: row?.sopCode || extra?.query || "", title: row?.title || "", ...extra },
  }).catch(() => undefined);
}

export async function getSopForSession(
  actor: KnowledgeActor,
  args: { id?: string; sopCode?: string; serviceSlug?: string },
) {
  let row: KnowledgeDocument | null = null;
  if (args.id) {
    row = await prisma.knowledgeDocument.findUnique({ where: { id: args.id } });
  } else if (args.sopCode) {
    row = await prisma.knowledgeDocument.findUnique({ where: { sopCode: clip(args.sopCode, 40).toUpperCase() } });
  } else if (args.serviceSlug) {
    const service = await prisma.service.findFirst({
      where: { slug: clip(args.serviceSlug, 80) },
      select: { sopCode: true },
    });
    if (service?.sopCode) {
      row = await prisma.knowledgeDocument.findUnique({ where: { sopCode: service.sopCode } });
    }
  }
  if (!row || row.scope !== "INTERNAL" || row.status !== "ACTIVE") {
    await auditAccess(actor, "knowledge.access", row?.scope === "INTERNAL" ? row : null, { denied: true, reason: "unavailable" });
    return { ok: false as const, error: "SOP not available." };
  }
  if (!(await sessionMayReadSop(actor, row))) {
    await auditAccess(actor, "knowledge.access", row, { denied: true, reason: "audience" });
    return { ok: false as const, error: "SOP not available." };
  }
  await auditAccess(actor, "knowledge.access", row, { version: row.version });
  return {
    ok: true as const,
    data: {
      ...publicSopFields(row),
      body: clip(row.body, BODY_MAX),
      note: row.body.trim() ? undefined : "Current SOP does not cover this case.",
    },
  };
}

export async function searchInternalSopsForSession(actor: KnowledgeActor, args: { q?: string; audience?: string; categorySlug?: string }) {
  const q = clip(args.q || "", 80);
  if (!q) return { ok: true as const, data: { results: [], note: "SOP not available." } };
  const scanned = await prisma.knowledgeDocument.findMany({
    where: {
      scope: "INTERNAL",
      status: "ACTIVE",
      OR: [
        { title: { contains: q } },
        { sopCode: { contains: q } },
        { description: { contains: q } },
        { body: { contains: q } },
        { audienceJson: { contains: q } },
        { categorySlug: { contains: q } },
        { serviceSlug: { contains: q } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: SEARCH_SCAN,
  });
  const audience = clip(args.audience || "", 20);
  const categorySlug = clip(args.categorySlug || "", 80);
  const results = [];
  for (const row of scanned) {
    if (!(await sessionMayReadSop(actor, row))) continue;
    if (audience && !parseAudiences(row.audienceJson).includes(audience as SopAudience)) continue;
    if (categorySlug && row.categorySlug && row.categorySlug !== categorySlug) continue;
    results.push({
      ...publicSopFields(row),
      excerpt: excerptAround(row.body || row.description, q),
    });
    if (results.length >= SEARCH_RETURN) break;
  }
  await adminAudit({
    actor: actor.email,
    action: "knowledge.search",
    entity: "KnowledgeDocument",
    meta: { query: q.slice(0, 80), count: results.length, codes: results.map((row) => row.sopCode) },
  }).catch(() => undefined);
  return {
    ok: true as const,
    data: {
      results,
      note: results.length ? undefined : "SOP not available.",
    },
  };
}

export async function upsertTemplateSops(db: PrismaClient) {
  for (const sop of TEMPLATE_SOPS) {
    await db.knowledgeDocument.upsert({
      where: { sopCode: sop.sopCode },
      create: {
        scope: "INTERNAL",
        status: "ACTIVE",
        title: sop.title,
        sopCode: sop.sopCode,
        description: sop.description,
        body: sop.body,
        audienceJson: JSON.stringify(sop.audiences),
        categorySlug: sop.categorySlug || "",
        serviceSlug: sop.serviceSlug || "",
        updatedBy: "system",
        version: 1,
      },
      update: {
        title: sop.title,
        description: sop.description,
        body: sop.body,
        audienceJson: JSON.stringify(sop.audiences),
        updatedBy: "system",
      },
    });
  }
}
