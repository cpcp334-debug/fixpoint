import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin/auth";
import { canUseCoFounder } from "@/lib/cofounder/rbac";
import { editTaskProposal } from "@/lib/cofounder/proposals";
import { rateLimit } from "@/server/rate-limit";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canUseCoFounder(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const limited = await rateLimit(`cofounder-proposal-write:${session.id}`, 40, 10 * 60 * 1000);
  if (!limited.ok) return NextResponse.json({ error: "rateLimit" }, { status: 429 });
  const { id } = await context.params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const body = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const result = await editTaskProposal(session, id, {
    title: typeof body.title === "string" ? body.title : undefined,
    dueInHours: typeof body.dueInHours === "number" ? body.dueInHours : typeof body.dueInHours === "string" ? Number(body.dueInHours) : undefined,
    dueAt: typeof body.dueAt === "string" ? body.dueAt : body.dueAt === null ? null : undefined,
    assigneeStaffId: typeof body.assigneeStaffId === "string" ? body.assigneeStaffId : body.assigneeStaffId === null ? null : undefined,
    itemIndex: typeof body.itemIndex === "number" ? body.itemIndex : undefined,
    scope: typeof body.scope === "string" ? body.scope : undefined,
    notes: typeof body.notes === "string" ? body.notes : undefined,
    exclusions: typeof body.exclusions === "string" ? body.exclusions : undefined,
    lines: body.lines,
  });
  if (!result.ok) {
    const status = "denied" in result && result.denied ? 403 : result.error === "missing" ? 404 : 409;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
