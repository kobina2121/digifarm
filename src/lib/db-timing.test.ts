import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";

import { PrismaClient } from "@/generated/prisma/client";
import { hasTestDatabase } from "@/test/setup";

import { createTimedClient, type SlowWarning } from "./db-timing";

const connectionString = process.env.TEST_DATABASE_URL;
const NEVER_SLOW = 60_000;

function newWarn() {
  return vi.fn<SlowWarning>();
}

function messages(warn: ReturnType<typeof newWarn>) {
  return warn.mock.calls.map(([, message]) => message);
}

async function withPool(
  options: { slowMs: number; warn: SlowWarning },
  run: (pool: Pool) => Promise<void>,
) {
  const pool = new Pool({
    connectionString,
    Client: createTimedClient(options),
  });
  try {
    await run(pool);
  } finally {
    await pool.end();
  }
}

describe.runIf(hasTestDatabase)("slow database logging (integration)", () => {
  it("logs a slow pool query, keeps its result and logs the SQL but not values", async () => {
    const warn = newWarn();
    await withPool({ slowMs: 50, warn }, async (pool) => {
      const { rows } = await pool.query("select $1::text as v, pg_sleep(0.2)", [
        "customer-secret",
      ]);
      expect(rows[0].v).toBe("customer-secret");
    });
    expect(messages(warn)).toContain("Database query still waiting");
    expect(messages(warn)).toContain("Slow database query");
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).toContain("pg_sleep");
    expect(logged).not.toContain("customer-secret");
  });

  it("logs a slow query made through a promise, as transactions do", async () => {
    const warn = newWarn();
    await withPool({ slowMs: 50, warn }, async (pool) => {
      const client = await pool.connect();
      await client.query("select pg_sleep(0.2)");
      client.release();
    });
    expect(messages(warn)).toContain("Slow database query");
  });

  it("logs a slow connection", async () => {
    const warn = newWarn();
    await withPool({ slowMs: 1, warn }, async (pool) => {
      await pool.query("select 1");
    });
    expect(messages(warn)).toContain("Slow database connection");
  });

  it("stays quiet when everything is quick", async () => {
    const warn = newWarn();
    await withPool({ slowMs: NEVER_SLOW, warn }, async (pool) => {
      await pool.query("select 1");
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("still reports a failed query to the caller, and logs it as failed", async () => {
    const warn = newWarn();
    await withPool({ slowMs: 20, warn }, async (pool) => {
      // Waits before failing, so it's slow even on a fast local database
      // (an unknown table fails in under a millisecond there).
      await expect(
        pool.query(
          "DO $$ BEGIN PERFORM pg_sleep(0.05); RAISE EXCEPTION 'planned failure'; END $$",
        ),
      ).rejects.toThrow(/planned failure/);
    });
    const failed = warn.mock.calls.find(
      ([, message]) => message === "Slow database query",
    );
    expect(failed?.[0]).toMatchObject({ failed: true });
  });

  it("logs slow queries from Prisma, both alone and in a transaction", async () => {
    const warn = newWarn();
    const prisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString,
        Client: createTimedClient({ slowMs: 50, warn }),
      }),
    });
    try {
      await prisma.$queryRaw`select pg_sleep(0.2)::text`;
      const alone = messages(warn).filter((m) => m === "Slow database query");
      expect(alone).toHaveLength(1);

      await prisma.$transaction(
        (tx) => tx.$queryRaw`select pg_sleep(0.2)::text, 'in transaction'`,
      );
      expect(JSON.stringify(warn.mock.calls)).toContain("in transaction");
    } finally {
      await prisma.$disconnect();
    }
  });
});
