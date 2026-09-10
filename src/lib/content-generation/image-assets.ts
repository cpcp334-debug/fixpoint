/**
 * Image asset generation jobs — honest fallback / external-required path.
 * Does NOT fabricate binaries. Records metadata for approved_fallback policy.
 */
import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { enqueueJob } from "./jobs";
import { recordPipelineMetric } from "@/lib/observability/pipeline-metrics";

export type ImageAssetJobResult = {
  status: "approved_fallback" | "external_required" | "service_hero_present";
  promptVersion: string;
  contentHash: string;
  objectStorageConfigured: boolean;
  src: string | null;
  altEn: string;
  altAr: string;
};

const PROMPT_VERSION = "alnajah-image-v1-fallback-only";

function storageConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(
    env.STORAGE_PROVIDER === "s3" &&
      env.OBJECT_STORAGE_BUCKET &&
      env.OBJECT_STORAGE_ACCESS_KEY_ID &&
      env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
  );
}

export function buildImageAssetMetadata(args: {
  serviceSlug: string;
  serviceNameEn: string;
  serviceNameAr: string;
  locationNameEn?: string;
  locationNameAr?: string;
  serviceHeroImage?: string | null;
  riskLevel: string;
}): ImageAssetJobResult {
  const objectStorageConfigured = storageConfigured();
  const altEn = args.locationNameEn
    ? `${args.serviceNameEn} in ${args.locationNameEn}`
    : args.serviceNameEn;
  const altAr = args.locationNameAr
    ? `${args.serviceNameAr} في ${args.locationNameAr}`
    : args.serviceNameAr;
  const contentHash = createHash("sha256")
    .update(`${PROMPT_VERSION}|${args.serviceSlug}|${args.riskLevel}|fallback`)
    .digest("hex");

  if (args.serviceHeroImage?.startsWith("/") && !args.serviceHeroImage.includes("/media/hero.jpg")) {
    return {
      status: "service_hero_present",
      promptVersion: PROMPT_VERSION,
      contentHash,
      objectStorageConfigured,
      src: args.serviceHeroImage,
      altEn,
      altAr,
    };
  }

  if (!objectStorageConfigured) {
    recordPipelineMetric({
      metric: "image_resolve_fallback",
      tags: { service: args.serviceSlug, reason: "object_storage_not_configured" },
    });
    return {
      status: "external_required",
      promptVersion: PROMPT_VERSION,
      contentHash,
      objectStorageConfigured: false,
      src: null,
      altEn,
      altAr,
    };
  }

  // Credentials present but no real image client — still honest fallback
  return {
    status: "approved_fallback",
    promptVersion: PROMPT_VERSION,
    contentHash,
    objectStorageConfigured: true,
    src: null,
    altEn,
    altAr,
  };
}

export async function enqueueServiceImageFallbackJob(
  prisma: PrismaClient,
  args: { serviceId: string; serviceSlug: string },
) {
  return enqueueJob(
    {
      kind: "image_asset",
      idempotencyKey: `image_asset:service:${args.serviceSlug}:v1`,
      batchKey: `image-fallback-${new Date().toISOString().slice(0, 10)}`,
      generationVersion: 1,
      serviceId: args.serviceId,
      locale: null,
      priority: 2,
      payloadJson: JSON.stringify({ mode: "approved_fallback_metadata", serviceSlug: args.serviceSlug }),
    },
    prisma,
  );
}
