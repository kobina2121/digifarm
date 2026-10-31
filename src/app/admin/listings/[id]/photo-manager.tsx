"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { FormError } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";

import { removeListingPhotoAction, uploadListingPhotos } from "../actions";

const MAX_PHOTOS = 6;
const MAX_BYTES = 8 * 1024 * 1024;

export function PhotoManager({
  listingId,
  photos,
  canAdd,
}: {
  listingId: string;
  photos: { id: string; src: string }[];
  canAdd: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState(0);
  const room = MAX_PHOTOS - photos.length;

  function onChoose(files: FileList | null) {
    const list = Array.from(files ?? []);
    setChosen(list.length);
    if (list.length > room)
      setError(`You can add ${room} more photo${room === 1 ? "" : "s"}.`);
    else if (list.some((f) => f.size > MAX_BYTES))
      setError("Each photo must be 8 MB or smaller.");
    else setError(null);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await uploadListingPhotos(listingId, form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setChosen(0);
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
        <form
          ref={formRef}
          method="post"
          encType="multipart/form-data"
          onSubmit={onSubmit}
          className="flex flex-wrap items-center gap-3"
        >
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-4 font-medium hover:border-field-green">
            <Camera className="size-4 text-field-green" aria-hidden />
            {chosen ? `${chosen} chosen` : "Choose photos"}
            <input
              type="file"
              name="photos"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => onChoose(e.target.files)}
            />
          </label>
          <Button type="submit" disabled={pending || chosen === 0}>
            {pending ? "Uploading…" : "Upload"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
