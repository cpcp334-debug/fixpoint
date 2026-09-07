import { NextResponse } from "next/server";
import { z } from "zod";
import { voteReviewHelpful } from "@/lib/reviews";
import { clientIp } from "@/server/rate-limit";

const schema = z.object({
  reviewId: z.string().trim().min(1).max(40),
  helpful: z.boolean(),
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
  const result = await voteReviewHelpful(parsed.data.reviewId, parsed.data.helpful, clientIp(request.headers));
  if (!result.ok) {
    const status = result.error === "rateLimit" ? 429 : 400;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
