import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin/auth";
import { canUseCoFounder } from "@/lib/cofounder/rbac";
import { listTaskProposals } from "@/lib/cofounder/proposals";
import { rateLimit } from "@/server/rate-limit";

export async function GET() {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canUseCoFounder(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const limited = await rateLimit(`cofounder-proposals:${session.id}`, 60, 10 * 60 * 1000);
  if (!limited.ok) return NextResponse.json({ error: "rateLimit" }, { status: 429 });
  const proposals = await listTaskProposals(session);
  return NextResponse.json({ proposals });
}
