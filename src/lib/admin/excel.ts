import ExcelJS from "exceljs";

export async function workbookToBuffer(rows: Array<Record<string, string | number | null | undefined>>, sheetName: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ALNAJAH ALDAEM";
  const sheet = wb.addWorksheet(sheetName.slice(0, 31));
  const keys = rows.length ? Object.keys(rows[0]) : ["empty"];
  sheet.addRow(keys);
  for (const row of rows) {
    sheet.addRow(keys.map((key) => row[key] ?? ""));
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
