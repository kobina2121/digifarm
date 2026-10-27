import "dotenv/config";

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Migrations use Neon's direct (non-pooled) connection. `prisma generate`
  // needs no database, so a missing URL must not fail installs or builds.
  datasource: {
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL,
  },
});
