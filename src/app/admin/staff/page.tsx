import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { STAFF_ROLES } from "@/lib/admin/rbac";
import { AdminBulkTable, AdminFlash, Field, Forbidden, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { createStaffAction, createStaffRecordAction, resetStaffPasswordAction, setStaffActiveAction } from "@/app/admin/actions";

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string; q?: string }> }) {
  const auth = await needPermission("staff");
  if (!auth.ok) return <Forbidden />;
  const { error, ok, q } = await searchParams;
  const where = q?.trim()
    ? {
        OR: [
          { name: { contains: q.trim() } },
          { email: { contains: q.trim() } },
        ],
      }
    : {};
  const [users, staff] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" } }),
    prisma.staff.findMany({ orderBy: { staffCode: "asc" } }),
  ]);
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  const returnTo = `/admin/staff${sp.toString() ? `?${sp}` : ""}`;
  return (
    <div className="space-y-8">
      <PageHeader title="Staff" note="Bulk Publish = activate login. Hide/Soft-remove = deactivate (never the only active super admin). Passwords are never shown." />
      <AdminFlash ok={ok} error={error} />
      <form action={createStaffAction} className="grid max-w-3xl gap-3 rounded-md border border-line bg-white p-4 sm:grid-cols-2">
        <Field label="Name" name="name" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Temporary password" name="password" type="password" required />
        <SelectField label="Role" name="role" options={STAFF_ROLES.map((value) => ({ value, label: value.replaceAll("_", " ") }))} />
        <SelectField label="Link staff record" name="staffId" options={[{ value: "", label: "None" }, ...staff.map((s) => ({ value: s.id, label: s.staffCode }))]} />
        <PrimaryButton>Create login</PrimaryButton>
      </form>
      <form className="flex flex-wrap gap-2 text-sm" method="get">
        <input name="q" defaultValue={q || ""} placeholder="Search name or email" className="min-w-48 rounded-md border border-line px-3 py-2" />
        <button type="submit" className="rounded-md border border-line px-3 py-2">
          Search
        </button>
      </form>
      <AdminBulkTable
        entity="staff"
        returnTo={returnTo}
        headers={["Name", "Email", "Role", "Active", "Actions"]}
        actionLabels={{ publish: "Activate", hide: "Deactivate", archive: "Deactivate (archive)" }}
        rows={users.map((user) => ({
          id: user.id,
          cells: [
            user.name,
            user.email,
            user.role,
            user.active ? "yes" : "no",
            <div key="actions" className="space-y-2">
              <form action={resetStaffPasswordAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="id" value={user.id} />
                <input name="password" type="password" placeholder="New password" className="rounded-md border border-line px-2 py-1 text-sm" />
                <button type="submit" className="text-sm text-navy">
                  Reset password
                </button>
              </form>
              <form action={setStaffActiveAction}>
                <input type="hidden" name="id" value={user.id} />
                <input type="hidden" name="active" value={user.active ? "false" : "true"} />
                <button type="submit" className="text-sm text-navy">
                  {user.active ? "Deactivate" : "Activate"}
                </button>
              </form>
            </div>,
          ],
        }))}
      />
      <h2 className="text-lg font-semibold">Assignment records</h2>
      <form action={createStaffRecordAction} className="mb-4 flex max-w-xl flex-wrap gap-3 rounded-md border border-line bg-white p-4">
        <input name="staffCode" placeholder="Staff code" required className="rounded-md border border-line px-3 py-2 text-sm" />
        <select name="staffRole" className="rounded-md border border-line px-3 py-2 text-sm">
          <option value="technician">technician</option>
          <option value="supervisor">supervisor</option>
          <option value="customer_service">customer_service</option>
          <option value="sales">sales</option>
          <option value="manager">manager</option>
        </select>
        <PrimaryButton>Add record</PrimaryButton>
      </form>
      <ul className="text-sm">
        {staff.map((row) => (
          <li key={row.id}>
            {row.staffCode} · {row.role} · {row.id}
          </li>
        ))}
      </ul>
    </div>
  );
}
