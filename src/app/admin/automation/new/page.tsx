import { needPermission } from "@/lib/admin/guard";
import { Field, Forbidden, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { saveAutomationRuleAction } from "@/app/admin/actions";
import { TRIGGER_OPTIONS } from "@/lib/admin/automation";

export default async function NewAutomationRulePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const auth = await needPermission("automation");
  if (!auth.ok) return <Forbidden />;
  const { error } = await searchParams;
  return (
    <div>
      <PageHeader title="New automation rule" note="New rules are created disabled. Enable them from the list after review." />
      {error ? <p className="mb-4 text-sm text-danger">Check the trigger, conditions, and that every action is allowed.</p> : null}
      <form action={saveAutomationRuleAction} className="max-w-3xl space-y-3 rounded-md border border-line bg-white p-4">
        <Field label="Key" name="key" required />
        <Field label="Name" name="name" required />
        <Field label="Description" name="description" textarea />
        <SelectField label="Trigger" name="trigger" options={TRIGGER_OPTIONS} />
        <Field label="Priority (lower runs first)" name="priority" defaultValue="100" />
        <Field label="Delay seconds" name="delaySeconds" defaultValue="0" />
        <Field label="Conditions JSON" name="conditionsJson" defaultValue="[]" textarea />
        <Field label="Actions JSON" name="actionsJson" defaultValue='[{"type":"CREATE_TASK","title":"Follow up"}]' textarea />
        <PrimaryButton>Create disabled rule</PrimaryButton>
      </form>
    </div>
  );
}
