import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin/auth";
import { buildExport, DATASETS, type ExportDataset } from "@/lib/admin/exports";
import { isCrossSiteDownloadRequest, verifyDownloadCsrf } from "@/lib/admin/download-csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return new NextResponse("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}

export async function POST(request: Request) {
  const auth = await requireStaff();
  if (!auth.session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  if (isCrossSiteDownloadRequest(request)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

  const csrf = String(form.get("csrf") || "");
  const csrfCheck = verifyDownloadCsrf(csrf, auth.session.id);
  if (!csrfCheck.ok) {
    return NextResponse.json({ ok: false, error: "csrf", reason: csrfCheck.reason }, { status: 403 });
  }

  const dataset = String(form.get("dataset") || "");
  const format = String(form.get("format") || "") === "pdf" ? "pdf" : "xlsx";
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
