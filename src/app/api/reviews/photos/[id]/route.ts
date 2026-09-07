import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getApprovedReviewPhoto } from "@/lib/reviews";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const photo = await getApprovedReviewPhoto(id);
  if (!photo) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const buf = await readFile(/* turbopackIgnore: true */ photo.abs);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": photo.mime,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
