"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Registers /sw.js in production builds (or when NEXT_PUBLIC_ENABLE_SW=1) and
 * offers a reload when a new version is ready, instead of switching silently.
 */
export function ServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  // Reload only when the user asked for the update, not when the first worker takes control.
  const updateRequested = useRef(false);

  useEffect(() => {
    const enabled =
      process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_ENABLE_SW === "1";
    if (!enabled || !("serviceWorker" in navigator)) return;

    const onControllerChange = () => {
      if (!updateRequested.current) return;
      updateRequested.current = false;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        const track = (worker: ServiceWorker | null) => {
          worker?.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            )
              setWaiting(worker);
          });
        };
        if (registration.waiting && navigator.serviceWorker.controller)
          setWaiting(registration.waiting);
        registration.addEventListener("updatefound", () =>
          track(registration.installing),
        );
      })
      .catch(() => {
        // Not fatal: the site works without a service worker.
      });

    return () =>
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
  }, []);

  if (!waiting) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 flex pin-to-screen justify-center px-4 pt-2 pb-safe md:bottom-4 md:pb-0"
    >
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl bg-ink p-3 pl-4 text-white shadow-lg">
        <span className="flex-1 text-sm">
          A new version of Akuafo is ready.
        </span>
        <Button
          size="sm"
          className="bg-sprout text-soil hover:bg-sprout/90"
          onClick={() => {
            updateRequested.current = true;
            waiting.postMessage("SKIP_WAITING");
          }}
        >
          <RefreshCw aria-hidden />
          Reload
        </Button>
      </div>
    </div>
  );
}
