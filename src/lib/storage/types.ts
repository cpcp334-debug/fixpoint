export type PutObjectInput = {
  /** Relative object key within the provider root (posix-style). */
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
};

export type StorageAdapter = {
  putObject(input: PutObjectInput): Promise<{ key: string }>;
  /** Returns a path or URL suitable for local/private resolution — not necessarily public. */
  getObjectUrl(key: string): Promise<string>;
  deleteObject(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
};

export type StorageProviderName = "local" | "s3";
