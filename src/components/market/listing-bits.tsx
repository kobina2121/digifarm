import { BadgeCheck, Sprout } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import {
  type Availability,
  type ListingPhoto,
  UNAVAILABLE_LABELS,
} from "@/modules/catalog";

const GRADE_STYLES: Record<string, string> = {
  A: "bg-field-green text-white",
  B: "bg-sprout-soft text-field-green-dark",
  C: "bg-muted text-soil",
};

/** DigiFarm grade as a labelled pill ("Grade A"), never colour alone. */
export function GradeBadge({
  grade,
  className,
}: {
  grade: { code: string; title?: string } | null;
  className?: string;
}) {
  if (!grade) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        GRADE_STYLES[grade.code] ?? GRADE_STYLES.C,
        className,
      )}
    >
      Grade {grade.code}
      {grade.title ? (
        <span className="ml-1 font-normal opacity-85">· {grade.title}</span>
      ) : null}
    </span>
  );
}

export function AvailabilityBadge({
  availability,
}: {
  availability: Availability;
}) {
  if (availability.available) {
    return <StatusBadge tone="success" label="In stock" />;
  }
  return (
    <StatusBadge
      tone={availability.reason === "OUT_OF_STOCK" ? "danger" : "attention"}
      label={UNAVAILABLE_LABELS[availability.reason]}
    />
  );
}

export function VerifiedFarm({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <span className="truncate">{name}</span>
      <BadgeCheck
        className="size-4 shrink-0 text-field-green"
        aria-label="Verified farm"
      />
    </span>
  );
}

/**
 * Product photo, already resized to WebP. Without one, a calm placeholder
 * instead of a broken image.
 */
export function ListingImage({
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
    // Already optimised at upload (WebP, two sizes), so the image optimizer isn't needed.
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
      className={cn("object-cover", className)}
    />
  );
}
