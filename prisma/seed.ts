// Reference data only — no demo users, suppliers or produce.
// Idempotent: safe to run repeatedly with `pnpm db:seed`.
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const ZONES = [
  { code: "ACCRA", name: "Greater Accra", region: "GREATER_ACCRA" },
  { code: "KUMASI", name: "Kumasi", region: "ASHANTI" },
] as const;

async function main() {
  for (const zone of ZONES) {
    await db.operatingZone.upsert({
      where: { code: zone.code },
      update: { name: zone.name, region: zone.region },
      create: zone,
    });
  }
  console.log(`Seeded ${ZONES.length} operating zones.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
