export function str(form: FormData, key: string) {
  return String(form.get(key) || "").trim();
}

export function opt(form: FormData, key: string) {
  const value = str(form, key);
  return value || undefined;
}

export function bool(form: FormData, key: string) {
  const value = String(form.get(key) || "");
  return value === "on" || value === "true" || value === "1";
}

export type LineItemInput = {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  lineTotal: string;
};

export function parseLineItems(form: FormData): LineItemInput[] {
  const descriptions = form.getAll("itemDescription").map((v) => String(v).trim());
  const quantities = form.getAll("itemQuantity").map((v) => String(v).trim());
  const units = form.getAll("itemUnit").map((v) => String(v).trim());
  const prices = form.getAll("itemUnitPrice").map((v) => String(v).trim());
  const totals = form.getAll("itemLineTotal").map((v) => String(v).trim());
  const items: LineItemInput[] = [];
  for (let i = 0; i < descriptions.length; i += 1) {
    if (!descriptions[i]) continue;
    items.push({
      description: descriptions[i].slice(0, 400),
      quantity: (quantities[i] || "1").slice(0, 40),
      unit: (units[i] || "").slice(0, 40),
      unitPrice: (prices[i] || "").slice(0, 40),
      lineTotal: (totals[i] || "").slice(0, 40),
    });
  }
  return items;
}
