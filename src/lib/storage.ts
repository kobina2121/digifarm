import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";

import { AwsClient } from "aws4fetch";

import { type Env, env } from "./env";

/**
 * Private file storage (farm-visit photos, proof of delivery). Files are never
 * served directly: callers read them through an authorized route.
 * The local driver is for development; deployed copies use an S3-compatible bucket.
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

export type S3Config = {
  /** e.g. https://<account-id>.r2.cloudflarestorage.com for Cloudflare R2. */
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  fetch?: typeof fetch;
};

const S3_TIMEOUT_MS = 30_000;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Objects in one S3-compatible bucket (Cloudflare R2 or AWS S3), under
 * `public/` and `private/` like the local driver. The bucket stays private:
 * every file is served through the app's own routes.
 */
function s3Objects(config: S3Config, folder: "public" | "private") {
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: config.region,
  });
  const send = config.fetch ?? fetch;
  const base = `${config.endpoint.replace(/\/+$/, "")}/${config.bucket}/${folder}`;

  async function request(key: string, init: RequestInit) {
    const signed = await client.sign(`${base}/${key}`, init);
    return send(signed, { signal: AbortSignal.timeout(S3_TIMEOUT_MS) });
  }
  function failure(action: string, response: Response) {
    return new Error(`Storage ${action} failed (${response.status})`);
  }

  return {
    async put(key: string, bytes: Uint8Array) {
      const extension = key.slice(key.lastIndexOf(".") + 1);
      const response = await request(key, {
        method: "PUT",
        body: new Blob([new Uint8Array(bytes)]),
        headers: {
          "Content-Type":
            CONTENT_TYPES[extension] ?? "application/octet-stream",
        },
      });
      if (!response.ok) throw failure("upload", response);
    },
    async get(key: string) {
      const response = await request(key, { method: "GET" });
      if (!response.ok) throw failure("read", response);
      return new Uint8Array(await response.arrayBuffer());
    },
    async remove(key: string) {
      const response = await request(key, { method: "DELETE" });
      // Removing a file that's already gone is fine.
      if (!response.ok && response.status !== 404) {
        throw failure("delete", response);
      }
    },
  };
}

export function s3PrivateStorage(config: S3Config): PrivateStorage {
  const objects = s3Objects(config, "private");
  return {
    async put(prefix, bytes, extension) {
      const key = `${prefix}/${randomUUID()}.${extension}`;
      assertSafeKey(key);
      await objects.put(key, bytes);
      return key;
    },
    async get(key) {
      assertSafeKey(key);
      return objects.get(key);
    },
    async remove(key) {
      assertSafeKey(key);
      await objects.remove(key);
    },
  };
}

function s3ConfigFrom(config: Env): S3Config {
  // parseEnv refuses STORAGE_DRIVER=s3 unless all of these are set.
  return {
    endpoint: config.S3_ENDPOINT!,
    bucket: config.S3_BUCKET!,
    accessKeyId: config.S3_ACCESS_KEY_ID!,
    secretAccessKey: config.S3_SECRET_ACCESS_KEY!,
    region: config.S3_REGION,
  };
}

export function privateStorage(): PrivateStorage {
  const config = env();
  switch (config.STORAGE_DRIVER) {
    case "local":
      return localStorage(config.STORAGE_LOCAL_DIR);
    case "s3":
      return s3PrivateStorage(s3ConfigFrom(config));
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

function checkPublicKey(key: string): void {
  if (!PUBLIC_IMAGE_KEY.test(key)) throw new Error("Invalid storage key");
}

function localPublicStorage(root: string): PublicStorage {
  const base = path.resolve(root, "public");
  return {
    async put(key, bytes) {
      checkPublicKey(key);
      const file = path.join(base, key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes, { flag: "wx" });
    },
    async get(key) {
      checkPublicKey(key);
      return readFile(path.join(base, key));
    },
  };
}

export function s3PublicStorage(config: S3Config): PublicStorage {
  const objects = s3Objects(config, "public");
  return {
    async put(key, bytes) {
      checkPublicKey(key);
      await objects.put(key, bytes);
    },
    async get(key) {
      checkPublicKey(key);
      return objects.get(key);
    },
  };
}

export function publicStorage(): PublicStorage {
  const config = env();
  switch (config.STORAGE_DRIVER) {
    case "local":
      return localPublicStorage(config.STORAGE_LOCAL_DIR);
    case "s3":
      return s3PublicStorage(s3ConfigFrom(config));
  }
}
