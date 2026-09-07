import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { STAFF_ROLES } from "@/lib/admin/rbac";
import { AdminTable, Field, Forbidden, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { createStaffAction, createStaffRecordAction, resetStaffPasswordAction } from "@/app/admin/actions";

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const auth = await needPermission("staff");
  if (!auth.ok) return <Forbidden />;
  const { error, ok } = await searchParams;
  const [users, staff] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.staff.findMany({ orderBy: { staffCode: "asc" } }),
  ]);
  return (
    <div className="space-y-8">
      <PageHeader title="Staff" note="Login accounts use roles for access control. Staff records are used for booking/work-order assignment." />
      {error ? <p className="text-sm text-danger">Check email, role, and a password of at least 12 characters.</p> : null}
      {ok ? <p className="text-sm text-accent">Saved.</p> : null}
      <form action={createStaffAction} className="grid max-w-3xl gap-3 rounded-md border border-line bg-white p-4 sm:grid-cols-2">
        <Field label="Name" name="name" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Temporary password" name="password" type="password" required />
        <SelectField label="Role" name="role" options={STAFF_ROLES.map((value) => ({ value, label: value.replaceAll("_", " ") }))} />
        <SelectField label="Link staff record" name="staffId" options={[{ value: "", label: "None" }, ...staff.map((s) => ({ value: s.id, label: s.staffCode }))]} />
        <PrimaryButton>Create login</PrimaryButton>
      </form>
      <AdminTable headers={["Name", "Email", "Role", "Active", "Reset"]}>
        {users.map((user) => (
          <tr key={user.id} className="border-t border-line">
            <td className="px-3 py-2">{user.name}</td>
            <td className="px-3 py-2">{user.email}</td>
            <td className="px-3 py-2">{user.role}</td>
            <td className="px-3 py-2">{user.active ? "yes" : "no"}</td>
            <td className="px-3 py-2">
              <form action={resetStaffPasswordAction} className="flex gap-2">
                <input type="hidden" name="id" value={user.id} />
                <input name="password" type="password" placeholder="New password" className="rounded-md border border-line px-2 py-1 text-sm" />
                <button type="submit" className="text-sm text-navy">
                  Reset
                </button>
              </form>
            </td>
          </tr>
        ))}
      </AdminTable>
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
