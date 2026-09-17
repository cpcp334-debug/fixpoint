import Link from "next/link";
import { needPermission } from "@/lib/admin/guard";
import { Forbidden, PageHeader } from "@/components/admin/Ui";
import { SITE_SHELL_SECTIONS, getSiteShellAdmin } from "@/lib/site-shell";

export default async function WebsiteAdminIndex() {
  const auth = await needPermission("diy");
  if (!auth.ok) return <Forbidden />;

  const rows = await Promise.all(
    SITE_SHELL_SECTIONS.map(async (section) => {
      const doc = await getSiteShellAdmin(section);
      return { section, doc };
    }),
  );

  return (
    <div>
      <PageHeader
        title="Website"
        note="Edit Home, Header, and Footer copy (EN + AR). Save as draft or Publish. Public site uses published shell; otherwise falls back to message defaults."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {rows.map(({ section, doc }) => (
          <Link
            key={section}
            href={`/admin/website/${section}`}
            className="rounded-md border border-line bg-white p-4 transition hover:border-navy"
          >
            <p className="text-lg font-semibold capitalize text-navy">{section}</p>
            <p className="mt-1 text-sm text-muted">
              Status: {doc?.status || "not created"}
              {doc?.publishedAt ? ` · published ${doc.publishedAt.toISOString().slice(0, 10)}` : ""}
            </p>
            <p className="mt-2 text-sm text-navy">Open editor →</p>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted">
        Tip: Soft-remove content from catalog lists with bulk Soft-remove. Permanent delete is super-admin only on content edit pages.
      </p>
    </div>
  );
}
