"use client";

import { Sprout } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { ListingPhoto } from "@/modules/catalog";

import { PhotoViewer } from "./photo-viewer";

/**
 * Swipeable product photos with dots, like a phone gallery. The whole photo
 * always shows (never cropped); tapping one opens it full screen. Draws its own <img>: the shared ListingImage
 * sits beside server-only catalogue code.
 */
export function Gallery({
  photos,
  title,
}: {
  photos: ListingPhoto[];
  title: string;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [viewing, setViewing] = useState<number | null>(null);
  const closeViewer = useCallback(() => setViewing(null), []);

  if (!photos.length) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center text-field-green-dark">
        <Sprout className="size-16 opacity-50" aria-hidden />
      </div>
    );
  }

  function go(i: number) {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="grid gap-4">
      <ul
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((photo, i) => (
          <li key={photo.src} className="w-full shrink-0 snap-center">
            <button
              type="button"
              onClick={() => setViewing(i)}
              aria-label={`View ${photos.length > 1 ? `photo ${i + 1}` : "photo"} full screen`}
              className="block w-full cursor-zoom-in"
            >
              {/* Already optimised at upload (WebP, two sizes). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.src}
                srcSet={photo.srcSet}
                sizes="(min-width: 768px) 640px, 100vw"
                width={photo.width}
                height={photo.height}
                alt={photos.length > 1 ? `${title}, photo ${i + 1}` : title}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="aspect-[4/3] w-full object-contain drop-shadow-[0_18px_24px_rgb(31_42_31/0.18)]"
              />
            </button>
          </li>
        ))}
      </ul>
      {photos.length > 1 ? (
        <div className="flex justify-center gap-1.5">
          {photos.map((photo, i) => (
            <button
              key={photo.src}
              type="button"
              aria-label={`Show photo ${i + 1} of ${photos.length}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => go(i)}
              className={cn(
                "h-2.5 rounded-full transition-all",
                i === index
                  ? "w-6 bg-field-green"
                  : "w-2.5 bg-field-green/30 hover:bg-field-green/50",
              )}
            />
          ))}
        </div>
      ) : null}
      {viewing !== null ? (
        <PhotoViewer
          photos={photos}
          title={title}
          start={viewing}
          onClose={closeViewer}
        />
      ) : null}
    </div>
  );
}
