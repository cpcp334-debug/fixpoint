import { redirect } from "next/navigation";
import { requireStaff, type StaffSession } from "@/lib/admin/auth";
import type { AdminPermission } from "@/lib/admin/rbac";

export async function needSession() {
  const auth = await requireStaff();
  if (!auth.session) redirect("/login");
  return auth.session;
}

export async function needPermission(permission: AdminPermission): Promise<
  { ok: true; session: StaffSession } | { ok: false; session: StaffSession }
> {
  const auth = await requireStaff(permission);
  if (!auth.session) redirect("/login");
  if (!auth.ok) return { ok: false, session: auth.session };
  return { ok: true, session: auth.session };
}
