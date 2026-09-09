import type { PutObjectInput, StorageAdapter } from "./types";

/**
 * S3 / object-storage stub.
 *
 * Status: NOT CONFIGURED. Selecting STORAGE_PROVIDER=s3 without credentials
 * throws a clear error. Do not treat this as a working S3 integration.
 *
 * Required when (and only when) a real provider is wired later:
 * - OBJECT_STORAGE_PROVIDER
 * - OBJECT_STORAGE_BUCKET
 * - OBJECT_STORAGE_REGION
 * - OBJECT_STORAGE_ACCESS_KEY_ID
 * - OBJECT_STORAGE_SECRET_ACCESS_KEY
 * - OBJECT_STORAGE_ENDPOINT (optional, for S3-compatible APIs)
 * - OBJECT_STORAGE_FORCE_PATH_STYLE (optional)
 *
 * See docs/object-storage.md.
 */
export function createS3StubStorage(): StorageAdapter {
  const bucket = process.env.OBJECT_STORAGE_BUCKET?.trim();
  const accessKey = process.env.OBJECT_STORAGE_ACCESS_KEY_ID?.trim();
  const secretKey = process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY?.trim();
  const region = process.env.OBJECT_STORAGE_REGION?.trim();

  if (!bucket || !accessKey || !secretKey || !region) {
    const missing = [
      !bucket && "OBJECT_STORAGE_BUCKET",
      !accessKey && "OBJECT_STORAGE_ACCESS_KEY_ID",
      !secretKey && "OBJECT_STORAGE_SECRET_ACCESS_KEY",
      !region && "OBJECT_STORAGE_REGION",
    ].filter(Boolean);
    throw new Error(
      `Object storage (S3) is not configured. Missing: ${missing.join(", ")}. ` +
        `Set STORAGE_PROVIDER=local (default) or configure OBJECT_STORAGE_* env vars. ` +
        `See docs/object-storage.md.`,
    );
  }

  // Credentials present still does not mean a real client is implemented.
  throw new Error(
    "Object storage (S3) adapter is a stub and is not configured for use. " +
      "STORAGE_PROVIDER=s3 is not supported until a real provider client is implemented. " +
      "Use STORAGE_PROVIDER=local. See docs/object-storage.md.",
  );
}

/** Exported for type/check completeness — never reaches a successful call today. */
export function s3StubUnreachable(_input: PutObjectInput): never {
  throw new Error("S3 storage is not configured");
}
