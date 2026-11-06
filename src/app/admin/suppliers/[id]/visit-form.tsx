"use client";

import { Camera, LocateFixed } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { FormError, FormField } from "@/components/forms/form-field";
import { NativeSelect } from "@/components/forms/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MAX_ORIGINAL_PHOTO_BYTES, shrinkFormPhotos } from "@/lib/shrink-photo";
import { GRADES } from "@/modules/suppliers/schemas";

import { recordVisit } from "../actions";

const MAX_PHOTOS = 6;

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function VisitForm({ supplierId }: { supplierId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [photoCount, setPhotoCount] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [locating, setLocating] = useState(false);
  const [saved, setSaved] = useState(false);

  function locate() {
    if (!("geolocation" in navigator)) {
      setError("This device can't share its location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError(
          "Couldn't get your location. Check location permission and try again.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  function onPhotos(files: FileList | null) {
    const list = Array.from(files ?? []);
    setPhotoCount(list.length);
    if (list.length > MAX_PHOTOS)
      setError(`Choose at most ${MAX_PHOTOS} photos.`);
    else if (list.some((f) => f.size > MAX_ORIGINAL_PHOTO_BYTES))
      setError("Each photo must be 25 MB or smaller.");
    else setError(null);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setFieldErrors({});
    setSaved(false);
    startTransition(async () => {
      await shrinkFormPhotos(form, "photos");
      const result = await recordVisit(supplierId, form);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      formRef.current?.reset();
      setPhotoCount(0);
      setCoords(null);
      setSaved(true);
    });
  }

  return (
    <form
      method="post"
      ref={formRef}
      onSubmit={onSubmit}
      className="grid gap-4"
    >
      <FormError message={error} />
      {saved ? (
        <p
          role="status"
          className="rounded-lg bg-sprout-soft px-3 py-2.5 text-sm text-soil"
        >
          Visit recorded.
        </p>
      ) : null}
      <FormField
        id="visitedOn"
        label="Date of visit"
        error={fieldErrors.visitedOn}
      >
        <Input
          id="visitedOn"
          name="visitedOn"
          type="date"
          defaultValue={today()}
          max={today()}
          required
        />
      </FormField>
      <FormField
        id="produceObserved"
        label="What did you see?"
        hint="Crops, acreage, stored produce, condition."
        error={fieldErrors.produceObserved}
      >
        <Textarea
          id="produceObserved"
          name="produceObserved"
          rows={3}
          required
          className="bg-card text-base md:text-sm"
        />
      </FormField>
      <FormField id="recommendedGrade" label="Suggested grade (optional)">
        <NativeSelect
          id="recommendedGrade"
          name="recommendedGrade"
          defaultValue=""
        >
          <option value="">Not sure yet</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="notes" label="Other notes (optional)">
        <Textarea
          id="notes"
          name="notes"
          rows={2}
          className="bg-card text-base md:text-sm"
        />
      </FormField>

      <div className="grid gap-2">
        <span className="text-sm font-medium">Photos (up to {MAX_PHOTOS})</span>
        <label className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-card px-4 text-sm font-medium text-field-green hover:border-field-green">
          <Camera className="size-5" aria-hidden />
          {photoCount
            ? `${photoCount} photo${photoCount === 1 ? "" : "s"} selected`
            : "Take or choose photos"}
          <input
            type="file"
            name="photos"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => onPhotos(e.target.files)}
          />
        </label>
      </div>

      <div className="grid gap-2">
        <input type="hidden" name="latitude" value={coords?.lat ?? ""} />
        <input type="hidden" name="longitude" value={coords?.lng ?? ""} />
        <Button
          type="button"
          variant="outline"
          onClick={locate}
          disabled={locating}
        >
          <LocateFixed aria-hidden />
          {locating
            ? "Finding location…"
            : coords
              ? "Location saved — update"
              : "Save my current location"}
        </Button>
        {coords ? (
          <p className="font-mono text-xs text-muted-foreground">
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="w-full sm:w-auto"
      >
        {pending ? "Uploading…" : "Record visit"}
      </Button>
    </form>
  );
}
