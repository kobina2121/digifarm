import "dotenv/config";

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Migrations use Neon's direct (non-pooled) connection.
  datasource: {
    url: env("DIRECT_DATABASE_URL"),
  },
});
