import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Forbidden, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { moderateQuestionAction } from "@/app/admin/actions";

export default async function QuestionsAdminPage() {
  const auth = await needPermission("questions");
  if (!auth.ok) return <Forbidden />;
  const rows = await prisma.question.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div>
      <PageHeader title="Q&A moderation" note="A question is public only when approved and answered." />
      <AdminTable headers={["Asker", "Question", "Status", "Answer"]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-line align-top">
            <td className="px-3 py-2">{row.askerName || "—"}</td>
            <td className="px-3 py-2 max-w-md">{row.body}</td>
            <td className="px-3 py-2">{row.moderationStatus}</td>
            <td className="px-3 py-2">
              <form action={moderateQuestionAction} className="space-y-2">
                <input type="hidden" name="id" value={row.id} />
                <SelectField
                  label="Moderation"
                  name="status"
                  defaultValue={row.moderationStatus}
                  options={["PENDING", "APPROVED", "REJECTED", "HIDDEN"].map((value) => ({ value, label: value }))}
                />
                <textarea name="answer" defaultValue={row.answer} className="w-full rounded-md border border-line px-2 py-1 text-sm" rows={3} />
                <PrimaryButton>Save</PrimaryButton>
              </form>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
