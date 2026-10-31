"use client";

import { useEffect } from "react";

const FADE_MS = 300;

/** Fades the launch screen out once the app has been open for `durationMs`. */
export function LaunchSplashTimer({ durationMs }: { durationMs: number }) {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("df-splash")) return;
    // performance.now() counts from when the app started loading this page.
    const remaining = Math.max(0, durationMs - performance.now());
    let hide: ReturnType<typeof setTimeout>;
    const fade = setTimeout(() => {
      root.classList.add("df-splash-out");
      hide = setTimeout(
        () => root.classList.remove("df-splash", "df-splash-out"),
        FADE_MS,
      );
    }, remaining);
    return () => {
      clearTimeout(fade);
      clearTimeout(hide);
    };
  }, [durationMs]);
  return null;
}
