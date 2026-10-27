import { execSync } from "node:child_process";

import { config } from "dotenv";

/**
 * Integration tests run against TEST_DATABASE_URL (a separate Neon branch locally,
 * a throwaway Postgres in CI) — never the development database.
 */
export default function setup() {
  config({ quiet: true });
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.warn(
      "TEST_DATABASE_URL is not set — integration tests will be skipped.",
    );
    return;
  }
  const direct = process.env.TEST_DIRECT_DATABASE_URL ?? url;
  const env = {
    ...process.env,
    DATABASE_URL: url,
    DIRECT_DATABASE_URL: direct,
  };
  execSync("pnpm exec prisma migrate deploy", { env, stdio: "pipe" });
  execSync("pnpm exec tsx prisma/seed.ts", { env, stdio: "pipe" });
}
