import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";

import { env } from "./env";

/**
 * Private file storage (farm-visit photos, proof of delivery). Files are never
 * served directly: callers read them through an authorized route.
 * The local driver is for development; an S3-compatible driver comes before staging.
 */
export interface PrivateStorage {
  put(prefix: string, bytes: Uint8Array, extension: string): Promise<string>;
  get(key: string): Promise<Uint8Array>;
  /** Permanently removes a file. Removing one that's already gone is fine. */
  remove(key: string): Promise<void>;
}

const KEY_PATTERN = /^[a-z0-9-]+\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export function assertSafeKey(key: string): void {
  if (!KEY_PATTERN.test(key)) throw new Error("Invalid storage key");
}

function localStorage(root: string): PrivateStorage {
  const base = path.resolve(root, "private");
  return {
    async put(prefix, bytes, extension) {
      const key = `${prefix}/${randomUUID()}.${extension}`;
      assertSafeKey(key);
      const file = path.join(base, key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes, { flag: "wx" });
      return key;
    },
    async get(key) {
      assertSafeKey(key);
      return readFile(path.join(base, key));
    },
    async remove(key) {
      assertSafeKey(key);
      await rm(path.join(base, key), { force: true });
    },
  };
}

export function privateStorage(): PrivateStorage {
  const config = env();
  switch (config.STORAGE_DRIVER) {
    case "local":
      return localStorage(config.STORAGE_LOCAL_DIR);
  }
}

/**
 * Public file storage (listing photos). Anyone may read these; keys are random
 * and files are immutable, so they can be cached for a long time.
 */
export interface PublicStorage {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array>;
}

export const PUBLIC_IMAGE_KEY = /^listings\/[0-9a-f-]{36}-(480|1200)\.webp$/;

function localPublicStorage(root: string): PublicStorage {
  const base = path.resolve(root, "public");
  const check = (key: string) => {
    if (!PUBLIC_IMAGE_KEY.test(key)) throw new Error("Invalid storage key");
  };
  return {
    async put(key, bytes) {
      check(key);
      const file = path.join(base, key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes, { flag: "wx" });
    },
    async get(key) {
      check(key);
      return readFile(path.join(base, key));
    },
  };
}

export function publicStorage(): PublicStorage {
  const config = env();
  switch (config.STORAGE_DRIVER) {
    case "local":
      return localPublicStorage(config.STORAGE_LOCAL_DIR);
  }
}
