import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";

import * as vercelBlob from "@vercel/blob";
import { AwsClient } from "aws4fetch";

import { type Env, env } from "./env";

/**
 * Private file storage (farm-visit photos, proof of delivery). Files are never
 * served directly: callers read them through an authorized route.
 * The local driver is for development; deployed copies use Vercel Blob or an
 * S3-compatible bucket.
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

const STORAGE_TIMEOUT_MS = 30_000;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function contentTypeOf(key: string): string {
  const extension = key.slice(key.lastIndexOf(".") + 1);
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

/** Raw files in one folder of an online store; keys are checked by the caller. */
type ObjectStore = {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  /** Removing a file that's already gone is fine. */
  remove(key: string): Promise<void>;
};

/**
 * Objects in one S3-compatible bucket (Cloudflare R2 or AWS S3), under
 * `public/` and `private/` like the local driver. The bucket stays private:
 * every file is served through the app's own routes.
 */
function s3Objects(
  config: S3Config,
  folder: "public" | "private",
): ObjectStore {
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
    return send(signed, { signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS) });
  }
  function failure(action: string, response: Response) {
    return new Error(`Storage ${action} failed (${response.status})`);
  }

  return {
    async put(key, bytes) {
      const response = await request(key, {
        method: "PUT",
        body: new Blob([new Uint8Array(bytes)]),
        headers: { "Content-Type": contentTypeOf(key) },
      });
      if (!response.ok) throw failure("upload", response);
    },
    async get(key) {
      const response = await request(key, { method: "GET" });
      if (!response.ok) throw failure("read", response);
      return new Uint8Array(await response.arrayBuffer());
    },
    async remove(key) {
      const response = await request(key, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        throw failure("delete", response);
      }
    },
  };
}

export type BlobClient = Pick<typeof vercelBlob, "put" | "get" | "del">;

/**
 * Files in one private Vercel Blob store, under `public/` and `private/`. On
 * Vercel the SDK signs in by itself (BLOB_STORE_ID with Vercel's OIDC token);
 * elsewhere it uses BLOB_READ_WRITE_TOKEN.
 */
function blobObjects(
  folder: "public" | "private",
  client: BlobClient = vercelBlob,
): ObjectStore {
  const timeout = () => AbortSignal.timeout(STORAGE_TIMEOUT_MS);
  return {
    async put(key, bytes) {
      await client.put(`${folder}/${key}`, Buffer.from(bytes), {
        access: "private",
        addRandomSuffix: false,
        contentType: contentTypeOf(key),
        abortSignal: timeout(),
      });
    },
    async get(key) {
      const result = await client.get(`${folder}/${key}`, {
        access: "private",
        abortSignal: timeout(),
      });
      if (result?.statusCode !== 200) {
        throw new Error("Storage read failed (not found)");
      }
      return new Uint8Array(await new Response(result.stream).arrayBuffer());
    },
    async remove(key) {
      await client.del(`${folder}/${key}`, { abortSignal: timeout() });
    },
  };
}

function privateFrom(objects: ObjectStore): PrivateStorage {
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

export const s3PrivateStorage = (config: S3Config) =>
  privateFrom(s3Objects(config, "private"));
export const blobPrivateStorage = (client?: BlobClient) =>
  privateFrom(blobObjects("private", client));

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
    case "vercel-blob":
      return blobPrivateStorage();
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

function publicFrom(objects: ObjectStore): PublicStorage {
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

export const s3PublicStorage = (config: S3Config) =>
  publicFrom(s3Objects(config, "public"));
export const blobPublicStorage = (client?: BlobClient) =>
  publicFrom(blobObjects("public", client));

export function publicStorage(): PublicStorage {
  const config = env();
  switch (config.STORAGE_DRIVER) {
    case "local":
      return localPublicStorage(config.STORAGE_LOCAL_DIR);
    case "s3":
      return s3PublicStorage(s3ConfigFrom(config));
    case "vercel-blob":
      return blobPublicStorage();
  }
}
