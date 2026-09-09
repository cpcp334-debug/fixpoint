import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PutObjectInput, StorageAdapter } from "./types";

const DEFAULT_ROOT = "uploads/private";

function normalizeKey(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return normalized;
}

export function createLocalStorage(rootDir = DEFAULT_ROOT): StorageAdapter {
  const absRoot = path.resolve(process.cwd(), rootDir);

  function resolveAbs(key: string) {
    const normalized = normalizeKey(key);
    const abs = path.resolve(absRoot, ...normalized.split("/"));
    if (!abs.startsWith(absRoot + path.sep) && abs !== absRoot) {
      throw new Error(`Storage path escapes root: ${key}`);
    }
    return { abs, relativeKey: path.posix.join(rootDir.replace(/\\/g, "/"), normalized) };
  }

  return {
    async putObject(input: PutObjectInput) {
      const { abs, relativeKey } = resolveAbs(input.key);
      await mkdir(path.dirname(abs), { recursive: true });
      const body = typeof input.body === "string" ? Buffer.from(input.body) : Buffer.from(input.body);
      await writeFile(/* turbopackIgnore: true */ abs, body);
      return { key: relativeKey };
    },

    async getObjectUrl(key: string) {
      const { relativeKey } = resolveAbs(key);
      return relativeKey;
    },

    async deleteObject(key: string) {
      const { abs } = resolveAbs(key);
      try {
        await unlink(/* turbopackIgnore: true */ abs);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") throw err;
      }
    },

    async exists(key: string) {
      const { abs } = resolveAbs(key);
      try {
        await access(/* turbopackIgnore: true */ abs);
        return true;
      } catch {
        return false;
      }
    },
  };
}
