import Link from "next/link";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import { Field, Forbidden, PageHeader, PrimaryButton, SelectField, AdminFlash } from "@/components/admin/Ui";
import { createServiceAction } from "@/app/admin/actions";

export default async function NewServicePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const auth = await needPermission("services");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const categories = await prisma.serviceCategory.findMany({
    include: { translations: { where: { locale: "en" }, take: 1 } },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Create service"
        note="Creates a draft catalog service with EN/AR translations. Publish (active + indexable) when ready for the public site."
        actions={
          <Link href="/admin/services" className="text-sm text-navy">
            ← Services
          </Link>
        }
      />
      <AdminFlash ok={query.ok} error={query.error} />
      <form action={createServiceAction} className="max-w-xl space-y-3 rounded-md border border-line bg-white p-4">
        <SelectField
          label="Category"
          name="categoryId"
          defaultValue={categories[0]?.id || ""}
          options={categories.map((c) => ({
            value: c.id,
            label: c.translations[0]?.name || c.slug,
          }))}
        />
        <Field label="Slug (URL)" name="slug" required />
        <Field label="English name" name="nameEn" required />
        <Field label="English short description" name="shortEn" textarea />
        <Field label="Arabic name" name="nameAr" />
        <Field label="Arabic short description" name="shortAr" textarea />
        <SelectField
          label="Status"
          name="status"
          defaultValue="draft"
          options={["draft", "active", "requires_approval", "unavailable"].map((value) => ({ value, label: value }))}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="indexable" /> Indexable (only if active)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="bookingEnabled" defaultChecked /> Booking enabled
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="diyAvailable" /> DIY available
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="inspectionRequired" defaultChecked /> Inspection required
        </label>
        <PrimaryButton>Create service</PrimaryButton>
      </form>
    </div>
  );
}
