import { z } from "zod";

import type { GhanaRegion } from "@/generated/prisma/enums";
import {
  digitalAddressSchema,
  GHANA_REGIONS,
  ghanaPhoneSchema,
} from "@/lib/ghana";

export const BUYER_SEGMENTS = {
  RESTAURANT: "Restaurant",
  HOTEL: "Hotel",
  CATERER: "Caterer",
  RETAILER: "Retailer / shop",
  WHOLESALER: "Wholesaler",
  FOOD_PROCESSOR: "Food processor",
  OTHER: "Other",
} as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

export const deliveryAddressSchema = z.object({
  label: z
    .string()
    .trim()
    .min(2, "Give this address a name, e.g. Main kitchen")
    .max(60),
  // DigiFarm delivers anywhere in Ghana (D4 revised).
  region: z.enum(
    Object.keys(GHANA_REGIONS) as [GhanaRegion, ...GhanaRegion[]],
    { error: "Choose the region" },
  ),
  town: z.string().trim().min(2, "Enter the town or area").max(80),
  district: optionalText(80),
  street: optionalText(120),
  landmark: optionalText(160),
  digitalAddress: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(digitalAddressSchema.optional())
    .optional(),
});

export const BUYER_KINDS = {
  INDIVIDUAL: "For myself",
  BUSINESS: "For a business",
} as const;

/** Business details: required for businesses, never asked of individuals. */
export const businessDetailsSchema = z.object({
  legalName: z.string().trim().min(2, "Enter your business name").max(120),
  tradingName: optionalText(120),
  buyerSegment: z.enum(
    Object.keys(BUYER_SEGMENTS) as [keyof typeof BUYER_SEGMENTS],
    { error: "Choose the type of business" },
  ),
});

/**
 * First-time setup. Everyone gives a phone number and a delivery address;
 * only businesses also give a business name and type (D18).
 */
export const buyerOnboardingSchema = z
  .object({
    accountType: z
      .enum(Object.keys(BUYER_KINDS) as [keyof typeof BUYER_KINDS])
      .default("INDIVIDUAL"),
    legalName: optionalText(120),
    tradingName: optionalText(120),
    buyerSegment: z
      .enum(Object.keys(BUYER_SEGMENTS) as [keyof typeof BUYER_SEGMENTS])
      .optional()
      .catch(undefined),
    phone: ghanaPhoneSchema,
    address: deliveryAddressSchema,
  })
  .superRefine((v, ctx) => {
    if (v.accountType !== "BUSINESS") return;
    if (!v.legalName || v.legalName.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["legalName"],
        message: "Enter your business name",
      });
    }
    if (!v.buyerSegment) {
      ctx.addIssue({
        code: "custom",
        path: ["buyerSegment"],
        message: "Choose the type of business",
      });
    }
  });

export type BusinessDetailsInput = z.input<typeof businessDetailsSchema>;
export type BuyerOnboardingInput = z.input<typeof buyerOnboardingSchema>;
export type DeliveryAddressInput = z.input<typeof deliveryAddressSchema>;
