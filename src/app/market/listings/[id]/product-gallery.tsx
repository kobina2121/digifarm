"use client";

import { Sprout } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { ListingPhoto } from "@/modules/catalog";

/**
 * Client-side photo. (The shared ListingImage imports server-only catalogue
 * code, so the gallery draws its own.)
 */
function Photo({
  photo,
  alt,
  sizes,
  className,
  eager = false,
}: {
  photo: ListingPhoto | undefined;
  alt: string;
  sizes: string;
  className?: string;
  eager?: boolean;
}) {
  if (!photo) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-sprout-soft text-field-green",
          className,
        )}
      >
        <Sprout className="size-10 opacity-60" aria-hidden />
      </div>
    );
  }
  return (
    // Already optimised at upload (WebP, two sizes).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo.src}
      srcSet={photo.srcSet}
      sizes={sizes}
      width={photo.width}
      height={photo.height}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={cn("object-contain", className)}
    />
  );
}

/** Big photo (never cropped) with thumbnails to switch between photos. */
export function ProductGallery({
  photos,
  title,
}: {
  photos: ListingPhoto[];
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const current = photos[index];
  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-3xl bg-white">
        <Photo
          key={current?.src ?? "none"}
          photo={current}
          alt={photos.length > 1 ? `${title}, photo ${index + 1}` : title}
          sizes="(min-width: 1024px) 520px, 100vw"
          eager
          className="aspect-[4/3] w-full object-contain"
        />
      </div>
      {photos.length > 1 ? (
        <ul className="flex [scrollbar-width:none] gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {photos.map((photo, i) => (
            <li key={photo.src}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-pressed={i === index}
                className={cn(
                  "block size-16 overflow-hidden rounded-2xl border-2 bg-white transition-colors",
                  i === index ? "border-field-green" : "border-transparent",
                )}
              >
                <Photo
                  photo={photo}
                  alt=""
                  sizes="64px"
                  className="size-full object-contain"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
