import { NextResponse } from "next/server";
import { getAuthorizedConversation } from "@/lib/ai/conversations";
import { savePrivatePhoto } from "@/lib/ai/uploads";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limited = await rateLimit(`ai-upload:${ip}`, 10, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "rateLimit" }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const conversationId = String(form.get("conversationId") || "");
  const token = String(form.get("token") || "");
  const file = form.get("file");
  if (!conversationId || !token || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const conversation = await getAuthorizedConversation(conversationId, token);
  if (!conversation) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const saved = await savePrivatePhoto({ conversationId, file });
  if (!saved.ok) {
    const status = saved.error === "limit" ? 413 : 400;
    return NextResponse.json({ ok: false, error: saved.error }, { status });
  }

  return NextResponse.json({ ok: true, id: saved.id, mimeType: saved.mimeType });
}
