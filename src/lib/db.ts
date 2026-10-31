import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

import { env } from "./env";

// One client per server instance; reused across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: env().DATABASE_URL });
  return new PrismaClient({
    adapter,
    // Prisma's 5 s default is tight for multi-step writes (checkout, payment,
    // cancellation) when the database is far away, as in local development.
    transactionOptions: { maxWait: 10_000, timeout: 15_000 },
  });
}

export const db = globalForPrisma.prisma ?? createClient();

if (env().NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];
