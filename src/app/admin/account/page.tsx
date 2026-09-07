import { needSession } from "@/lib/admin/guard";
import { Field, PageHeader, PrimaryButton } from "@/components/admin/Ui";
import { changePasswordAction } from "@/app/admin/actions";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const session = await needSession();
  const { error, ok } = await searchParams;
  return (
    <div>
      <PageHeader title="Account" note={`${session.email} · ${session.role.replaceAll("_", " ")}`} />
      {error === "short" ? <p className="mb-3 text-sm text-danger">New password must be at least 12 characters.</p> : null}
      {error === "invalid" ? <p className="mb-3 text-sm text-danger">Current password is incorrect.</p> : null}
      {ok ? <p className="mb-3 text-sm text-accent">Password updated.</p> : null}
      <form action={changePasswordAction} className="max-w-md space-y-3 rounded-md border border-line bg-white p-4">
        <Field label="Current password" name="current" type="password" required />
        <Field label="New password" name="next" type="password" required />
        <PrimaryButton>Change password</PrimaryButton>
      </form>
    </div>
  );
}
