"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";

import { saveListing } from "@/app/market/saved-actions";
import { cn } from "@/lib/utils";

const ROUND =
  "flex size-10 items-center justify-center rounded-full bg-card/90 shadow-sm backdrop-blur transition-transform active:scale-90";

/** Heart that saves a listing for later. Fills in at once; undone if saving fails. */
export function SaveButton({
  listingId,
  productName,
  saved,
  className,
}: {
  listingId: string;
  productName: string;
  saved: boolean;
  className?: string;
}) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={optimistic}
      aria-label={
        optimistic ? `Remove ${productName} from saved` : `Save ${productName}`
      }
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await saveListing(listingId, !optimistic);
        })
      }
      className={cn(ROUND, className)}
    >
      <Heart
        aria-hidden
        className={cn(
          "size-5 transition-colors",
          optimistic ? "fill-[#e5484d] text-[#e5484d]" : "text-foreground",
        )}
      />
    </button>
  );
}

/** For visitors: the heart asks them to sign in, then brings them back. */
export function SignInToSave({
  listingId,
  productName,
  className,
}: {
  listingId: string;
  productName: string;
  className?: string;
}) {
  return (
    <Link
      href={`/sign-in?next=${encodeURIComponent(`/market/listings/${listingId}`)}`}
      aria-label={`Sign in to save ${productName}`}
      className={cn(ROUND, className)}
    >
      <Heart aria-hidden className="size-5 text-foreground" />
    </Link>
  );
}
