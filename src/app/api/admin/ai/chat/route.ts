import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin/auth";
import { canUseCoFounder } from "@/lib/cofounder/rbac";
import { consumeCofounderDailyChat } from "@/lib/cofounder/limits";
import { runCofounder } from "@/lib/cofounder/orchestrator";
import { MAX_USER_MESSAGE } from "@/lib/cofounder/types";
import { rateLimit } from "@/server/rate-limit";

export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canUseCoFounder(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const limited = await rateLimit(`cofounder:${session.id}`, 30, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ error: "rateLimit", unavailable: true, message: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const body = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const message = typeof body.message === "string" ? body.message : "";
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : undefined;
  if (!message.trim() || message.length > MAX_USER_MESSAGE + 20) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const daily = await consumeCofounderDailyChat(session.id);
  if (!daily.ok) {
    return NextResponse.json(
      {
        error: "dailyLimit",
        unavailable: true,
        message: `Daily Co-Founder limit reached (${daily.limit}/day, ${daily.timezone}). Resets at midnight ${daily.timezone}.`,
        usage: { used: daily.used, limit: daily.limit, dayKey: daily.dayKey, timezone: daily.timezone },
      },
      { status: 429 },
    );
  }

  const result = await runCofounder({ staff: session, message, conversationId });
  return NextResponse.json({
    ...result,
    usage: { used: daily.used, limit: daily.limit, remaining: daily.remaining, dayKey: daily.dayKey, timezone: daily.timezone },
  });
}
