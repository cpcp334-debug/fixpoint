import { needSession } from "@/lib/admin/guard";
import { DATASETS } from "@/lib/admin/datasets";
import { exportAllowed } from "@/lib/admin/rbac";
import { mintDownloadCsrfForSession } from "@/lib/admin/download-csrf";
import { Forbidden, PageHeader } from "@/components/admin/Ui";
import { AdminDownloadForm } from "@/components/admin/AdminDownloadForm";

export default async function ExportsPage() {
  const session = await needSession();
  const datasets = DATASETS.filter((dataset) => exportAllowed(session.role, dataset));
  if (!datasets.length) return <Forbidden />;

  const csrf = mintDownloadCsrfForSession(session);
  if (!csrf.ok) {
    return (
      <div>
        <PageHeader title="Exports" note="Downloads are authenticated, logged, and not indexed." />
        <p className="text-sm text-danger">Download protection is not configured (DOWNLOAD_CSRF_SECRET required, min 32 characters).</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Exports" note="Downloads use POST + CSRF. They are authenticated, logged, and not indexed. Technicians cannot bulk-export customer lists." />
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
                  <AdminDownloadForm
                    action="/api/admin/exports"
                    csrf={csrf.token}
                    label="Download .xlsx"
                    fields={{ dataset, format: "xlsx" }}
                  />
                </td>
                <td className="px-3 py-2">
                  <AdminDownloadForm
                    action="/api/admin/exports"
                    csrf={csrf.token}
                    label="Download .pdf"
                    fields={{ dataset, format: "pdf" }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
