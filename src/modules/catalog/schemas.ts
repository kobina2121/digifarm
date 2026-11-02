import { z } from "zod";

import { ghanaRegionSchema } from "@/lib/ghana";

export const GRADE_CODES = ["A", "B", "C"] as const;
export const LISTING_SORTS = {
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
} as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

/** Cedis with up to two decimals, e.g. "12" or "12.50". */
export const priceSchema = z
  .string()
  .trim()
  .regex(/^\d{1,9}(\.\d{1,2})?$/, "Enter a price in cedis, e.g. 12.50")
  .refine((v) => Number(v) > 0, "Price must be more than zero");

/** Up to three decimals, e.g. "2.5" tonnes. */
const quantity = (label: string, { allowZero = false } = {}) =>
  z
    .string()
    .trim()
    .regex(
      /^\d{1,11}(\.\d{1,3})?$/,
      `Enter ${label} as a number, e.g. 25 or 2.5`,
    )
    .refine(
      (v) => allowZero || Number(v) > 0,
      `${label[0].toUpperCase()}${label.slice(1)} must be more than zero`,
    );

const optionalQuantity = (label: string) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(quantity(label).optional())
    .optional();

const date = z.iso.date("Enter a date");
const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .pipe(date.optional())
  .optional();

const gradeCode = z
  .enum(GRADE_CODES)
  .or(z.literal("").transform(() => undefined))
  .optional();

const listingDetails = {
  gradeCode,
  price: priceSchema,
  // Minimum orders are off for now: any quantity from 1 can be ordered.
  minOrderQty: quantity("the minimum order").optional().default("1"),
  netWeightPerUnitKg: optionalQuantity("the weight per unit"),
  harvestDate: optionalDate,
  availableFrom: date,
  availableUntil: optionalDate,
  description: optionalText(1000),
};

const datesInOrder = (v: { availableFrom: string; availableUntil?: string }) =>
  !v.availableUntil || v.availableUntil >= v.availableFrom;

export const createListingSchema = z
  .object({
    supplierId: z.uuid("Choose a supplier"),
    productId: z.uuid("Choose a product"),
    unitCode: z.string().trim().min(1, "Choose a unit"),
    ...listingDetails,
    // Stock the farmer confirmed on the phone just now.
    initialStock: quantity("the stock", { allowZero: true }),
    publish: z.boolean().default(true),
  })
  .refine(datesInOrder, {
    path: ["availableUntil"],
    message: "Must be on or after the start date",
  });

export const updateListingSchema = z
  .object(listingDetails)
  .refine(datesInOrder, {
    path: ["availableUntil"],
    message: "Must be on or after the start date",
  });

export const confirmStockSchema = z.object({
  onHand: quantity("the stock", { allowZero: true }),
  note: optionalText(300),
});

export const LISTING_ACTIONS = [
  "PUBLISH",
  "PAUSE",
  "RESUME",
  "ARCHIVE",
] as const;

export const listingStatusChangeSchema = z
  .object({ action: z.enum(LISTING_ACTIONS), reason: optionalText(300) })
  .refine(
    (v) => v.action === "PUBLISH" || v.action === "RESUME" || !!v.reason,
    {
      path: ["reason"],
      message: "Give a reason so the team knows why",
    },
  );

export const gradeUpdateSchema = z.object({
  title: z.string().trim().min(2, "Give the grade a short name").max(40),
  description: z
    .string()
    .trim()
    .min(10, "Describe what this grade looks like")
    .max(400),
});

export const browseSchema = z.object({
  q: optionalText(80),
  category: optionalText(40),
  /** Where the farm is (DigiFarm delivers anywhere in Ghana). */
  region: ghanaRegionSchema.optional().catch(undefined),
  grade: z.enum(GRADE_CODES).optional().catch(undefined),
  minPrice: priceSchema.optional().catch(undefined),
  maxPrice: priceSchema.optional().catch(undefined),
  inStock: z
    .enum(["1"])
    .optional()
    .catch(undefined)
    .transform((v) => v === "1"),
  sort: z
    .enum(Object.keys(LISTING_SORTS) as [keyof typeof LISTING_SORTS])
    .catch("newest"),
  cursor: z.uuid().optional().catch(undefined),
});

export type CreateListingInput = z.input<typeof createListingSchema>;
export type UpdateListingInput = z.input<typeof updateListingSchema>;
export type ConfirmStockInput = z.input<typeof confirmStockSchema>;
export type ListingStatusChangeInput = z.input<
  typeof listingStatusChangeSchema
>;
export type GradeUpdateInput = z.input<typeof gradeUpdateSchema>;
export type BrowseFilters = z.output<typeof browseSchema>;
