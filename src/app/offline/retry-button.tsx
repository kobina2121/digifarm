"use client";

import { Button } from "@/components/ui/button";

/** The offline page is shown in place of the page that failed, so reloading retries it. */
export function RetryButton() {
  return (
    <Button
      size="lg"
      className="mt-8 w-full"
      onClick={() => window.location.reload()}
    >
      Try again
    </Button>
  );
}
