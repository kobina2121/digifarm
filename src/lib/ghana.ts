import { z } from "zod";

import type { GhanaRegion } from "@/generated/prisma/enums";

export const GHANA_REGIONS: Record<GhanaRegion, string> = {
  AHAFO: "Ahafo",
  ASHANTI: "Ashanti",
  BONO: "Bono",
  BONO_EAST: "Bono East",
  CENTRAL: "Central",
  EASTERN: "Eastern",
  GREATER_ACCRA: "Greater Accra",
  NORTH_EAST: "North East",
  NORTHERN: "Northern",
  OTI: "Oti",
  SAVANNAH: "Savannah",
  UPPER_EAST: "Upper East",
  UPPER_WEST: "Upper West",
  VOLTA: "Volta",
  WESTERN: "Western",
  WESTERN_NORTH: "Western North",
};

export const ghanaRegionSchema = z.enum(
  Object.keys(GHANA_REGIONS) as [GhanaRegion, ...GhanaRegion[]],
);

/**
 * Ghana phone numbers: accepts 0XXXXXXXXX, 233XXXXXXXXX or +233XXXXXXXXX (spaces and
 * dashes allowed) and normalises to E.164 (+233XXXXXXXXX).
 */
export const ghanaPhoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine(
    (v) => /^(\+?233|0)[235]\d{8}$/.test(v),
    "Enter a Ghana phone number, e.g. 024 123 4567",
  )
  .transform((v) => `+233${v.replace(/^(\+?233|0)/, "")}`);

/** GhanaPost GPS digital address, e.g. GA-123-4567 (normalised to upper case). */
export const digitalAddressSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z]{2}-\d{3,4}-\d{4}$/,
    "Use the GhanaPost GPS format, e.g. GA-123-4567",
  );

export function formatGhanaPhone(e164: string): string {
  const local = `0${e164.replace(/^\+233/, "")}`;
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}
