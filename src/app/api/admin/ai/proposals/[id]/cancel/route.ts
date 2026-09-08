import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin/auth";
import { canUseCoFounder } from "@/lib/cofounder/rbac";
import { cancelTaskProposal } from "@/lib/cofounder/proposals";
import { rateLimit } from "@/server/rate-limit";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canUseCoFounder(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const limited = await rateLimit(`cofounder-proposal-write:${session.id}`, 40, 10 * 60 * 1000);
  if (!limited.ok) return NextResponse.json({ error: "rateLimit" }, { status: 429 });
  const { id } = await context.params;
  const result = await cancelTaskProposal(session, id);
  if (!result.ok) {
    const status = "denied" in result && result.denied ? 403 : result.error === "missing" ? 404 : 409;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
