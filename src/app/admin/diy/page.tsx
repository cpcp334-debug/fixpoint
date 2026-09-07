import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Forbidden, PageHeader } from "@/components/admin/Ui";

export default async function DiyAdminPage() {
  const auth = await needPermission("diy");
  if (!auth.ok) return <Forbidden />;
  const rows = await prisma.diyGuide.findMany({ include: { translations: true, category: true }, orderBy: { slug: "asc" } });
  return (
    <div>
      <PageHeader title="DIY / content" note="Published + indexable guides appear on the public DIY hub. Draft stubs stay 404." />
      <AdminTable headers={["Slug", "Title", "Status", "Indexable", ""]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-line">
            <td className="px-3 py-2">{row.slug}</td>
            <td className="px-3 py-2">{row.translations.find((t) => t.locale === "en")?.title}</td>
            <td className="px-3 py-2">{row.status}</td>
            <td className="px-3 py-2">{row.indexable ? "yes" : "no"}</td>
            <td className="px-3 py-2">
              <a className="text-navy" href={`/admin/diy/${row.id}`}>
                Edit
              </a>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
