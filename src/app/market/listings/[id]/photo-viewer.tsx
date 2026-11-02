"use client";

import { X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { ListingPhoto } from "@/modules/catalog";

/**
 * Full-screen photos on black, opened by tapping the gallery. Swipe between
 * photos; close with ✕ or Escape. Rendered into <body> so it covers the
 * tab bar and the price bar.
 */
export function PhotoViewer({
  photos,
  title,
  start,
  onClose,
}: {
  photos: ListingPhoto[];
  title: string;
  start: number;
  onClose: () => void;
}) {
  const track = useRef<HTMLUListElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const [index, setIndex] = useState(start);

  // Open on the photo that was tapped, without animating there.
  useLayoutEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = start * el.clientWidth;
  }, [start]);

  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} photos`}
      className="fixed inset-0 z-[60] flex flex-col bg-black text-white"
    >
      <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <p className="text-sm text-white/80 tabular-nums">
          {photos.length > 1 ? `${index + 1} / ${photos.length}` : ""}
        </p>
        <button
          ref={close}
          type="button"
          onClick={onClose}
          aria-label="Close photos"
          className="flex size-11 items-center justify-center rounded-full bg-white/15"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <ul
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex min-h-0 flex-1 snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((photo, i) => (
          <li
            key={photo.src}
            className="flex w-full shrink-0 snap-center items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.src}
              srcSet={photo.srcSet}
              sizes="100vw"
              width={photo.width}
              height={photo.height}
              alt={photos.length > 1 ? `${title}, photo ${i + 1}` : title}
              decoding="async"
              className="max-h-full w-full object-contain"
            />
          </li>
        ))}
      </ul>
      <div className="pb-[max(1rem,env(safe-area-inset-bottom))]" />
    </div>,
    document.body,
  );
}
