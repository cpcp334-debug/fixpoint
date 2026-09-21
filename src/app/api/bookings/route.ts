import { NextResponse } from "next/server";
import { createPublicBooking, publicBookingSchema } from "@/lib/bookings";
import { clientIp } from "@/server/rate-limit";

function str(form: FormData, key: string) {
  const value = String(form.get(key) || "").trim();
  return value || undefined;
}

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const files = form
        .getAll("photos")
        .filter((item): item is File => item instanceof File && item.size > 0)
        .slice(0, 5);
      const raw = {
        type: str(form, "type") || "standard",
        name: String(form.get("name") || ""),
        phone: String(form.get("phone") || ""),
        whatsapp: str(form, "whatsapp"),
        email: str(form, "email"),
        serviceSlug: str(form, "serviceSlug"),
        locationSlug: str(form, "locationSlug"),
        city: str(form, "city"),
        area: str(form, "area"),
        propertyType: str(form, "propertyType"),
        requirement: String(form.get("requirement") || ""),
        preferredDate: str(form, "preferredDate"),
        preferredTime: str(form, "preferredTime"),
        frequency: str(form, "frequency"),
        amcReference: str(form, "amcReference"),
        locale: str(form, "locale") || "en",
        source: "booking",
        website: String(form.get("website") || ""),
        attribution: (() => {
          const raw = String(form.get("attribution") || "").trim();
          if (!raw) return undefined;
          try {
            return JSON.parse(raw) as Record<string, unknown>;
          } catch {
            return undefined;
          }
        })(),
      };
      const parsed = publicBookingSchema.safeParse(raw);
      if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
      const result = await createPublicBooking(parsed.data, ip, files);
      if (!result.ok) {
        const status = result.error === "rateLimit" ? 429 : 400;
        return NextResponse.json({ ok: false, error: result.error }, { status });
      }
      return NextResponse.json({
        ok: true,
        id: "id" in result ? result.id : undefined,
        number: "number" in result ? result.number : undefined,
      });
    }

    const json = await request.json();
    const parsed = publicBookingSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
    const result = await createPublicBooking(parsed.data, ip);
    if (!result.ok) {
      const status = result.error === "rateLimit" ? 429 : 400;
      return NextResponse.json({ ok: false, error: result.error }, { status });
    }
    return NextResponse.json({
      ok: true,
      id: "id" in result ? result.id : undefined,
      number: "number" in result ? result.number : undefined,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
}
