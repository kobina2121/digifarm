import "server-only";

import sharp from "sharp";

import { ValidationError } from "./errors";
import { sniffImageType } from "./images";

export const LISTING_IMAGE_SIZES = [480, 1200] as const;

export type ProcessedImage = {
  width: number;
  height: number;
  variants: Record<(typeof LISTING_IMAGE_SIZES)[number], Uint8Array>;
};

/**
 * Turns an uploaded product photo into small WebP files for slow connections.
 * Applies the camera's rotation, then drops all metadata — including the GPS
 * location phones embed in photos, which would reveal where a farm is.
 */
export async function processListingPhoto(
  bytes: Uint8Array,
): Promise<ProcessedImage> {
  if (!sniffImageType(bytes)) {
    throw new ValidationError("Photos must be JPEG, PNG or WebP images.");
  }
  let base: ReturnType<typeof sharp>;
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    base = sharp(bytes, {
      failOn: "error",
      limitInputPixels: 50_000_000,
    }).rotate();
    meta = await base.metadata();
  } catch {
    throw new ValidationError("That photo couldn’t be read. Try another one.");
  }
  const variants = {} as ProcessedImage["variants"];
  let width = 0;
  let height = 0;
  for (const size of LISTING_IMAGE_SIZES) {
    const { data, info } = await base
      .clone()
      .resize({
        width: size,
        height: size,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 78 })
      .toBuffer({ resolveWithObject: true });
    variants[size] = new Uint8Array(data);
    if (size === 1200) {
      width = info.width;
      height = info.height;
    }
  }
  if (!meta.width || !meta.height)
    throw new ValidationError("That photo couldn’t be read.");
  return { width, height, variants };
}
