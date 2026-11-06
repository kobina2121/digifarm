/**
 * Shrinks phone photos in the browser before they're uploaded. Vercel accepts
 * at most 4.5 MB per request and phone photos are often 3–6 MB each, so the
 * originals would be refused. Each photo is brought under 700 KB, so even six
 * in one upload fit; 1600 px is more than the server keeps (1200 px).
 * Re-encoding also drops the photo's metadata, including its GPS location.
 */
/** Biggest original a phone may pick; it's shrunk before upload, and the server allows 8 MB. */
export const MAX_ORIGINAL_PHOTO_BYTES = 25 * 1024 * 1024;
const TARGET_BYTES = 700 * 1024;
/** Tried in order until one fits TARGET_BYTES; most photos fit the first. */
const ATTEMPTS = [
  { edge: 1600, quality: 0.82 },
  { edge: 1600, quality: 0.7 },
  { edge: 1200, quality: 0.72 },
  { edge: 1200, quality: 0.6 },
];

function encode(img: HTMLImageElement, edge: number, quality: number) {
  const scale = Math.min(
    1,
    edge / Math.max(img.naturalWidth, img.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  // JPEG has no transparency: give see-through PNGs a white background.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
}

export async function shrinkPhoto(file: File): Promise<File> {
  if (file.size <= TARGET_BYTES) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode(); // browsers apply the camera's rotation here
    let blob: Blob | null = null;
    for (const { edge, quality } of ATTEMPTS) {
      blob = await encode(img, edge, quality);
      if (!blob || blob.size <= TARGET_BYTES) break;
    }
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]*$/, "")}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    // Can't decode it here: send the original and let the server decide.
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** One at a time, so a low-end phone isn't holding six full-size photos at once. */
export async function shrinkPhotos(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const file of files) out.push(await shrinkPhoto(file));
  return out;
}

/** Replaces the photos in a form's `field` with shrunk copies. */
export async function shrinkFormPhotos(
  form: FormData,
  field: string,
): Promise<void> {
  const files = form
    .getAll(field)
    .filter((v): v is File => v instanceof File && v.size > 0);
  if (!files.length) return;
  form.delete(field);
  for (const file of await shrinkPhotos(files)) form.append(field, file);
}
