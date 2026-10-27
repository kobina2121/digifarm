import { describe, expect, it } from "vitest";

import { parseEnv } from "./env";

const valid = {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  EMAIL_FROM: "DigiFarm <no-reply@digifarm.local>",
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
});
