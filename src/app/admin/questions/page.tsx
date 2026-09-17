import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminBulkTable, AdminFlash, Forbidden, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { moderateQuestionAction } from "@/app/admin/actions";
import type { Prisma, ReviewStatus } from "@prisma/client";

const MOD_STATUSES: ReviewStatus[] = ["PENDING", "APPROVED", "REJECTED", "HIDDEN", "FLAGGED", "VERIFIED"];

export default async function QuestionsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; ok?: string; error?: string }>;
}) {
  const auth = await needPermission("questions");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const where: Prisma.QuestionWhereInput = {};
  if (query.status && (MOD_STATUSES as string[]).includes(query.status)) {
    where.moderationStatus = query.status as ReviewStatus;
  }
  if (query.q?.trim()) {
    const q = query.q.trim();
    where.OR = [
      { askerName: { contains: q } },
      { body: { contains: q } },
    ];
  }
  const rows = await prisma.question.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  if (query.status) sp.set("status", query.status);
  const returnTo = `/admin/questions${sp.toString() ? `?${sp}` : ""}`;
  return (
    <div>
      <PageHeader title="Q&A moderation" note="Bulk: Publish = APPROVED+published, Hide = HIDDEN+draft, Soft-remove = REJECTED+archived." />
      <AdminFlash ok={query.ok} error={query.error} />
      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        <input name="q" defaultValue={query.q || ""} placeholder="Search asker or question" className="min-w-48 rounded-md border border-line px-3 py-2" />
        <select name="status" defaultValue={query.status || ""} className="rounded-md border border-line px-3 py-2">
          <option value="">All moderation</option>
          {["PENDING", "APPROVED", "REJECTED", "HIDDEN"].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-line px-3 py-2">
          Filter
        </button>
      </form>
      <AdminBulkTable
        entity="questions"
        returnTo={returnTo}
        headers={["Asker", "Question", "Status", "Answer / edit"]}
        actionLabels={{ publish: "Approve", hide: "Hide", archive: "Reject" }}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [
            row.askerName || "—",
            <span key="body" className="max-w-md block">
              {row.body}
            </span>,
            row.moderationStatus,
            <form key="form" action={moderateQuestionAction} className="space-y-2">
              <input type="hidden" name="id" value={row.id} />
              <SelectField
                label="Moderation"
                name="status"
                defaultValue={row.moderationStatus}
                options={["PENDING", "APPROVED", "REJECTED", "HIDDEN"].map((value) => ({ value, label: value }))}
              />
              <textarea name="answer" defaultValue={row.answer} className="w-full rounded-md border border-line px-2 py-1 text-sm" rows={3} />
              <PrimaryButton>Save</PrimaryButton>
            </form>,
          ],
        }))}
      />
    </div>
  );
}
