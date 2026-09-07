import { NextResponse } from "next/server";
import { chatRequestSchema } from "@/lib/ai/schema";
import { AiConversationAuthError, runAlnajahAi } from "@/lib/ai/orchestrator";
import { clientIp, rateLimit } from "@/server/rate-limit";

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limited = rateLimit(`ai:${ip}`, 20, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ error: "rateLimit" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  try {
    const result = await runAlnajahAi({
      messages: parsed.data.messages,
      locale: parsed.data.locale,
      conversationId: parsed.data.conversationId,
      uploadToken: parsed.data.uploadToken,
      photoIds: parsed.data.photoIds,
      ip,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AiConversationAuthError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "ai" }, { status: 500 });
  }
}
