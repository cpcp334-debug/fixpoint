import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin/auth";
import { buildExport, DATASETS, type ExportDataset } from "@/lib/admin/exports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireStaff();
  if (!auth.session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const dataset = url.searchParams.get("dataset") || "";
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  if (!(DATASETS as readonly string[]).includes(dataset)) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const result = await buildExport({
    dataset: dataset as ExportDataset,
    format,
    user: auth.session,
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 403 });
  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": result.mime,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
