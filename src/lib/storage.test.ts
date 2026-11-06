import { describe, expect, it, vi } from "vitest";

import { type S3Config, s3PrivateStorage, s3PublicStorage } from "./storage";

const PHOTO_KEY = "listings/0b6a3c2e-6f1d-4c8e-9d9a-1f2e3d4c5b6a-480.webp";

/** A pretend bucket: remembers what was uploaded and answers like S3/R2. */
function fakeBucket() {
  const objects = new Map<string, Uint8Array>();
  const requests: Request[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
    const request = input as Request;
    requests.push(request);
    const path = new URL(request.url).pathname;
    switch (request.method) {
      case "PUT":
        objects.set(path, new Uint8Array(await request.arrayBuffer()));
        return new Response(null, { status: 200 });
      case "GET": {
        const bytes = objects.get(path);
        return bytes
          ? new Response(Buffer.from(bytes))
          : new Response("NoSuchKey", { status: 404 });
      }
      case "DELETE":
        objects.delete(path);
        return new Response(null, { status: 204 });
      default:
        return new Response(null, { status: 405 });
    }
  });
  const config: S3Config = {
    endpoint: "https://account.r2.cloudflarestorage.com/",
    bucket: "digifarm",
    accessKeyId: "key-id",
    secretAccessKey: "secret",
    region: "auto",
    fetch,
  };
  return { config, objects, requests, fetch };
}

describe("S3-compatible storage", () => {
  it("keeps private files under private/, signed, and reads them back", async () => {
    const bucket = fakeBucket();
    const storage = s3PrivateStorage(bucket.config);

    const key = await storage.put(
      "delivery-proofs",
      new Uint8Array([1, 2, 3]),
      "jpg",
    );

    expect(key).toMatch(/^delivery-proofs\/[0-9a-f-]{36}\.jpg$/);
    const upload = bucket.requests[0]!;
    expect(upload.url).toBe(
      `https://account.r2.cloudflarestorage.com/digifarm/private/${key}`,
    );
    expect(upload.headers.get("content-type")).toBe("image/jpeg");
    expect(upload.headers.get("authorization")).toMatch(
      /^AWS4-HMAC-SHA256 Credential=key-id\/\d{8}\/auto\/s3\/aws4_request/,
    );
    expect(await storage.get(key)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("removes files, and removing one that's gone is fine", async () => {
    const bucket = fakeBucket();
    const storage = s3PrivateStorage(bucket.config);
    const key = await storage.put("farm-visits", new Uint8Array([9]), "png");

    await storage.remove(key);
    await expect(storage.get(key)).rejects.toThrow(/read failed \(404\)/);

    bucket.fetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(storage.remove(key)).resolves.toBeUndefined();
  });

  it("keeps public photos under public/", async () => {
    const bucket = fakeBucket();
    const storage = s3PublicStorage(bucket.config);

    await storage.put(PHOTO_KEY, new Uint8Array([7]));

    expect(bucket.requests[0]!.url).toBe(
      `https://account.r2.cloudflarestorage.com/digifarm/public/${PHOTO_KEY}`,
    );
    expect(bucket.requests[0]!.headers.get("content-type")).toBe("image/webp");
    expect(await storage.get(PHOTO_KEY)).toEqual(new Uint8Array([7]));
  });

  it("refuses unsafe keys before touching the bucket", async () => {
    const bucket = fakeBucket();

    await expect(
      s3PrivateStorage(bucket.config).get("../secrets/0b6a3c2e.jpg"),
    ).rejects.toThrow("Invalid storage key");
    await expect(
      s3PublicStorage(bucket.config).get("private/anything.webp"),
    ).rejects.toThrow("Invalid storage key");
    expect(bucket.fetch).not.toHaveBeenCalled();
  });

  it("reports a failed upload", async () => {
    const bucket = fakeBucket();
    bucket.fetch.mockResolvedValueOnce(new Response(null, { status: 403 }));

    await expect(
      s3PublicStorage(bucket.config).put(PHOTO_KEY, new Uint8Array([1])),
    ).rejects.toThrow("Storage upload failed (403)");
  });
});
