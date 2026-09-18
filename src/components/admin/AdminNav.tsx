"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { can, exportAllowed, roleLabel, type AdminPermission, canViewTasks } from "@/lib/admin/rbac";
import { DATASETS } from "@/lib/admin/datasets";
import type { StaffSession } from "@/lib/admin/auth";
import { canViewAnalytics } from "@/lib/insights/rbac";
import { canUseCoFounder } from "@/lib/cofounder/rbac";
import { cn } from "@/lib/utils";

const ADMIN_MARK = "/media/logo-icon.png";

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
  { href: "/admin/blogs", label: "Blogs", permission: "diy" },
  { href: "/admin/faqs", label: "FAQs", permission: "diy" },
  { href: "/admin/gallery", label: "Gallery", permission: "diy" },
  { href: "/admin/website", label: "Website (Home / Header / Footer)", permission: "diy" },
  { href: "/admin/quotes", label: "Quotations", permission: "quotes" },
  { href: "/admin/invoices", label: "Invoices", permission: "invoices" },
  { href: "/admin/amc", label: "AMC", permission: "amc" },
  { href: "/admin/pricing", label: "Pricing rules", permission: "pricing" },
  { href: "/admin/exports", label: "Exports", permission: "exports" },
  { href: "/admin/audit", label: "Audit log", permission: "audit" },
  { href: "/admin/staff", label: "Staff", permission: "staff" },
];

export function AdminNav({ session }: { session: StaffSession }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = LINKS.filter((link) => {
    if (link.href === "/admin/analytics") return canViewAnalytics(session.role);
    if (link.href === "/admin/ai") return canUseCoFounder(session.role);
    if (link.href === "/admin/tasks") return canViewTasks(session.role);
    if (link.permission === "exports") return DATASETS.some((dataset) => exportAllowed(session.role, dataset));
    return can(session.role, link.permission);
  });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const navBody = (
    <>
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
        <Image src={ADMIN_MARK} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-md object-cover" />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-gold">Staff</p>
          <p className="font-semibold leading-snug">Al Najah Al Daem · Fixpoint</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 text-sm">
        {items.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "block min-h-10 rounded-md px-3 py-2.5 text-white/85 hover:bg-white/10",
              (pathname === link.href || (link.href !== "/admin" && pathname.startsWith(`${link.href}/`))) &&
                "bg-white/15 text-white",
            )}
            onClick={() => setOpen(false)}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/10 px-4 py-3 text-xs text-white/70">
        <p>{session.name}</p>
        <p className="capitalize">{roleLabel(session.role)}</p>
        <Link href="/admin/account" className="mt-2 inline-block min-h-10 py-2 text-gold" onClick={() => setOpen(false)}>
          Account
        </Link>
      </div>
    </>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-navy px-4 py-3 text-white lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <Image src={ADMIN_MARK} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-md object-cover" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-gold">Staff</p>
            <p className="truncate text-sm font-semibold">Al Najah Al Daem · Fixpoint</p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-white/20 text-sm"
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        id="admin-mobile-nav"
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-[min(18rem,88vw)] flex-col bg-navy text-white transition-transform duration-200 lg:static lg:z-auto lg:w-60 lg:translate-x-0 lg:transition-none",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {navBody}
      </aside>
    </>
  );
}
