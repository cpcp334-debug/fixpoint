import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/server/db";
import { parseJson } from "@/lib/utils";
import { trackServer } from "@/lib/analytics/server";
import type { ProviderImage } from "@/lib/ai/provider";

export const MAX_PHOTOS = 5;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export function maxUploadBytes() {
  const n = Number(process.env.AI_UPLOAD_MAX_BYTES || 5_242_880);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10_485_760) : 5_242_880;
}

function extFor(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function sniffMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function privateRoot() {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "uploads", "private");
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "photo";
}

export function resolvePrivatePath(storageKey: string) {
  const normalized = storageKey.replace(/\\/g, "/");
  if (!normalized.startsWith("uploads/private/")) return null;
  const rest = normalized.slice("uploads/private/".length);
  return path.join(privateRoot(), ...rest.split("/"));
}

export async function savePrivatePhoto(opts: {
  conversationId: string;
  file: File;
}) {
  const existing = await prisma.mediaAsset.count({
    where: { conversationId: opts.conversationId, visibility: "private" },
  });
  if (existing >= MAX_PHOTOS) {
    return { ok: false as const, error: "limit" as const };
  }

  const max = maxUploadBytes();
  if (opts.file.size <= 0 || opts.file.size > max) {
    return { ok: false as const, error: "size" as const };
  }

  const buf = Buffer.from(await opts.file.arrayBuffer());
  const sniffed = sniffMime(buf);
  if (!sniffed || !ALLOWED_MIME.has(sniffed) || (opts.file.type && !ALLOWED_MIME.has(opts.file.type))) {
    return { ok: false as const, error: "type" as const };
  }
  if (opts.file.type && opts.file.type !== sniffed) {
    return { ok: false as const, error: "type" as const };
  }

  const asset = await prisma.mediaAsset.create({
    data: {
      storageKey: "pending",
      originalName: safeName(opts.file.name || "photo"),
      mimeType: sniffed,
      sizeBytes: buf.length,
      visibility: "private",
      status: "ready",
      conversationId: opts.conversationId,
    },
  });

  const rel = path.posix.join("uploads/private/ai", opts.conversationId, `${asset.id}.${extFor(sniffed)}`);
  const abs = path.join(privateRoot(), "ai", opts.conversationId, `${asset.id}.${extFor(sniffed)}`);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(/* turbopackIgnore: true */ abs, buf);
  await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: { storageKey: rel },
  });

  const conversation = await prisma.aiConversation.findUnique({ where: { id: opts.conversationId } });
  const ids = parseJson<string[]>(conversation?.photoIds, []);
  if (!ids.includes(asset.id)) ids.push(asset.id);
  await prisma.aiConversation.update({
    where: { id: opts.conversationId },
    data: { photoIds: JSON.stringify(ids) },
  });

  try {
    await trackServer("PHOTO_UPLOAD", { meta: { count: 1 } });
  } catch {
    // Analytics must never fail a photo upload.
  }

  return { ok: true as const, id: asset.id, mimeType: sniffed };
}

export async function loadConversationImages(conversationId: string, photoIds: string[]): Promise<ProviderImage[]> {
  if (!photoIds.length) return [];
  const unique = [...new Set(photoIds)].slice(0, MAX_PHOTOS);
  const rows = await prisma.mediaAsset.findMany({
    where: {
      id: { in: unique },
      conversationId,
      visibility: "private",
      status: "ready",
    },
  });
  const images: ProviderImage[] = [];
  for (const row of rows) {
    const abs = resolvePrivatePath(row.storageKey);
    if (!abs) continue;
    try {
      const buf = await readFile(/* turbopackIgnore: true */ abs);
      images.push({ mimeType: row.mimeType, base64: buf.toString("base64") });
    } catch {
      /* skip unreadable */
    }
  }
  return images;
}

export async function getPrivateAsset(id: string, conversationId: string) {
  return prisma.mediaAsset.findFirst({
    where: { id, conversationId, visibility: "private", status: "ready" },
  });
}
