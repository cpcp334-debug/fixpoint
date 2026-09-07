import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Forbidden, PageHeader } from "@/components/admin/Ui";

export default async function LocationsAdminPage() {
  const auth = await needPermission("locations");
  if (!auth.ok) return <Forbidden />;
  const rows = await prisma.location.findMany({ include: { translations: true }, orderBy: [{ type: "asc" }, { sortOrder: "asc" }] });
  return (
    <div>
      <PageHeader title="Locations" note="Do not publish community pages unless content is ready. Public licenses remain Sharjah 925212 and Ajman 132954." />
      <AdminTable headers={["Slug", "Name", "Type", "Status", "Serves", "Indexable", ""]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-line">
            <td className="px-3 py-2">{row.slug}</td>
            <td className="px-3 py-2">{row.translations.find((t) => t.locale === "en")?.name}</td>
            <td className="px-3 py-2">{row.type}</td>
            <td className="px-3 py-2">{row.status}</td>
            <td className="px-3 py-2">{row.serves ? "yes" : "no"}</td>
            <td className="px-3 py-2">{row.indexable ? "yes" : "no"}</td>
            <td className="px-3 py-2">
              <a className="text-navy" href={`/admin/locations/${row.id}`}>
                Edit
              </a>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
