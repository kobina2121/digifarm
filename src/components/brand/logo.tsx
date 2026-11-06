import { cn } from "@/lib/utils";

/*
 * Akuafo mark (concept 1, "Leaf A under the sun"): a white A with a leaf
 * crossbar and a gold sun, on a Field Green tile. Drawn on an 80×80 grid.
 * Replace with the designer's vector export when it arrives (ROADMAP D15).
 */

type Tone = "brand" | "on-dark" | "mono";

const TONES: Record<
  Tone,
  {
    tile: string;
    letter: string;
    leaf: string;
    sun: string;
    word: string;
    tagline: string;
  }
> = {
  brand: {
    tile: "var(--color-field-green)",
    letter: "#ffffff",
    leaf: "var(--color-sprout)",
    sun: "var(--color-harvest-gold)",
    word: "text-soil",
    tagline: "text-muted-foreground",
  },
  "on-dark": {
    tile: "var(--color-field-green)",
    letter: "#ffffff",
    leaf: "var(--color-sprout)",
    sun: "var(--color-harvest-gold)",
    word: "text-white",
    tagline: "text-white/70",
  },
  mono: {
    tile: "var(--color-soil)",
    letter: "#ffffff",
    leaf: "#ffffff",
    sun: "#ffffff",
    word: "text-soil",
    tagline: "text-soil",
  },
};

export function LogoMark({
  tone = "brand",
  className,
}: {
  tone?: Tone;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <svg
      viewBox="0 0 80 80"
      className={cn("h-8 w-auto shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="80" height="80" rx="18" fill={t.tile} />
      <path
        d="M18 68 L40 22 L62 68"
        fill="none"
        stroke={t.letter}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M26 51 C32 42 46 41 54 47 C47 57 33 57 26 51 Z" fill={t.leaf} />
      <circle cx="40" cy="11" r="6" fill={t.sun} />
    </svg>
  );
}

export function Logo({
  tone = "brand",
  tagline = false,
  className,
}: {
  tone?: Tone;
  tagline?: boolean;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark tone={tone} className={tagline ? "h-12" : "h-8"} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-sans font-bold tracking-[-0.03em]",
            tagline ? "text-4xl" : "text-2xl",
            t.word,
          )}
        >
          Akuafo
        </span>
        {tagline ? (
          <span
            className={cn(
              "mt-1.5 font-mono text-[0.65rem] tracking-[0.2em] uppercase",
              t.tagline,
            )}
          >
            Farm to buyer · Ghana
          </span>
        ) : null}
      </span>
    </span>
  );
}
