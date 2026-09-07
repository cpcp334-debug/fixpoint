import { NextResponse } from "next/server";
import { createPublicReview, publicReviewSchema } from "@/lib/reviews";
import { clientIp } from "@/server/rate-limit";

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("photo");
      const raw = {
        type: String(form.get("type") || "service"),
        stars: Number(form.get("stars") || 0),
        title: String(form.get("title") || ""),
        body: String(form.get("body") || ""),
        authorName: String(form.get("authorName") || ""),
        serviceSlug: String(form.get("serviceSlug") || "") || undefined,
        locationSlug: String(form.get("locationSlug") || "") || undefined,
        area: String(form.get("area") || "") || undefined,
        guideSlug: String(form.get("guideSlug") || "") || undefined,
        locale: String(form.get("locale") || "en"),
        website: String(form.get("website") || ""),
      };
      const parsed = publicReviewSchema.safeParse(raw);
      if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
      const result = await createPublicReview(parsed.data, ip, file instanceof File ? file : undefined);
      if (!result.ok) {
        const status = result.error === "rateLimit" ? 429 : 400;
        return NextResponse.json({ ok: false, error: result.error }, { status });
      }
      return NextResponse.json({ ok: true, id: "id" in result ? result.id : undefined });
    }

    const json = await request.json();
    const parsed = publicReviewSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
    const result = await createPublicReview(parsed.data, ip);
    if (!result.ok) {
      const status = result.error === "rateLimit" ? 429 : 400;
      return NextResponse.json({ ok: false, error: result.error }, { status });
    }
    return NextResponse.json({ ok: true, id: "id" in result ? result.id : undefined });
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
}
