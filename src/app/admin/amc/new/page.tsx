import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { Forbidden, PageHeader } from "@/components/admin/Ui";
import { AmcForm } from "@/components/admin/AmcForm";

export const metadata = {
  title: "New AMC | Admin",
  robots: { index: false, follow: false },
};

export default async function NewAmcPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const auth = await needPermission("amc");
  if (!auth.ok) return <Forbidden />;
  const { error } = await searchParams;
  const customers = await prisma.customer.findMany({ orderBy: { name: "asc" }, take: 200, select: { id: true, name: true } });
  return (
    <div>
      <PageHeader title="New AMC contract" note="Create a contract record only. This does not bill the customer or schedule visits." />
      {error ? <p className="mb-4 text-sm text-danger">Check the customer and dates.</p> : null}
      {!customers.length ? <p className="mb-4 text-sm text-muted">Add a customer first.</p> : <AmcForm customers={customers} />}
    </div>
  );
}
