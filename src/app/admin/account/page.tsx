import { needSession } from "@/lib/admin/guard";
import { changePasswordAction } from "@/app/admin/actions";
import { Field, PageHeader, PrimaryButton } from "@/components/admin/Ui";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await needSession();
  const { error } = await searchParams;
  return (
    <div>
      <PageHeader title="Account" note={`${session.email} · ${session.role.replaceAll("_", " ")}. Changing your password signs you out of every device.`} />
      {error === "short" ? <p className="mb-3 text-sm text-danger">New password must be at least 12 characters.</p> : null}
      {error === "invalid" ? <p className="mb-3 text-sm text-danger">Current password is incorrect.</p> : null}
      <form action={changePasswordAction} className="max-w-md space-y-3 rounded-md border border-line bg-white p-4">
        <Field label="Current password" name="current" type="password" required />
        <Field label="New password" name="next" type="password" required />
        <PrimaryButton>Change password</PrimaryButton>
      </form>
    </div>
  );
}
