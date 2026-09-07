import { needSession } from "@/lib/admin/guard";
import { DATASETS } from "@/lib/admin/datasets";
import { exportAllowed } from "@/lib/admin/rbac";
import { Forbidden, PageHeader } from "@/components/admin/Ui";

export default async function ExportsPage() {
  const session = await needSession();
  const datasets = DATASETS.filter((dataset) => exportAllowed(session.role, dataset));
  if (!datasets.length) return <Forbidden />;
  return (
    <div>
      <PageHeader title="Exports" note="Downloads are authenticated, logged, and not indexed. Technicians cannot bulk-export customer lists." />
      <div className="overflow-x-auto rounded-md border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand-2 text-muted">
            <tr>
              <th className="px-3 py-2">Dataset</th>
              <th className="px-3 py-2">Excel</th>
              <th className="px-3 py-2">PDF</th>
            </tr>
          </thead>
          <tbody>
            {datasets.map((dataset) => (
              <tr key={dataset} className="border-t border-line">
                <td className="px-3 py-2 capitalize">{dataset.replace("_", " ")}</td>
                <td className="px-3 py-2">
                  <a className="text-navy" href={`/api/admin/exports?dataset=${dataset}&format=xlsx`}>
                    Download .xlsx
                  </a>
                </td>
                <td className="px-3 py-2">
                  <a className="text-navy" href={`/api/admin/exports?dataset=${dataset}&format=pdf`}>
                    Download .pdf
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
