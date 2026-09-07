import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Forbidden, PageHeader, PrimaryButton, SelectField } from "@/components/admin/Ui";
import { moderateReviewAction } from "@/app/admin/actions";
import { createdAtRange, resolveWindow } from "@/lib/insights/dates";
import type { Prisma, ReviewStatus, ReviewType } from "@prisma/client";

const REVIEW_STATUSES: ReviewStatus[] = ["PENDING", "APPROVED", "REJECTED", "HIDDEN", "FLAGGED", "VERIFIED"];

export default async function ReviewsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; from?: string; to?: string; approved?: string }>;
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
  if (query.from && query.to) {
    const window = resolveWindow({ preset: "custom", from: query.from, to: query.to });
    where.createdAt = createdAtRange(window.start, window.end);
  }
  const rows = await prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div>
      <PageHeader title="Review moderation" note="Public site shows only approved service reviews. Verified Customer requires a completed work order." />
      <AdminTable headers={["Author", "Type", "Stars", "Status", "Verified", "Body", ""]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-line align-top">
            <td className="px-3 py-2">{row.authorName}</td>
            <td className="px-3 py-2">{row.type}</td>
            <td className="px-3 py-2">{row.stars}</td>
            <td className="px-3 py-2">{row.status}</td>
            <td className="px-3 py-2">{row.verified ? "yes" : "no"}</td>
            <td className="px-3 py-2 max-w-sm">{row.body.slice(0, 160)}</td>
            <td className="px-3 py-2">
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
              <form action={moderateReviewAction} className="mt-2 space-y-2">
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="intent" value="respond" />
                <textarea name="adminResponse" defaultValue={row.adminResponse} className="w-full rounded-md border border-line px-2 py-1 text-sm" />
                <PrimaryButton>Respond</PrimaryButton>
              </form>
              <form action={moderateReviewAction} className="mt-2">
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="intent" value="verify" />
                <PrimaryButton>Verify if completed WO</PrimaryButton>
              </form>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
