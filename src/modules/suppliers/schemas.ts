import { z } from "zod";

import {
  digitalAddressSchema,
  ghanaPhoneSchema,
  ghanaRegionSchema,
} from "@/lib/ghana";

export const SUPPLIER_KINDS = {
  FARMER: "Farmer",
  COOPERATIVE: "Cooperative",
  AGGREGATOR: "Aggregator",
  VENDOR: "Approved vendor",
} as const;

export const VERIFICATION_LABELS = {
  PROSPECT: "Not yet visited",
  VISITED: "Awaiting decision",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
} as const;

export const GRADES = ["A", "B", "C"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

export const createSupplierSchema = z.object({
  legalName: z
    .string()
    .trim()
    .min(2, "Enter the farm or business name")
    .max(120),
  tradingName: optionalText(120),
  supplierKind: z.enum(
    Object.keys(SUPPLIER_KINDS) as [keyof typeof SUPPLIER_KINDS],
    {
      error: "Choose the type of supplier",
    },
  ),
  phone: ghanaPhoneSchema,
  region: ghanaRegionSchema,
  district: optionalText(80),
  town: z.string().trim().min(2, "Enter the town or village").max(80),
  landmark: optionalText(160),
  digitalAddress: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(digitalAddressSchema.optional())
    .optional(),
});

const coordinate = (min: number, max: number) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => (v === "" ? undefined : Number(v)))
    .pipe(z.number().min(min).max(max).optional())
    .optional();

export const farmVisitSchema = z.object({
  visitedOn: z.iso.date("Enter the visit date"),
  produceObserved: z
    .string()
    .trim()
    .min(3, "Describe what you saw growing or stored")
    .max(1000),
  recommendedGrade: z
    .enum(GRADES)
    .or(z.literal("").transform(() => undefined))
    .optional(),
  notes: optionalText(2000),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
});

export const DECISIONS = ["APPROVE", "REJECT", "SUSPEND", "REINSTATE"] as const;

export const verificationDecisionSchema = z
  .object({
    decision: z.enum(DECISIONS),
    notes: optionalText(1000),
  })
  .refine(
    (v) => v.decision === "APPROVE" || v.decision === "REINSTATE" || !!v.notes,
    {
      path: ["notes"],
      message: "Give a reason so the team knows why",
    },
  );

export type CreateSupplierInput = z.input<typeof createSupplierSchema>;
export type FarmVisitInput = z.input<typeof farmVisitSchema>;
export type VerificationDecisionInput = z.input<
  typeof verificationDecisionSchema
>;
