import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import {
  AdminFlash,
  AdminPreviewLinks,
  Field,
  Forbidden,
  PageHeader,
  PrimaryButton,
  SelectField,
} from "@/components/admin/Ui";
import { updateLocationAction } from "@/app/admin/actions";
import { locationPathSlug } from "@/lib/slug/locale-slug";
import type { LocationType } from "@prisma/client";

const TYPE_LABEL: Record<LocationType, string> = {
  country: "Country / دولة",
  emirate: "Emirate / إمارة",
  city: "City / مدينة",
  community: "Community · Area · Estate / حي · منطقة · تجمع",
};

export default async function LocationEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const auth = await needPermission("locations");
  if (!auth.ok) return <Forbidden />;
  const { id } = await params;
  const query = await searchParams;
  const row = await prisma.location.findUnique({
    where: { id },
    include: {
      translations: true,
      parent: { include: { translations: true } },
      children: {
        include: { translations: { where: { locale: "en" }, take: 1 } },
        orderBy: { sortOrder: "asc" },
        take: 40,
      },
    },
  });
  if (!row) notFound();
  const en = row.translations.find((t) => t.locale === "en");
  const ar = row.translations.find((t) => t.locale === "ar");
  const parentEn = row.parent?.translations.find((t) => t.locale === "en")?.name || row.parent?.slug;
  const parentAr = row.parent?.translations.find((t) => t.locale === "ar")?.name;
  return (
    <div>
      <PageHeader
        title={en?.name || row.slug}
        note={`${TYPE_LABEL[row.type]} · slug ${row.slug}${parentEn ? ` · parent ${parentEn}${parentAr && /[\u0600-\u06FF]/.test(parentAr) ? ` / ${parentAr}` : ""}` : ""}. Edit LocationI18n EN + AR (name, body, SEO).`}
        actions={
          <AdminPreviewLinks
            enPath={`/locations/${row.slug}`}
            arPath={`/locations/${locationPathSlug("ar", row.slug)}`}
          />
        }
      />
      <AdminFlash ok={query.ok} error={query.error} />
      <form action={updateLocationAction} className="max-w-3xl space-y-3 rounded-md border border-line bg-white p-4">
        <input type="hidden" name="id" value={row.id} />
        <SelectField
          label="Status"
          name="status"
          defaultValue={row.status}
          options={["draft", "active", "archived"].map((value) => ({ value, label: value }))}
        />
        <p className="text-sm text-muted">
          Hierarchy type is fixed on the master record: <strong>{TYPE_LABEL[row.type]}</strong>
          {row.children.length ? ` · ${row.children.length} child place(s) linked` : ""}
        </p>

        <p className="pt-2 text-sm font-medium text-navy">English (LocationI18n)</p>
        <Field label="English name" name="nameEn" defaultValue={en?.name} />
        <Field label="English intro" name="introEn" defaultValue={en?.intro} textarea rows={3} />
        <Field
          label="English local service info (hub body)"
          name="localServiceInfoEn"
          defaultValue={en?.localServiceInfo}
          textarea
          rows={8}
        />
        <Field label="English property types" name="propertyTypesEn" defaultValue={en?.propertyTypes} textarea rows={3} />
        <Field label="English nearby areas" name="nearbyAreasEn" defaultValue={en?.nearbyAreas} textarea rows={3} />
        <Field label="English SEO title" name="seoTitleEn" defaultValue={en?.seoTitle} />
        <Field label="English meta description" name="metaDescriptionEn" defaultValue={en?.metaDescription} textarea rows={2} />

        <p className="pt-3 text-sm font-medium text-navy">Arabic (LocationI18n)</p>
        <p className="text-xs text-muted">
          Enter a real Arabic place name — not Latin and not REVIEW_REQUIRED. Hub body/SEO fields publish on /ar/locations.
        </p>
        <Field label="Arabic name" name="nameAr" defaultValue={ar?.name || ""} />
        <Field label="Arabic intro" name="introAr" defaultValue={ar?.intro || ""} textarea rows={3} />
        <Field
          label="Arabic local service info (hub body)"
          name="localServiceInfoAr"
          defaultValue={ar?.localServiceInfo || ""}
          textarea
          rows={8}
        />
        <Field
          label="Arabic property types"
          name="propertyTypesAr"
          defaultValue={ar?.propertyTypes || ""}
          textarea
          rows={3}
        />
        <Field label="Arabic nearby areas" name="nearbyAreasAr" defaultValue={ar?.nearbyAreas || ""} textarea rows={3} />
        <Field label="Arabic SEO title" name="seoTitleAr" defaultValue={ar?.seoTitle || ""} />
        <Field
          label="Arabic meta description"
          name="metaDescriptionAr"
          defaultValue={ar?.metaDescription || ""}
          textarea
          rows={2}
        />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="serves" defaultChecked={row.serves} /> Serves
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="indexable" defaultChecked={row.indexable} /> Indexable
        </label>
        <PrimaryButton>Save</PrimaryButton>
      </form>

      {row.children.length ? (
        <div className="mt-6 max-w-3xl rounded-md border border-line bg-white p-4">
          <h2 className="text-sm font-semibold text-navy">Child places under this hub</h2>
          <ul className="mt-3 grid gap-1 text-sm text-muted sm:grid-cols-2">
            {row.children.map((child) => (
              <li key={child.id}>
                <a className="text-navy hover:underline" href={`/admin/locations/${child.id}`}>
                  {child.translations[0]?.name || child.slug}
                </a>{" "}
                <span className="text-xs">({TYPE_LABEL[child.type] || child.type})</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
