import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getAuthorizedConversation } from "@/lib/ai/conversations";
import { getPrivateAsset, resolvePrivatePath } from "@/lib/ai/uploads";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const conversationId = url.searchParams.get("conversationId") || "";
  if (!token || !conversationId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const conversation = await getAuthorizedConversation(conversationId, token);
  if (!conversation) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const asset = await getPrivateAsset(id, conversationId);
  if (!asset) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const abs = resolvePrivatePath(asset.storageKey);
  if (!abs) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const buf = await readFile(/* turbopackIgnore: true */ abs);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
