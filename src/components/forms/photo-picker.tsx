"use client";

import { Camera, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { MAX_ORIGINAL_PHOTO_BYTES, shrinkPhotos } from "@/lib/shrink-photo";

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

/**
 * Pick photos a few at a time: each pick adds to the list (up to `room`),
 * with a preview and a remove button for each.
 * Returns problems through `onError` instead of adding bad files.
 */
export function PhotoPicker({
  files,
  onChange,
  onError,
  room,
  disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  onError: (message: string | null) => void;
  room: number;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const previews = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files],
  );
  useEffect(
    () => () => previews.forEach((url) => URL.revokeObjectURL(url)),
    [previews],
  );

  function add(list: FileList | null) {
    const picked = Array.from(list ?? []);
    if (input.current) input.current.value = "";
    const usable = picked.filter(
      (f) => ACCEPT.includes(f.type) && f.size <= MAX_ORIGINAL_PHOTO_BYTES,
    );
    const space = room - files.length;
    const kept = usable.slice(0, Math.max(space, 0));
    onChange([...files, ...kept]);
    if (usable.length < picked.length)
      onError("Photos must be JPEG, PNG or WebP, and 25 MB or smaller.");
    else if (kept.length < usable.length)
      onError(`That’s the limit: ${room} photo${room === 1 ? "" : "s"}.`);
    else onError(null);
  }

  return (
    <div className="grid gap-2">
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {files.map((file, i) => (
          <li
            key={`${file.name}-${file.lastModified}-${i}`}
            className="relative"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previews[i]}
              alt={`New photo ${i + 1}`}
              className="aspect-square w-full rounded-lg object-cover"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              aria-label={`Don’t add photo ${i + 1}`}
              className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-ink/80 text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
        {files.length < room ? (
          <li>
            <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-field-green hover:text-field-green has-disabled:pointer-events-none has-disabled:opacity-50">
              <Camera className="size-5" aria-hidden />
              {files.length ? "Add more" : "Add photos"}
              <input
                ref={input}
                type="file"
                accept={ACCEPT.join(",")}
                multiple
                disabled={disabled}
                className="sr-only"
                onChange={(e) => add(e.target.files)}
              />
            </label>
          </li>
        ) : null}
      </ul>
      <p className="text-xs text-muted-foreground">
        {room - files.length > 0
          ? `You can add ${room - files.length} more. Pick several at once or one at a time.`
          : "That’s as many photos as a listing can have."}
      </p>
    </div>
  );
}

/** Files as the `photos` field of a form, for the upload action, shrunk to fit. */
export async function photosForm(files: File[]): Promise<FormData> {
  const form = new FormData();
  for (const f of await shrinkPhotos(files)) form.append("photos", f);
  return form;
}
