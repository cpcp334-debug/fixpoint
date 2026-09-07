import { NextResponse } from "next/server";
import { z } from "zod";
import { createPublicQuestion } from "@/lib/questions";
import { clientIp } from "@/server/rate-limit";

const schema = z.object({
  askerName: z.string().trim().max(80).optional(),
  body: z.string().trim().min(8).max(2000),
  serviceSlug: z.string().optional(),
  locationSlug: z.string().optional(),
  guideSlug: z.string().optional(),
  locale: z.enum(["en", "ar"]).optional(),
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
  const result = await createPublicQuestion(parsed.data, clientIp(request.headers));
  if (!result.ok) {
    const status = result.error === "rateLimit" ? 429 : 400;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }
  return NextResponse.json({ ok: true, id: "id" in result ? result.id : undefined });
}
