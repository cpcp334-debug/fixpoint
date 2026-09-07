import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { Field, Forbidden, PageHeader, PrimaryButton } from "@/components/admin/Ui";
import { saveCustomerAction } from "@/app/admin/actions";
import { JourneyTimeline } from "@/components/admin/JourneyTimeline";
import { buildJourney } from "@/lib/journey/aggregate";
import { canViewIdentifiableJourney } from "@/lib/journey/rbac";
import { journeyPageFromSearch } from "@/lib/journey/types";

export default async function CustomerDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ jt?: string }>;
}) {
  const auth = await needPermission("customers");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const query = await searchParams;
  const row = await prisma.customer.findUnique({
    where: { id },
    include: { bookings: true, quotes: true, invoices: true, workOrders: true },
  });
  if (!row) notFound();
  const journey = canViewIdentifiableJourney(auth.session.role, "customer")
    ? await buildJourney(
        { type: "customer", id },
        { role: auth.session.role, staffId: auth.session.staffId, page: journeyPageFromSearch(query.jt) },
      )
    : null;
  return (
    <div>
      <PageHeader title={row.name} />
      <form action={saveCustomerAction} className="mb-8 max-w-xl space-y-3 rounded-md border border-line bg-white p-4">
        <input type="hidden" name="id" value={row.id} />
        <Field label="Name" name="name" defaultValue={row.name} required />
        <Field label="Phone" name="phone" defaultValue={row.phone} />
        <Field label="Email" name="email" defaultValue={row.email} />
        <Field label="WhatsApp" name="whatsapp" defaultValue={row.whatsapp} />
        <Field label="Notes" name="notes" defaultValue={row.notes} textarea />
        <PrimaryButton>Save</PrimaryButton>
      </form>
      <p className="mb-6 text-sm text-muted">
        {row.bookings.length} bookings · {row.quotes.length} quotes · {row.invoices.length} invoices · {row.workOrders.length} work orders
      </p>
      {journey ? <JourneyTimeline journey={journey} /> : null}
    </div>
  );
}
