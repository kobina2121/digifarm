"use server";

import { refresh } from "next/cache";

import { type ActionResult, runAction } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import { actorForAction } from "@/lib/session";
import {
  addListingPhotos,
  changeListingStatus,
  confirmStock,
  type ConfirmStockInput,
  createListing,
  type CreateListingInput,
  type ListingStatusChangeInput,
  MAX_PHOTOS_PER_LISTING,
  type PhotoUpload,
  removeListingPhoto,
  updateGrade,
  type GradeUpdateInput,
  updateListing,
  type UpdateListingInput,
} from "@/modules/catalog";

export async function createListingAction(
  input: CreateListingInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const listing = await createListing(await actorForAction(), input);
    refresh();
    return { id: listing.id };
  });
}

export async function updateListingAction(
  listingId: string,
  input: UpdateListingInput,
): Promise<ActionResult> {
  return runAction(async () => {
    await updateListing(await actorForAction(), listingId, input);
    refresh();
    return undefined;
  });
}

export async function confirmStockAction(
  listingId: string,
  input: ConfirmStockInput,
): Promise<ActionResult> {
  return runAction(async () => {
    await confirmStock(await actorForAction(), listingId, input);
    refresh();
    return undefined;
  });
}

export async function changeListingStatusAction(
  listingId: string,
  input: ListingStatusChangeInput,
): Promise<ActionResult> {
  return runAction(async () => {
    await changeListingStatus(await actorForAction(), listingId, input);
    refresh();
    return undefined;
  });
}

/** Multipart form with up to six `photos`. */
export async function uploadListingPhotos(
  listingId: string,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actorForAction();
    const files = form
      .getAll("photos")
      .filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > MAX_PHOTOS_PER_LISTING) {
      throw new ValidationError(
        `Choose at most ${MAX_PHOTOS_PER_LISTING} photos.`,
      );
    }
    const photos: PhotoUpload[] = await Promise.all(
      files.map(async (f) => ({
        bytes: new Uint8Array(await f.arrayBuffer()),
        size: f.size,
      })),
    );
    await addListingPhotos(actor, listingId, photos);
    refresh();
    return undefined;
  });
}

export async function removeListingPhotoAction(
  listingId: string,
  imageId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    await removeListingPhoto(await actorForAction(), listingId, imageId);
    refresh();
    return undefined;
  });
}

export async function updateGradeAction(
  gradeId: string,
  input: GradeUpdateInput,
): Promise<ActionResult> {
  return runAction(async () => {
    await updateGrade(await actorForAction(), gradeId, input);
    refresh();
    return undefined;
  });
}
