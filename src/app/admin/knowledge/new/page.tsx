import { needPermission } from "@/lib/admin/guard";
import { Forbidden, PageHeader } from "@/components/admin/Ui";
import { SopForm } from "@/components/admin/SopForm";
import { saveKnowledgeAction } from "@/app/admin/actions";

export const metadata = {
  title: "New SOP | Admin",
  robots: { index: false, follow: false },
};

export default async function NewKnowledgePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const auth = await needPermission("knowledge");
  if (!auth.ok) return <Forbidden />;
  const { error } = await searchParams;
  return (
    <div>
      <PageHeader title="New SOP" note="Created as DRAFT INTERNAL. Activate it before the Co-Founder can use it." />
      {error ? <p className="mb-4 text-sm text-danger">Check title, unique SOP code, and audience.</p> : null}
      <SopForm action={saveKnowledgeAction} />
    </div>
  );
}
