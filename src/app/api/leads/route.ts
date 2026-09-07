import { NextResponse } from "next/server";
import { createLead } from "@/lib/leads";
import { clientIp } from "@/server/rate-limit";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const result = await createLead(json as Parameters<typeof createLead>[0], clientIp(request.headers));
  const status = result.ok ? 200 : result.error === "rateLimit" ? 429 : 400;
  return NextResponse.json(result, { status });
}
