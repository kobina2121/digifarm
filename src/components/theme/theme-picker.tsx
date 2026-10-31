"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

import { THEME_STORAGE_KEY } from "./theme-script";

type Theme = "light" | "dark" | "system";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Auto", icon: Monitor },
];

function read(): Theme {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("df-theme", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("df-theme", onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Light / Dark / Auto (follows the phone). Saved on this device only. */
export function ThemePicker() {
  // Unknown on the server: nothing is highlighted until the page hydrates.
  const theme = useSyncExternalStore(subscribe, read, () => null);

  function choose(value: Theme) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // Private mode: the choice lasts until the page is closed.
    }
    // The theme script listens for this and updates <html>.
    window.dispatchEvent(new Event("df-theme"));
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => choose(value)}
            className={cn(
              "flex min-h-11 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-medium transition-colors",
              active
                ? "bg-field-green text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
