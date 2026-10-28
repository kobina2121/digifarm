import { cn } from "@/lib/utils";

/*
 * DigiFarm mark, redrawn as SVG from docs/brand/primary-logo.pdf (a raster sheet).
 * Replace these paths with the designer's vector export when it arrives (ROADMAP D15).
 */

type Tone = "brand" | "on-dark" | "mono";

const TONES: Record<
  Tone,
  {
    mark: string;
    cutout: string;
    pixel: string;
    digi: string;
    farm: string;
    tagline: string;
  }
> = {
  brand: {
    mark: "var(--color-field-green)",
    cutout: "#ffffff",
    pixel: "var(--color-harvest-gold)",
    digi: "text-soil",
    farm: "text-field-green",
    tagline: "text-muted-foreground",
  },
  "on-dark": {
    mark: "var(--color-sprout)",
    cutout: "var(--color-soil)",
    pixel: "var(--color-harvest-gold)",
    digi: "text-white",
    farm: "text-sprout",
    tagline: "text-white/70",
  },
  mono: {
    mark: "var(--color-soil)",
    cutout: "#ffffff",
    pixel: "var(--color-soil)",
    digi: "text-soil",
    farm: "text-soil",
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
      viewBox="0 0 124 122"
      className={cn("h-8 w-auto shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="104" y="0" width="18" height="18" rx="3" fill={t.pixel} />
      <path d="M2 16 H60 A53 53 0 0 1 60 122 H2 Z" fill={t.mark} />
      <path
        d="M22 104 C22 68 46 46 86 44 C84 82 60 104 22 104 Z"
        fill={t.cutout}
      />
      <line
        x1="30"
        y1="96"
        x2="72"
        y2="58"
        stroke={t.mark}
        strokeWidth="6"
        strokeLinecap="round"
      />
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
          )}
        >
          <span className={t.digi}>Digi</span>
          <span className={t.farm}>Farm</span>
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
