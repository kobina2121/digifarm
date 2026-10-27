"use server";

import { refresh } from "next/cache";

import { type ActionResult, runAction } from "@/lib/action-result";
import { ValidationError } from "@/lib/errors";
import { MAX_PHOTOS_PER_VISIT } from "@/lib/images";
import { actorForAction } from "@/lib/session";
import {
  createManagedSupplier,
  type CreateSupplierInput,
  decideVerification,
  type PhotoUpload,
  recordFarmVisit,
  type VerificationDecisionInput,
} from "@/modules/suppliers";

export async function createSupplier(
  input: CreateSupplierInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const org = await createManagedSupplier(await actorForAction(), input);
    refresh();
    return { id: org.id };
  });
}

/** Multipart form: visit fields plus up to six `photos`. */
export async function recordVisit(
  supplierId: string,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actorForAction();
    const files = form
      .getAll("photos")
      .filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > MAX_PHOTOS_PER_VISIT) {
      throw new ValidationError(
        `Attach at most ${MAX_PHOTOS_PER_VISIT} photos.`,
      );
    }
    const photos: PhotoUpload[] = await Promise.all(
      files.map(async (f) => ({
        bytes: new Uint8Array(await f.arrayBuffer()),
        size: f.size,
      })),
    );
    const field = (name: string) => {
      const v = form.get(name);
      return typeof v === "string" ? v : undefined;
    };
    await recordFarmVisit(
      actor,
      supplierId,
      {
        visitedOn: field("visitedOn") ?? "",
        produceObserved: field("produceObserved") ?? "",
        recommendedGrade: (field("recommendedGrade") ?? "") as
          "A" | "B" | "C" | "",
        notes: field("notes"),
        latitude: field("latitude"),
        longitude: field("longitude"),
      },
      photos,
    );
    refresh();
    return undefined;
  });
}

export async function decide(
  supplierId: string,
  input: VerificationDecisionInput,
): Promise<ActionResult> {
  return runAction(async () => {
    await decideVerification(await actorForAction(), supplierId, input);
    refresh();
    return undefined;
  });
}
