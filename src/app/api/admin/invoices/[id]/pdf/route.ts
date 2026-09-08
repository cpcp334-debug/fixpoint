import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin/auth";
import { invoicePdfBuffer } from "@/lib/admin/invoices";
import { adminAudit } from "@/lib/admin/numbers";
import { isCrossSiteDownloadRequest, verifyDownloadCsrf } from "@/lib/admin/download-csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return new NextResponse("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff("invoices");
  if (!auth.session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!auth.ok) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

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

  const { id } = await params;
  const file = await invoicePdfBuffer(id);
  if (!file) return NextResponse.json({ ok: false, error: "missing" }, { status: 404 });
  await adminAudit({ actor: auth.session.email, action: "invoice.pdf", entity: "Invoice", entityId: id });
  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${file.file}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
