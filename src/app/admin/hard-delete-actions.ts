"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireStaff } from "@/lib/admin/auth";
import { adminAudit } from "@/lib/admin/numbers";
import { str } from "@/lib/admin/forms";
import {
  revalidatePublicArticle,
  revalidatePublicDiy,
  revalidatePublicLocation,
  revalidatePublicService,
} from "@/lib/admin/revalidate-public";
import type { BulkEntity } from "@/app/admin/bulk-actions";

const HARD_DELETE_ENTITIES = new Set<BulkEntity>([
  "articles",
  "diy",
  "gallery",
  "services",
  "locations",
]);

function safeReturnTo(raw: string, fallback: string) {
  if (!raw.startsWith("/admin")) return fallback;
  if (raw.includes("//") || raw.includes("\\")) return fallback;
  return raw.slice(0, 500);
}

function withFlash(returnTo: string, ok: string, extra?: Record<string, string>) {
  const url = new URL(returnTo, "http://local.invalid");
  url.searchParams.set("ok", ok);
  url.searchParams.delete("error");
  if (extra) {
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  }
  return `${url.pathname}${url.search}`;
}

function withError(returnTo: string, error: string) {
  const url = new URL(returnTo, "http://local.invalid");
  url.searchParams.set("error", error);
  url.searchParams.delete("ok");
  return `${url.pathname}${url.search}`;
}

/**
 * Permanent delete — super_admin only.
 * Prefer Soft-remove (archive) for normal staff workflows.
 */
export async function hardDeleteAction(formData: FormData) {
  const entity = str(formData, "entity") as BulkEntity;
  const id = str(formData, "id");
  const confirm = str(formData, "confirm");
  const returnTo = safeReturnTo(str(formData, "returnTo") || "/admin", "/admin");

  if (!HARD_DELETE_ENTITIES.has(entity) || !id) {
    redirect(withError(returnTo, "delete_forbidden"));
  }
  if (confirm !== "DELETE") {
    redirect(withError(returnTo, "delete_confirm"));
  }

  const auth = await requireStaff("dashboard");
  if (!auth.session) redirect("/login");
  if (!auth.ok || (auth.session.role !== "super_admin" && auth.session.role !== "admin")) {
    redirect(withError(returnTo, "delete_forbidden"));
  }

  switch (entity) {
    case "articles": {
      const row = await prisma.article.findUnique({ where: { id } });
      if (!row) redirect(withError(returnTo, "not_found"));
      await prisma.article.delete({ where: { id } });
      revalidatePublicArticle(row.slug);
      revalidatePath("/admin/blogs");
      revalidatePath("/admin/faqs");
      break;
    }
    case "diy": {
      const row = await prisma.diyGuide.findUnique({ where: { id } });
      if (!row) redirect(withError(returnTo, "not_found"));
      await prisma.service.updateMany({ where: { primaryDiyGuideId: id }, data: { primaryDiyGuideId: null } });
      await prisma.diyGuide.delete({ where: { id } });
      revalidatePublicDiy(row.slug);
      revalidatePath("/admin/diy");
      break;
    }
    case "gallery": {
      await prisma.mediaAsset.delete({ where: { id } });
      revalidatePath("/admin/gallery");
      break;
    }
    case "services": {
      const row = await prisma.service.findUnique({
        where: { id },
        include: { category: { select: { slug: true } } },
      });
      if (!row) redirect(withError(returnTo, "not_found"));
      const linked = await prisma.serviceLocation.count({ where: { serviceId: id } });
      if (linked > 0) redirect(withError(returnTo, "delete_has_sl"));
      await prisma.diyGuide.updateMany({ where: { serviceId: id }, data: { serviceId: null } });
      await prisma.service.delete({ where: { id } });
      revalidatePublicService(row.slug, row.category.slug);
      revalidatePath("/admin/services");
      break;
    }
    case "locations": {
      const row = await prisma.location.findUnique({ where: { id } });
      if (!row) redirect(withError(returnTo, "not_found"));
      if (row.type === "country" || row.type === "emirate") {
        redirect(withError(returnTo, "delete_master_place"));
      }
      const linked = await prisma.serviceLocation.count({ where: { locationId: id } });
      if (linked > 0) redirect(withError(returnTo, "delete_has_sl"));
      const children = await prisma.location.count({ where: { parentId: id } });
      if (children > 0) redirect(withError(returnTo, "delete_has_children"));
      await prisma.location.delete({ where: { id } });
      revalidatePublicLocation(row.slug);
      revalidatePath("/admin/locations");
      break;
    }
    default:
      redirect(withError(returnTo, "delete_forbidden"));
  }

  await adminAudit({
    actor: auth.session.email,
    action: `hard_delete.${entity}`,
    entity,
    entityId: id,
  });

  redirect(withFlash(returnTo, "hard_deleted"));
}
