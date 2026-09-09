import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Forbidden, PageHeader } from "@/components/admin/Ui";

export default async function ServicesAdminPage() {
  const auth = await needPermission("services");
  if (!auth.ok) return <Forbidden />;
  const rows = await prisma.service.findMany({
    include: { translations: true, category: { include: { translations: true } } },
    orderBy: [{ category: { sortOrder: "asc" } }, { slug: "asc" }],
  });
  return (
    <div>
      <PageHeader title="Services" note="Draft catalog pages stay unpublished until status is active and indexable. Do not invent licenses. Category → children shown for A1 taxonomy." />
      <AdminTable headers={["Category", "Slug", "Name", "Status", "Indexable", ""]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-line">
            <td className="px-3 py-2">{row.category.translations.find((t) => t.locale === "en")?.name || row.category.slug}</td>
            <td className="px-3 py-2">{row.slug}</td>
            <td className="px-3 py-2">{row.translations.find((t) => t.locale === "en")?.name}</td>
            <td className="px-3 py-2">{row.status}</td>
            <td className="px-3 py-2">{row.indexable ? "yes" : "no"}</td>
            <td className="px-3 py-2">
              <a className="text-navy" href={`/admin/services/${row.id}`}>
                Edit
              </a>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
