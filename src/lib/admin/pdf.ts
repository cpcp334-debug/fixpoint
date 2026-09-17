import { siteConfig } from "@/config/site";

export type PdfLine = { description: string; quantity: string; unit: string; unitPrice: string; lineTotal: string };

export type BrandedDoc = {
  kind: "quotation" | "invoice";
  number: string;
  dateLabel: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  locationLabel?: string;
  serviceLabel?: string;
  scope?: string;
  exclusions?: string;
  validity?: string;
  paymentTerms?: string;
  notes?: string;
  items: PdfLine[];
  subtotalLabel: string;
  discountLabel: string;
  taxLabel: string;
  totalLabel: string;
};

export async function renderBrandedPdf(doc: BrandedDoc): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const pdf = new PDFDocument({ size: "A4", margin: 50, compress: false });
  const chunks: Buffer[] = [];
  pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve) => {
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
  });

  pdf.rect(0, 0, 595, 72).fill("#0b1f3a");
  pdf.fillColor("#ffffff").fontSize(16).text("Al Najah Al Daem · Fixpoint", 50, 22);
  pdf.fontSize(9).fillColor("#b8923a").text("Professional Cleaning & Building Maintenance Services", 50, 44);

  pdf.fillColor("#1a2332").fontSize(14).text(doc.kind === "quotation" ? "QUOTATION" : "INVOICE", 50, 90);
  pdf.fontSize(10).fillColor("#5c6778").text(doc.number, 50, 110);
  pdf.text(doc.dateLabel, 400, 110, { width: 145, align: "right" });

  pdf.fillColor("#1a2332").fontSize(10).text("Bill to", 50, 140);
  pdf.fillColor("#5c6778").text(
    [doc.customerName, doc.customerPhone, doc.customerEmail, doc.locationLabel, doc.serviceLabel].filter(Boolean).join("\n"),
    50,
    156,
    { width: 280 },
  );

  pdf.fillColor("#1a2332").text("Al Najah Al Daem · Fixpoint", 340, 140, { width: 205 });
  pdf.fillColor("#5c6778").text(
    [
      siteConfig.phoneDisplay,
      siteConfig.email,
      "Sharjah cleaning license 925212",
      "Ajman maintenance license 132954",
    ].join("\n"),
    340,
    156,
    { width: 205 },
  );

  let y = 230;
  pdf.fillColor("#0b1f3a").fontSize(9).text("Description", 50, y);
  pdf.text("Qty", 300, y);
  pdf.text("Unit", 340, y);
  pdf.text("Price", 400, y);
  pdf.text("Total", 480, y);
  y += 16;
  pdf.moveTo(50, y).lineTo(545, y).strokeColor("#ddd6c8").stroke();
  y += 8;
  pdf.fillColor("#1a2332").fontSize(9);
  for (const item of doc.items.length ? doc.items : [{ description: "No line items", quantity: "", unit: "", unitPrice: "", lineTotal: "" }]) {
    pdf.text(item.description.slice(0, 80), 50, y, { width: 240 });
    pdf.text(item.quantity, 300, y);
    pdf.text(item.unit, 340, y);
    pdf.text(item.unitPrice, 400, y);
    pdf.text(item.lineTotal, 480, y);
    y += 18;
    if (y > 700) {
      pdf.addPage();
      y = 50;
    }
  }

  y += 10;
  pdf.fillColor("#5c6778").text(`Subtotal: ${doc.subtotalLabel || "—"}`, 360, y, { width: 185 });
  y += 14;
  pdf.text(`Discount: ${doc.discountLabel || "—"}`, 360, y, { width: 185 });
  y += 14;
  pdf.text(`Tax / charges: ${doc.taxLabel || "—"}`, 360, y, { width: 185 });
  y += 16;
  pdf.fillColor("#0b1f3a").fontSize(11).text(`Total: ${doc.totalLabel || "—"}`, 360, y, { width: 185 });

  y += 36;
  pdf.fontSize(9).fillColor("#5c6778");
  if (doc.scope) {
    pdf.text(`Scope: ${doc.scope}`, 50, y, { width: 495 });
    y += 28;
  }
  if (doc.exclusions) {
    pdf.text(`Exclusions: ${doc.exclusions}`, 50, y, { width: 495 });
    y += 28;
  }
  if (doc.validity) {
    pdf.text(`Validity: ${doc.validity}`, 50, y, { width: 495 });
    y += 20;
  }
  if (doc.paymentTerms) {
    pdf.text(`Payment terms: ${doc.paymentTerms}`, 50, y, { width: 495 });
    y += 20;
  }
  if (doc.notes) {
    pdf.text(`Notes: ${doc.notes}`, 50, y, { width: 495 });
    y += 28;
  }

  pdf.fontSize(8).fillColor("#5c6778").text(
    doc.kind === "quotation"
      ? "This quotation is not a confirmed booking and is not a price invented by AI. Amounts are staff-entered and remain subject to site conditions and human review. Public licenses listed: Sharjah 925212 (internal building cleaning) and Ajman 132954 (building maintenance). We do not claim a trade license in every emirate."
      : "This invoice records amounts entered by authorized staff. It is not proof of an online payment unless a payment reference is shown. Public licenses listed: Sharjah 925212 and Ajman 132954. This document does not confirm a service appointment by itself.",
    50,
    760,
    { width: 495 },
  );

  pdf.end();
  return finished;
}

export async function renderListPdf(title: string, headers: string[], rows: string[][]) {
  const PDFDocument = (await import("pdfkit")).default;
  const pdf = new PDFDocument({ size: "A4", margin: 40, compress: false, layout: rows[0] && headers.length > 6 ? "landscape" : "portrait" });
  const chunks: Buffer[] = [];
  pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve) => {
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
  });
  pdf.rect(0, 0, pdf.page.width, 56).fill("#0b1f3a");
  pdf.fillColor("#ffffff").fontSize(14).text("Al Najah Al Daem · Fixpoint", 40, 18);
  pdf.fontSize(9).fillColor("#b8923a").text(title, 40, 36);
  pdf.fillColor("#1a2332").fontSize(8);
  let y = 72;
  pdf.text(headers.join("  |  "), 40, y, { width: pdf.page.width - 80 });
  y += 16;
  pdf.moveTo(40, y).lineTo(pdf.page.width - 40, y).strokeColor("#ddd6c8").stroke();
  y += 8;
  for (const row of rows) {
    pdf.text(row.map((cell) => String(cell || "—").slice(0, 40)).join("  |  "), 40, y, { width: pdf.page.width - 80 });
    y += 14;
    if (y > pdf.page.height - 50) {
      pdf.addPage();
      y = 40;
    }
  }
  pdf.fontSize(8).fillColor("#5c6778").text("Internal staff export. Contains operational data. Not for public indexing.", 40, pdf.page.height - 32);
  pdf.end();
  return finished;
}
