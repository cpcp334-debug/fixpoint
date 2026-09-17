import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminBulkTable, AdminFlash, Forbidden, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { moderateReviewAction } from "@/app/admin/actions";
import { createdAtRange, resolveWindow } from "@/lib/insights/dates";
import type { Prisma, ReviewStatus, ReviewType } from "@prisma/client";

const REVIEW_STATUSES: ReviewStatus[] = ["PENDING", "APPROVED", "REJECTED", "HIDDEN", "FLAGGED", "VERIFIED"];

export default async function ReviewsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; from?: string; to?: string; approved?: string; q?: string; ok?: string; error?: string }>;
}) {
  const auth = await needPermission("reviews");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const where: Prisma.ReviewWhereInput = {};
  if (query.type === "service" || query.type === "article" || query.type === "guide") {
    where.type = query.type as ReviewType;
  }
  if (query.approved === "1") where.status = { in: ["APPROVED", "VERIFIED"] };
  else if (query.status && (REVIEW_STATUSES as string[]).includes(query.status)) {
    where.status = query.status as ReviewStatus;
  }
  if (query.q?.trim()) {
    const q = query.q.trim();
    where.OR = [{ authorName: { contains: q } }, { body: { contains: q } }];
  }
  if (query.from && query.to) {
    const window = resolveWindow({ preset: "custom", from: query.from, to: query.to });
    where.createdAt = createdAtRange(window.start, window.end);
  }
  const rows = await prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  const sp = new URLSearchParams();
  for (const key of ["type", "status", "from", "to", "approved", "q"] as const) {
    const value = query[key];
    if (value) sp.set(key, value);
  }
  const returnTo = `/admin/reviews${sp.toString() ? `?${sp}` : ""}`;
  return (
    <div>
      <PageHeader title="Review moderation" note="Bulk: Publish = APPROVED, Hide = HIDDEN, Soft-remove = REJECTED." />
      <AdminFlash ok={query.ok} error={query.error} />
      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        <input name="q" defaultValue={query.q || ""} placeholder="Search author or body" className="min-w-48 rounded-md border border-line px-3 py-2" />
        <select name="status" defaultValue={query.status || ""} className="rounded-md border border-line px-3 py-2">
          <option value="">All statuses</option>
          {REVIEW_STATUSES.map((status) => (
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
        entity="reviews"
        returnTo={returnTo}
        headers={["Author", "Type", "Stars", "Status", "Verified", "Body", "Per-row"]}
        actionLabels={{ publish: "Approve", hide: "Hide", archive: "Reject" }}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [
            row.authorName,
            row.type,
            row.stars,
            row.status,
            row.verified ? "yes" : "no",
            row.body.slice(0, 160),
            <div key="forms" className="space-y-2">
              <form action={moderateReviewAction} className="space-y-2">
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="intent" value="status" />
                <SelectField
                  label="Status"
                  name="status"
                  defaultValue={row.status}
                  options={["PENDING", "APPROVED", "REJECTED", "HIDDEN", "FLAGGED"].map((value) => ({ value, label: value }))}
                />
                <PrimaryButton>Save status</PrimaryButton>
              </form>
            </div>,
          ],
        }))}
      />
    </div>
  );
}
