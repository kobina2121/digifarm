import { Skeleton } from "@/components/ui/skeleton";

import { TopBand } from "./top-band";

export function PageSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-2/3 rounded-lg" />
      <Skeleton className="h-5 w-1/2 rounded-lg" />
      <Skeleton className="mt-4 h-32 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

/**
 * Loading screen for pages that open with a green <TopBand>: the band is there
 * from the first frame, so the top of the phone screen stays green while the
 * page's data loads instead of flashing a pale, empty header.
 */
export function BandPageSkeleton() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Loading">
      <TopBand className="grid gap-3">
        <div className="h-8 w-1/2 animate-pulse rounded-lg bg-white/20" />
        <div className="h-4 w-3/4 animate-pulse rounded-lg bg-white/15" />
      </TopBand>
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}
