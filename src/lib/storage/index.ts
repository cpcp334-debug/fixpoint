import type { StorageAdapter, StorageProviderName } from "./types";
import { createLocalStorage } from "./local";
import { createS3StubStorage } from "./s3-stub";

export type { PutObjectInput, StorageAdapter, StorageProviderName } from "./types";
export { createLocalStorage } from "./local";
export { createS3StubStorage } from "./s3-stub";

function resolveProvider(raw: string | undefined): StorageProviderName {
  const value = (raw ?? "local").trim().toLowerCase();
  if (value === "s3") return "s3";
  if (value === "local" || value === "") return "local";
  throw new Error(`Unknown STORAGE_PROVIDER="${raw}". Use "local" (default) or "s3".`);
}

/**
 * Resolve the active storage adapter.
 * Default: local disk under uploads/private.
 * S3: stub only — throws "not configured" unless/until a real client exists.
 */
export function getStorage(env: NodeJS.ProcessEnv = process.env): StorageAdapter {
  const provider = resolveProvider(env.STORAGE_PROVIDER);
  if (provider === "s3") {
    return createS3StubStorage();
  }
  const root = env.LOCAL_STORAGE_ROOT?.trim() || "uploads/private";
  return createLocalStorage(root);
}
