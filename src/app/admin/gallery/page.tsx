import Link from "next/link";
import { prisma } from "@/server/db";
import { needPermission } from "@/lib/admin/guard";
import {
  AdminBulkTable,
  AdminCatalogEmptyHint,
  AdminFlash,
  AdminListSummary,
  Forbidden,
  PageHeader,
} from "@/components/admin/Ui";
import { galleryStatusFilter, galleryVisibilityLabel, galleryWhere } from "@/lib/admin/gallery";
import type { Prisma } from "@prisma/client";

const STATUSES = ["published", "hidden", "archived"] as const;

export default async function GalleryAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; ok?: string; error?: string }>;
}) {
  const auth = await needPermission("diy");
  if (!auth.ok) return <Forbidden />;
  const query = await searchParams;
  const parts: Prisma.MediaAssetWhereInput[] = [];
  const statusFilter = galleryStatusFilter(query.status);
  if (statusFilter) parts.push(statusFilter);
  if (query.q?.trim()) {
    const q = query.q.trim();
    parts.push({
      OR: [
        { storageKey: { contains: q } },
        { originalName: { contains: q } },
        { alt: { contains: q } },
        { caption: { contains: q } },
      ],
    });
  }
  const where = galleryWhere(parts.length ? { AND: parts } : undefined);
  const baseWhere = galleryWhere(undefined);
  const [totalAssets, matchingCount, publicAssets, rows] = await Promise.all([
    prisma.mediaAsset.count({ where: baseWhere }),
    prisma.mediaAsset.count({ where }),
    prisma.mediaAsset.count({ where: { ...baseWhere, visibility: "public", status: "ready" } }),
    prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  if (query.status) sp.set("status", query.status);
  const returnTo = `/admin/gallery${sp.toString() ? `?${sp}` : ""}`;

  return (
    <div>
      <PageHeader
        title="Gallery"
        note="Uses MediaAsset (not a new table). Register paths under /media/... or upload into public/media/gallery. Publish = public+ready; Hide = private; Soft-remove = archived."
        actions={
          <Link
            href="/admin/gallery/new"
            className="inline-flex min-h-10 items-center rounded-md bg-navy px-4 text-sm font-medium text-white"
          >
            Add media
          </Link>
        }
      />
      <AdminFlash ok={query.ok} error={query.error} />
      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        <input
          name="q"
          defaultValue={query.q || ""}
          placeholder="Search path, title, alt, caption"
          className="min-w-48 rounded-md border border-line px-3 py-2"
        />
        <select name="status" defaultValue={query.status || ""} className="rounded-md border border-line px-3 py-2">
          <option value="">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-line px-3 py-2">
          Filter
        </button>
      </form>
      <AdminCatalogEmptyHint
        total={totalAssets}
        noun="gallery assets"
        steps="Add media via Admin → Gallery → Add media, or register paths under /media/."
      />
      <AdminListSummary
        noun="gallery assets"
        total={totalAssets}
        matching={matchingCount}
        showing={rows.length}
        stats={[{ label: "public + ready", value: publicAssets }]}
      />
      <AdminBulkTable
        entity="gallery"
        returnTo={returnTo}
        headers={["Preview", "Path", "Title", "Alt", "Status", ""]}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [
            row.storageKey.startsWith("/media/") ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin gallery thumbnails
              <img key="thumb" src={row.storageKey} alt="" className="h-12 w-12 rounded object-cover" />
            ) : (
              "—"
            ),
            row.storageKey,
            row.originalName,
            row.alt || "—",
            galleryVisibilityLabel(row.visibility, row.status),
            <Link key="edit" className="text-navy" href={`/admin/gallery/${row.id}`}>
              Edit
            </Link>,
          ],
        }))}
        emptyNote="No gallery media yet. Register an existing /media/... path or upload."
      />
    </div>
  );
}
