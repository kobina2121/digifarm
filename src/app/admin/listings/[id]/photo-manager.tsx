"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { FormError } from "@/components/forms/form-field";
import { PhotoPicker, photosForm } from "@/components/forms/photo-picker";
import { Button } from "@/components/ui/button";

import { removeListingPhotoAction, uploadListingPhotos } from "../actions";

const MAX_PHOTOS = 6;

export function PhotoManager({
  listingId,
  photos,
  canAdd,
}: {
  listingId: string;
  photos: { id: string; src: string }[];
  canAdd: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<File[]>([]);
  const room = MAX_PHOTOS - photos.length;

  function upload() {
    setError(null);
    startTransition(async () => {
      const result = await uploadListingPhotos(
        listingId,
        await photosForm(chosen),
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setChosen([]);
    });
  }

  function remove(imageId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeListingPhotoAction(listingId, imageId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="grid gap-3">
      <FormError message={error} />
      {photos.length ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {photos.map((photo, i) => (
            <li key={photo.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.src}
                alt={`Photo ${i + 1}`}
                className="aspect-square w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => remove(photo.id)}
                disabled={pending}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-ink/80 text-white"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {canAdd && room > 0 ? (
        <div className="grid gap-3">
          <PhotoPicker
            files={chosen}
            onChange={setChosen}
            onError={setError}
            room={room}
            disabled={pending}
          />
          {chosen.length ? (
            <Button
              type="button"
              onClick={upload}
              disabled={pending}
              className="justify-self-start"
            >
              {pending
                ? "Uploading…"
                : `Upload ${chosen.length} photo${chosen.length === 1 ? "" : "s"}`}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
