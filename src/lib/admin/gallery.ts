import { existsSync, statSync } from "node:fs";
import path from "node:path";
import type { Prisma } from "@prisma/client";

/** Gallery rows are MediaAsset records that are not private AI conversation uploads. */
export function galleryWhere(extra?: Prisma.MediaAssetWhereInput): Prisma.MediaAssetWhereInput {
  return {
    AND: [
      { conversationId: null },
      { NOT: { storageKey: { startsWith: "uploads/private" } } },
      ...(extra ? [extra] : []),
    ],
  };
}

/** Normalize pasted paths to a public web path under /media/... */
export function normalizePublicMediaPath(raw: string) {
  let value = raw.trim().replace(/\\/g, "/");
  if (!value) return "";
  if (value.startsWith("public/")) value = value.slice("public/".length);
  if (!value.startsWith("/")) value = `/${value}`;
  if (!value.startsWith("/media/")) return "";
  if (value.includes("..")) return "";
  return value.replace(/\/{2,}/g, "/");
}

export function publicMediaAbsolutePath(webPath: string) {
  const normalized = normalizePublicMediaPath(webPath);
  if (!normalized) return null;
  // Keep paths under public/media only (Hostinger/Turbopack tracing).
  const mediaRoot = path.join(process.cwd(), "public", "media");
  const abs = path.join(mediaRoot, ...normalized.replace(/^\/media\/?/, "").split("/").filter(Boolean));
  const root = path.resolve(mediaRoot);
  const resolved = path.resolve(abs);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(prefix)) return null;
  return resolved;
}

export function mimeFromPath(webPath: string) {
  const lower = webPath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}

export function fileNameFromPath(webPath: string) {
  return webPath.split("/").filter(Boolean).pop() || "image";
}

export function statPublicMedia(webPath: string) {
  const abs = publicMediaAbsolutePath(webPath);
  if (!abs || !existsSync(/*turbopackIgnore: true*/ abs)) return { exists: false as const, sizeBytes: 0 };
  try {
    return { exists: true as const, sizeBytes: statSync(/*turbopackIgnore: true*/ abs).size };
  } catch {
    return { exists: false as const, sizeBytes: 0 };
  }
}

export function galleryVisibilityLabel(visibility: string, status: string) {
  if (status === "archived") return "archived";
  if (visibility === "public" && status === "ready") return "published";
  return "hidden";
}

export function galleryStatusFilter(status?: string): Prisma.MediaAssetWhereInput | undefined {
  if (status === "published") return { visibility: "public", status: "ready" };
  if (status === "hidden") {
    return {
      AND: [{ status: { not: "archived" } }, { OR: [{ visibility: { not: "public" } }, { status: { not: "ready" } }] }],
    };
  }
  if (status === "archived") return { status: "archived" };
  return undefined;
}
