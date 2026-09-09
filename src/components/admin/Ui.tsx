import type { ReactNode } from "react";
import Link from "next/link";
import { can, exportAllowed, roleLabel, type AdminPermission, canViewTasks } from "@/lib/admin/rbac";
import { DATASETS } from "@/lib/admin/datasets";
import type { StaffSession } from "@/lib/admin/auth";
import { canViewAnalytics } from "@/lib/insights/rbac";
import { canUseCoFounder } from "@/lib/cofounder/rbac";

export function Forbidden() {
  return (
    <div className="rounded-md border border-line bg-white p-6">
      <h1 className="text-xl font-semibold">Access denied</h1>
      <p className="mt-2 text-muted">Your role cannot open this page.</p>
    </div>
  );
}

export function PageHeader({ title, note, actions }: { title: string; note?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {note ? <p className="mt-1 max-w-2xl text-sm text-muted">{note}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function AdminTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-sand-2 text-muted">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  textarea,
  rows = 4,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  required?: boolean;
  textarea?: boolean;
  rows?: number;
}) {
  const cls = "mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm";
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {textarea ? (
        <textarea name={name} defaultValue={defaultValue || ""} rows={rows} className={cls} required={required} />
      ) : (
        <input name={name} type={type} defaultValue={defaultValue || ""} className={cls} required={required} />
      )}
    </label>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <select name={name} defaultValue={defaultValue || ""} className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm">
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PrimaryButton({ children }: { children: ReactNode }) {
  return (
    <button type="submit" className="inline-flex min-h-10 items-center rounded-md bg-navy px-4 text-sm font-medium text-white">
      {children}
    </button>
  );
}

export function LineItems({ rows }: { rows?: Array<{ description: string; quantity: string; unit: string; unitPrice: string; lineTotal: string }> }) {
  const filled = [...(rows || [])];
  while (filled.length < 5) {
    filled.push({ description: "", quantity: "1", unit: "", unitPrice: "", lineTotal: "" });
  }
  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-sm font-medium">Line items</p>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="text-muted">
            <th className="pb-2">Description</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Unit price</th>
            <th>Line total</th>
          </tr>
        </thead>
        <tbody>
          {filled.map((row, i) => (
            <tr key={i}>
              <td className="pr-2 pb-2">
                <input name="itemDescription" defaultValue={row.description} className="w-full rounded-md border border-line px-2 py-1" />
              </td>
              <td className="pr-2 pb-2">
                <input name="itemQuantity" defaultValue={row.quantity} className="w-24 rounded-md border border-line px-2 py-1" />
              </td>
              <td className="pr-2 pb-2">
                <input name="itemUnit" defaultValue={row.unit} className="w-24 rounded-md border border-line px-2 py-1" />
              </td>
              <td className="pr-2 pb-2">
                <input name="itemUnitPrice" defaultValue={row.unitPrice} className="w-28 rounded-md border border-line px-2 py-1" />
              </td>
              <td className="pb-2">
                <input name="itemLineTotal" defaultValue={row.lineTotal} className="w-28 rounded-md border border-line px-2 py-1" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const LINKS: Array<{ href: string; label: string; permission: AdminPermission }> = [
  { href: "/admin", label: "Dashboard", permission: "dashboard" },
  { href: "/admin/ai", label: "AI Co-Founder", permission: "dashboard" },
  { href: "/admin/analytics", label: "Analytics", permission: "dashboard" },
  { href: "/admin/automation", label: "Automation", permission: "automation" },
  { href: "/admin/knowledge", label: "Knowledge", permission: "knowledge" },
  { href: "/admin/leads", label: "Leads", permission: "leads" },
  { href: "/admin/customers", label: "Customers", permission: "customers" },
  { href: "/admin/bookings", label: "Bookings", permission: "bookings" },
  { href: "/admin/tasks", label: "Tasks", permission: "dashboard" },
  { href: "/admin/work-orders", label: "Work orders", permission: "work_orders" },
  { href: "/admin/reviews", label: "Reviews", permission: "reviews" },
  { href: "/admin/questions", label: "Q&A", permission: "questions" },
  { href: "/admin/services", label: "Services", permission: "services" },
  { href: "/admin/service-pages", label: "Service pages", permission: "services" },
  { href: "/admin/locations", label: "Locations", permission: "locations" },
  { href: "/admin/diy", label: "DIY / content", permission: "diy" },
  { href: "/admin/quotes", label: "Quotations", permission: "quotes" },
  { href: "/admin/invoices", label: "Invoices", permission: "invoices" },
  { href: "/admin/amc", label: "AMC", permission: "amc" },
  { href: "/admin/pricing", label: "Pricing rules", permission: "pricing" },
  { href: "/admin/exports", label: "Exports", permission: "exports" },
  { href: "/admin/audit", label: "Audit log", permission: "audit" },
  { href: "/admin/staff", label: "Staff", permission: "staff" },
];

export function AdminNav({ session }: { session: StaffSession }) {
  const items = LINKS.filter((link) => {
    if (link.href === "/admin/analytics") return canViewAnalytics(session.role);
    if (link.href === "/admin/ai") return canUseCoFounder(session.role);
    if (link.href === "/admin/tasks") return canViewTasks(session.role);
    if (link.permission === "exports") return DATASETS.some((dataset) => exportAllowed(session.role, dataset));
    return can(session.role, link.permission);
  });
  return (
    <aside className="flex w-60 shrink-0 flex-col bg-navy text-white">
      <div className="border-b border-white/10 px-4 py-4">
        <p className="text-xs uppercase tracking-widest text-gold">Staff</p>
        <p className="font-semibold">ALNAJAH ALDAEM</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 text-sm">
        {items.map((link) => (
          <Link key={link.href} href={link.href} className="block rounded-md px-3 py-2 text-white/85 hover:bg-white/10">
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/10 px-4 py-3 text-xs text-white/70">
        <p>{session.name}</p>
        <p className="capitalize">{roleLabel(session.role)}</p>
        <Link href="/admin/account" className="mt-2 inline-block text-gold">
          Account
        </Link>
      </div>
    </aside>
  );
}
