// Reference data only — no demo users, suppliers, listings or prices.
// Idempotent: safe to run repeatedly with `pnpm db:seed`. Grade wording that
// admins have edited is never overwritten.
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

const UNITS = [
  {
    code: "KG",
    name: "kilogram",
    plural: "kilograms",
    kind: "MASS",
    factorToBase: "1",
  },
  {
    code: "TONNE",
    name: "tonne",
    plural: "tonnes",
    kind: "MASS",
    factorToBase: "1000",
  },
  { code: "BAG", name: "bag", plural: "bags", kind: "CONTAINER" },
  { code: "CRATE", name: "crate", plural: "crates", kind: "CONTAINER" },
  { code: "BASKET", name: "basket", plural: "baskets", kind: "CONTAINER" },
  { code: "BUNCH", name: "bunch", plural: "bunches", kind: "BUNDLE" },
  { code: "PIECE", name: "piece", plural: "pieces", kind: "COUNT" },
  { code: "TUBER", name: "tuber", plural: "tubers", kind: "COUNT" },
] as const;

const CATEGORIES: {
  slug: string;
  name: string;
  products: [name: string, variety?: string][];
}[] = [
  {
    slug: "vegetables",
    name: "Vegetables",
    products: [
      ["Tomato", "Pectomech"],
      ["Tomato", "Power"],
      ["Onion", "Red"],
      ["Pepper", "Kpakpo shito"],
      ["Pepper", "Scotch bonnet"],
      ["Garden egg"],
      ["Okra"],
      ["Cabbage"],
      ["Carrot"],
      ["Lettuce"],
    ],
  },
  {
    slug: "fruits",
    name: "Fruits",
    products: [
      ["Pineapple", "MD2"],
      ["Pineapple", "Sugarloaf"],
      ["Mango", "Keitt"],
      ["Orange"],
      ["Watermelon"],
      ["Pawpaw"],
      ["Banana"],
    ],
  },
  {
    slug: "grains",
    name: "Grains & cereals",
    products: [
      ["Maize", "White"],
      ["Maize", "Yellow"],
      ["Rice", "Local milled"],
      ["Millet"],
      ["Sorghum"],
    ],
  },
  {
    slug: "legumes",
    name: "Legumes",
    products: [["Cowpea (beans)"], ["Groundnut"], ["Soybean"]],
  },
  {
    slug: "roots-tubers",
    name: "Roots & tubers",
    products: [
      ["Yam", "Puna"],
      ["Cassava"],
      ["Cocoyam"],
      ["Sweet potato"],
      ["Plantain", "Apentu"],
    ],
  },
  {
    slug: "spices-herbs",
    name: "Spices & herbs",
    products: [["Ginger"], ["Garlic"]],
  },
];

// Starting wording for DigiFarm's A/B/C grades (ROADMAP D8). Admins refine it per category.
const GRADES = [
  {
    code: "A",
    title: "Premium",
    description:
      "Uniform size and colour, firm and fresh, no visible damage or pests.",
  },
  {
    code: "B",
    title: "Standard",
    description:
      "Minor blemishes or some size variation; fully usable for kitchens and retail.",
  },
  {
    code: "C",
    title: "Processing",
    description:
      "Visible blemishes or mixed sizes; best for processing or same-day use.",
  },
];

function slugify(...parts: (string | undefined)[]) {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  for (const zone of ZONES) {
    await db.operatingZone.upsert({
      where: { code: zone.code },
      update: { name: zone.name, region: zone.region },
      create: zone,
    });
  }

  for (const [i, unit] of UNITS.entries()) {
    const data = {
      ...unit,
      sortOrder: i,
      factorToBase: "factorToBase" in unit ? unit.factorToBase : null,
    };
    await db.unitOfMeasure.upsert({
      where: { code: unit.code },
      update: data,
      create: data,
    });
  }

  let productCount = 0;
  for (const [i, c] of CATEGORIES.entries()) {
    const category = await db.productCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: i },
      create: { slug: c.slug, name: c.name, sortOrder: i },
    });
    for (const grade of GRADES) {
      await db.gradeDefinition.upsert({
        where: {
          categoryId_code: { categoryId: category.id, code: grade.code },
        },
        update: {},
        create: { categoryId: category.id, ...grade },
      });
    }
    for (const [name, variety] of c.products) {
      const slug = slugify(name, variety);
      await db.product.upsert({
        where: { slug },
        update: { name, variety: variety ?? null, categoryId: category.id },
        create: { slug, name, variety, categoryId: category.id },
      });
      productCount++;
    }
  }

  console.log(
    `Seeded ${ZONES.length} zones, ${UNITS.length} units, ${CATEGORIES.length} categories with A/B/C grades, ${productCount} products.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
