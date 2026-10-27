import { z } from "zod";

import { digitalAddressSchema, ghanaPhoneSchema } from "@/lib/ghana";

export const BUYER_SEGMENTS = {
  RESTAURANT: "Restaurant",
  HOTEL: "Hotel",
  CATERER: "Caterer",
  RETAILER: "Retailer / shop",
  WHOLESALER: "Wholesaler",
  FOOD_PROCESSOR: "Food processor",
  OTHER: "Other",
} as const;

export const SERVICED_ZONES = {
  ACCRA: "Greater Accra",
  KUMASI: "Kumasi",
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
  zoneCode: z.enum(Object.keys(SERVICED_ZONES) as ["ACCRA", "KUMASI"], {
    error: "Choose Greater Accra or Kumasi",
  }),
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

export const buyerOnboardingSchema = z.object({
  legalName: z.string().trim().min(2, "Enter your business name").max(120),
  tradingName: optionalText(120),
  buyerSegment: z.enum(
    Object.keys(BUYER_SEGMENTS) as [keyof typeof BUYER_SEGMENTS],
    {
      error: "Choose the type of business",
    },
  ),
  phone: ghanaPhoneSchema,
  address: deliveryAddressSchema,
});

export type BuyerOnboardingInput = z.input<typeof buyerOnboardingSchema>;
export type DeliveryAddressInput = z.input<typeof deliveryAddressSchema>;
