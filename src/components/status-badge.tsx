import { CircleCheck, CircleDashed, CircleX, Clock } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "neutral" | "attention" | "success" | "danger";

const TONES: Record<Tone, { className: string; icon: typeof Clock }> = {
  neutral: { className: "bg-muted text-soil", icon: CircleDashed },
  attention: { className: "bg-harvest-gold-soft text-soil", icon: Clock },
  success: {
    className: "bg-sprout-soft text-field-green-dark",
    icon: CircleCheck,
  },
  danger: { className: "bg-destructive/10 text-destructive", icon: CircleX },
};

/** Status pill: always text + icon, never colour alone. */
export function StatusBadge({
  tone,
  label,
  className,
}: {
  tone: Tone;
  label: string;
  className?: string;
}) {
  const { className: toneClass, icon: Icon } = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        toneClass,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

export const LISTING_TONE = {
  DRAFT: "neutral",
  ACTIVE: "success",
  PAUSED: "attention",
  ARCHIVED: "neutral",
} as const satisfies Record<string, Tone>;

export const LISTING_STATUS_LABELS = {
  DRAFT: "Draft",
  ACTIVE: "On sale",
  PAUSED: "Paused",
  ARCHIVED: "Archived",
} as const;

export const VERIFICATION_TONE = {
  PROSPECT: "neutral",
  VISITED: "attention",
  APPROVED: "success",
  REJECTED: "danger",
  SUSPENDED: "danger",
} as const satisfies Record<string, Tone>;
