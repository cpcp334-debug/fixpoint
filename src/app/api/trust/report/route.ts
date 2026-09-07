import { NextResponse } from "next/server";
import { z } from "zod";
import { reportContent } from "@/lib/reviews";
import { clientIp } from "@/server/rate-limit";

const schema = z.object({
  entity: z.enum(["review", "question"]),
  id: z.string().trim().min(1).max(40),
  reason: z.string().trim().max(400).optional(),
  website: z.string().optional(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true, ignored: true });
  const result = await reportContent(parsed.data.entity, parsed.data.id, parsed.data.reason || "", clientIp(request.headers));
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
