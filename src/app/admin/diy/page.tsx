import { needPermission } from "@/lib/admin/guard";
import { AdminTable, Forbidden, PageHeader } from "@/components/admin/Ui";
import { prisma } from "@/server/db";
import { loadDiyClassificationMatrix } from "@/lib/service-location/diy-matrix";
import { parseDiyProfileJson } from "@/lib/diy/profile-validate";

function sectionCompleteness(profileJson: string): string {
  const parsed = parseDiyProfileJson(profileJson);
  if (!parsed.value || !parsed.value.metadata.authored) return "shell";
  const p = parsed.value;
  const checks = [
    p.main.overview,
    p.main.canIDoIt,
    p.tools.tools.length > 0,
    p.steps.length >= 3,
    p.safety.stopConditions.length > 0,
    p.professional.professionalFallback,
    p.faq.length >= 5,
    p.aeo.whatIs,
  ];
  const ok = checks.filter(Boolean).length;
  return `${ok}/${checks.length}`;
}

export default async function DiyAdminPage() {
  const auth = await needPermission("diy");
  if (!auth.ok) return <Forbidden />;

  const matrix = loadDiyClassificationMatrix();
  const services = await prisma.service.findMany({
    orderBy: { slug: "asc" },
    include: {
      category: true,
      primaryDiyGuide: true,
    },
  });

  const matrixSlugs = new Set(matrix.bySlug.keys());
  const rows = services.filter((s) => matrixSlugs.has(s.slug));

  return (
    <div>
      <PageHeader
        title="DIY / profiles (A4.2)"
        note="311 coverage registry. Batch 1 = 46 GREEN authored drafts. No bulk publish."
      />
      <AdminTable
        headers={[
          "Service",
          "Category",
          "DIY status",
          "Risk",
          "Profile",
          "Primary guide",
          "EN",
          "AR",
          "Safety",
          "Ver",
          "Completeness",
          "",
        ]}
      >
        {rows.map((row) => {
          const m = matrix.bySlug.get(row.slug)!;
          const guide = row.primaryDiyGuide;
          const profile = guide ? parseDiyProfileJson(guide.profileJson).value : null;
          const authored = Boolean(profile?.metadata.authored);
          const enStatus = authored ? "draft_authored" : "coverage_only";
          const completeness = m.diyStatus === "GREEN" && guide ? sectionCompleteness(guide.profileJson) : "—";
          const quality =
            m.diyStatus === "GREEN"
              ? profile?.metadata.status === "safety_review"
                ? "safety_review"
                : authored
                  ? "draft_ok"
                  : "missing"
              : "n/a";
          return (
            <tr key={row.id} className="border-t border-line text-sm">
              <td className="px-3 py-2">{row.slug}</td>
              <td className="px-3 py-2">{row.category?.slug ?? "—"}</td>
              <td className="px-3 py-2">{m.diyStatus}</td>
              <td className="px-3 py-2">{row.riskLevel}</td>
              <td className="px-3 py-2">{guide?.profileStatus ?? "—"}</td>
              <td className="px-3 py-2">{guide?.slug ?? "—"}</td>
              <td className="px-3 py-2">{enStatus}</td>
              <td className="px-3 py-2">{guide?.arabicReviewStatus ?? "not_started"}</td>
              <td className="px-3 py-2">{quality}</td>
              <td className="px-3 py-2">{guide?.profileVersion ?? "—"}</td>
              <td className="px-3 py-2">
                {m.diyStatus === "GREEN" ? (
                  <span>
                    {completeness}
                    {guide?.updatedAt ? ` · ${guide.updatedAt.toISOString().slice(0, 10)}` : ""}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-2">
                {guide ? (
                  <a className="text-navy" href={`/admin/diy/${guide.id}`}>
                    Open
                  </a>
                ) : null}
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </div>
  );
}
