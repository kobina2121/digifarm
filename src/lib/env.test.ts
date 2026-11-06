import { describe, expect, it } from "vitest";

import { parseEnv } from "./env";

const valid = {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  EMAIL_FROM: "Akuafo <no-reply@digifarm.local>",
};

describe("parseEnv", () => {
  it("accepts a complete configuration and applies defaults", () => {
    const env = parseEnv(valid);
    expect(env.EMAIL_TRANSPORT).toBe("console");
    expect(env.STORAGE_DRIVER).toBe("local");
  });

  it("names every missing or invalid variable", () => {
    expect(() =>
      parseEnv({
        ...valid,
        DATABASE_URL: undefined,
        BETTER_AUTH_SECRET: "short",
      }),
    ).toThrow(
      /DATABASE_URL[\s\S]*BETTER_AUTH_SECRET|BETTER_AUTH_SECRET[\s\S]*DATABASE_URL/,
    );
  });

  it("allows a local production build but refuses dev-only adapters when deployed", () => {
    expect(() => parseEnv({ ...valid, NODE_ENV: "production" })).not.toThrow();
    expect(() => parseEnv({ ...valid, APP_ENV: "staging" })).toThrow(
      /EMAIL_TRANSPORT=console is not allowed/,
    );
    expect(() => parseEnv({ ...valid, APP_ENV: "production" })).toThrow(
      /not allowed when APP_ENV=production/,
    );
  });

  it("takes the site's address from Vercel on the production deployment", () => {
    const stale = {
      ...valid,
      APP_URL: "https://old-name.vercel.app",
      BETTER_AUTH_URL: "https://old-name.vercel.app",
      VERCEL_PROJECT_PRODUCTION_URL: "akuafo.vercel.app",
    };
    const live = parseEnv({ ...stale, VERCEL_ENV: "production" });
    expect(live.APP_URL).toBe("https://akuafo.vercel.app");
    expect(live.BETTER_AUTH_URL).toBe("https://akuafo.vercel.app");
    // Preview deployments and local copies keep their own settings.
    expect(parseEnv({ ...stale, VERCEL_ENV: "preview" }).APP_URL).toBe(
      "https://old-name.vercel.app",
    );
    expect(parseEnv(stale).APP_URL).toBe("https://old-name.vercel.app");
  });

  it("needs every bucket setting to store files online", () => {
    expect(() =>
      parseEnv({ ...valid, STORAGE_DRIVER: "s3", S3_BUCKET: "digifarm" }),
    ).toThrow(
      "STORAGE_DRIVER=s3 needs S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY",
    );
    const env = parseEnv({
      ...valid,
      STORAGE_DRIVER: "s3",
      S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      S3_BUCKET: "digifarm",
      S3_ACCESS_KEY_ID: "id",
      S3_SECRET_ACCESS_KEY: "secret",
    });
    expect(env.S3_REGION).toBe("auto");
  });

  it("needs a connected Blob store or a token to use Vercel Blob", () => {
    expect(() => parseEnv({ ...valid, STORAGE_DRIVER: "vercel-blob" })).toThrow(
      /needs a connected Blob store/,
    );
    expect(() =>
      parseEnv({
        ...valid,
        STORAGE_DRIVER: "vercel-blob",
        BLOB_STORE_ID: "store_123",
      }),
    ).not.toThrow();
    expect(() =>
      parseEnv({
        ...valid,
        STORAGE_DRIVER: "vercel-blob",
        BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_123",
      }),
    ).not.toThrow();
  });

  it("needs a Resend key to send real email", () => {
    expect(() => parseEnv({ ...valid, EMAIL_TRANSPORT: "resend" })).toThrow(
      /needs RESEND_API_KEY/,
    );
    expect(() =>
      parseEnv({
        ...valid,
        EMAIL_TRANSPORT: "resend",
        RESEND_API_KEY: "not-a-resend-key",
      }),
    ).toThrow(/should start with re_/);
    expect(
      parseEnv({ ...valid, EMAIL_TRANSPORT: "resend", RESEND_API_KEY: "re_1" })
        .EMAIL_TRANSPORT,
    ).toBe("resend");
  });

  it("requires both Google credentials or neither", () => {
    expect(() => parseEnv({ ...valid, GOOGLE_CLIENT_ID: "id-only" })).toThrow(
      /both GOOGLE_CLIENT_ID/,
    );
    expect(() =>
      parseEnv({
        ...valid,
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "secret",
      }),
    ).not.toThrow();
    expect(
      parseEnv({ ...valid, GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" })
        .GOOGLE_CLIENT_ID,
    ).toBeUndefined();
  });

  it("lets a deployed site run with payments off", () => {
    expect(
      parseEnv({
        ...valid,
        APP_ENV: "staging",
        EMAIL_TRANSPORT: "resend",
        RESEND_API_KEY: "re_1",
        STORAGE_DRIVER: "vercel-blob",
        BLOB_STORE_ID: "store_1",
        PAYMENT_PROVIDER: "none",
      }).PAYMENT_PROVIDER,
    ).toBe("none");
  });

  it("only accepts Paystack test keys, and keeps the fake provider local", () => {
    expect(parseEnv(valid).PAYMENT_PROVIDER).toBe("fake");
    expect(() => parseEnv({ ...valid, PAYMENT_PROVIDER: "paystack" })).toThrow(
      /needs PAYSTACK_SECRET_KEY/,
    );
    expect(() =>
      parseEnv({
        ...valid,
        PAYMENT_PROVIDER: "paystack",
        PAYSTACK_SECRET_KEY: "sk_live_abc",
      }),
    ).toThrow(/Only Paystack test keys/);
    expect(() =>
      parseEnv({
        ...valid,
        PAYMENT_PROVIDER: "paystack",
        PAYSTACK_SECRET_KEY: "sk_test_abc",
      }),
    ).not.toThrow();
  });
});
