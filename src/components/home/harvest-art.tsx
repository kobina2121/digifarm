/*
 * Hero illustration for the buyer home: a sun over farm rows and a crate of
 * produce. Flat brand colours drawn to sit on the Field Green hero in both
 * themes. Decorative only: the hero text says what matters.
 */

const SPROUT = "#8fd16a";
const GOLD = "#f2a900";
const SOIL = "#13261a";
const WHITE = "#ffffff";
const TOMATO = "#d9462b";
const LEAF = "#2f7d48";
const CRATE = "#c98a3e";
const CRATE_DARK = "#9c6627";

export function HarvestArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 170"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* Sun */}
      <circle cx="168" cy="40" r="22" fill={GOLD} />
      <circle cx="168" cy="40" r="32" fill={GOLD} opacity="0.18" />

      {/* Rolling field */}
      <path
        d="M0 112 Q60 84 120 100 T220 92 L220 170 L0 170 Z"
        fill={SPROUT}
        opacity="0.35"
      />
      <path
        d="M0 128 Q80 104 150 118 T220 112 L220 170 L0 170 Z"
        fill={SPROUT}
        opacity="0.55"
      />
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${10 + i * 6} ${150 - i * 12} Q110 ${128 - i * 12} 210 ${140 - i * 12}`}
          fill="none"
          stroke={WHITE}
          strokeOpacity="0.25"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}

      {/* Crate */}
      <g transform="translate(58 92)">
        <path d="M0 26 H104 L96 70 H8 Z" fill={CRATE} />
        <path d="M4 44 H100" stroke={CRATE_DARK} strokeWidth="4" />
        <path d="M6 58 H98" stroke={CRATE_DARK} strokeWidth="4" />
        <rect x="-4" y="20" width="112" height="10" rx="3" fill={CRATE_DARK} />

        {/* Produce piled in the crate */}
        <circle cx="22" cy="16" r="14" fill={TOMATO} />
        <circle cx="48" cy="10" r="15" fill={TOMATO} />
        <circle cx="76" cy="16" r="14" fill={TOMATO} />
        <path
          d="M18 4 l4 -5 l4 5 M44 -3 l4 -6 l4 6 M72 4 l4 -5 l4 5"
          stroke={LEAF}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <ellipse
          cx="94"
          cy="10"
          rx="9"
          ry="16"
          transform="rotate(30 94 10)"
          fill={GOLD}
        />
        <circle cx="16" cy="12" r="3" fill={WHITE} opacity="0.5" />
        <circle cx="42" cy="5" r="3" fill={WHITE} opacity="0.5" />
      </g>

      {/* Sprouts in the field */}
      {[
        [26, 132],
        [186, 128],
        [198, 146],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <path d="M0 10 V0" stroke={SOIL} strokeWidth="2.5" />
          <path d="M0 2 C-8 -2 -10 -8 -10 -10 C-4 -10 0 -6 0 2" fill={SPROUT} />
          <path d="M0 2 C8 -2 10 -8 10 -10 C4 -10 0 -6 0 2" fill={SPROUT} />
        </g>
      ))}
    </svg>
  );
}
