/*
 * Flat brand illustrations for the cart and orders screens, in the same
 * style as the home hero (components/home/harvest-art.tsx). Decorative only.
 */

const G = "#17663a";
const GD = "#11502d";
const SPROUT = "#8fd16a";
const GOLD = "#f2a900";
const WHITE = "#ffffff";
const TOMATO = "#d9462b";
const LEAF = "#2f7d48";
const WOOD = "#c98a3e";
const WOOD_DARK = "#9c6627";
const SOIL = "#13261a";

type ArtProps = { className?: string };

function Svg({
  viewBox,
  className,
  children,
}: ArtProps & { viewBox: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox={viewBox}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function Tomato({ x, y, r = 13 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={TOMATO} />
      <circle
        cx={x - r * 0.35}
        cy={y - r * 0.35}
        r={r * 0.22}
        fill={WHITE}
        opacity="0.45"
      />
      <path
        d={`M${x - r * 0.45} ${y - r * 0.85} l${r * 0.45} ${r * 0.35} l${r * 0.45} -${r * 0.35}`}
        stroke={LEAF}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>
  );
}

/** A woven market basket heaped with produce: for the cart. */
export function BasketArt({ className }: ArtProps) {
  return (
    <Svg viewBox="0 0 200 150" className={className}>
      <ellipse cx="100" cy="138" rx="72" ry="8" fill={SOIL} opacity="0.08" />
      {/* Handle */}
      <path
        d="M48 74 C52 20 148 20 152 74"
        fill="none"
        stroke={WOOD_DARK}
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* Produce */}
      <path
        d="M58 70 C46 46 70 34 82 54 C84 40 104 36 106 56 Z"
        fill={SPROUT}
      />
      <path
        d="M70 66 C66 52 74 46 80 56"
        stroke={G}
        strokeWidth="3"
        fill="none"
      />
      <ellipse
        cx="134"
        cy="58"
        rx="9"
        ry="22"
        transform="rotate(35 134 58)"
        fill={GOLD}
      />
      <path
        d="M142 40 l6 -8 M144 44 l9 -4"
        stroke={LEAF}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <Tomato x={88} y={66} r={14} />
      <Tomato x={114} y={64} r={15} />
      <Tomato x={64} y={72} r={11} />
      {/* Basket */}
      <path d="M38 76 H162 L148 132 H52 Z" fill={WOOD} />
      <rect x="32" y="70" width="136" height="12" rx="6" fill={WOOD_DARK} />
      {[94, 108, 122].map((y) => (
        <path
          key={y}
          d={`M${42 + (y - 82) * 0.25} ${y} H${158 - (y - 82) * 0.25}`}
          stroke={WOOD_DARK}
          strokeWidth="3"
          opacity="0.7"
        />
      ))}
      {[70, 100, 130].map((x) => (
        <path
          key={x}
          d={`M${x} 82 L${x + (x - 100) * -0.08} 132`}
          stroke={WOOD_DARK}
          strokeWidth="3"
          opacity="0.45"
        />
      ))}
      {/* Price tag */}
      <g transform="rotate(-12 166 100)">
        <path d="M154 92 H178 V112 H154 L146 102 Z" fill={WHITE} />
        <circle cx="152" cy="102" r="2.5" fill={WOOD_DARK} />
        <path
          d="M158 99 H173 M158 105 H169"
          stroke={G}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    </Svg>
  );
}

/** A delivery truck carrying crates, with a tick: for orders. */
export function DeliveryArt({ className }: ArtProps) {
  return (
    <Svg viewBox="0 0 220 150" className={className}>
      <circle cx="182" cy="30" r="16" fill={GOLD} />
      <path
        d="M10 128 H210"
        stroke={SOIL}
        strokeOpacity="0.15"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="14 10"
      />
      {/* Crates on the back */}
      <g>
        <rect x="34" y="50" width="44" height="30" rx="3" fill={WOOD} />
        <rect x="82" y="50" width="44" height="30" rx="3" fill={WOOD} />
        <rect x="58" y="22" width="44" height="30" rx="3" fill={WOOD} />
        {[34, 82, 58].map((x, i) => (
          <path
            key={x}
            d={`M${x + 4} ${(i === 2 ? 22 : 50) + 15} H${x + 40}`}
            stroke={WOOD_DARK}
            strokeWidth="3"
          />
        ))}
        <Tomato x={48} y={48} r={8} />
        <Tomato x={64} y={46} r={8} />
        <Tomato x={96} y={48} r={8} />
        <Tomato x={112} y={47} r={8} />
        <Tomato x={74} y={20} r={8} />
        <Tomato x={90} y={19} r={8} />
      </g>
      {/* Truck */}
      <rect x="26" y="80" width="112" height="34" rx="6" fill={G} />
      <path d="M138 66 H170 L190 90 V114 H138 Z" fill={GD} />
      <path d="M146 72 H166 L180 90 H146 Z" fill={WHITE} opacity="0.9" />
      <rect x="40" y="90" width="58" height="6" rx="3" fill={SPROUT} />
      <circle cx="58" cy="118" r="13" fill={SOIL} />
      <circle cx="58" cy="118" r="5" fill={WHITE} />
      <circle cx="164" cy="118" r="13" fill={SOIL} />
      <circle cx="164" cy="118" r="5" fill={WHITE} />
      {/* Tick */}
      <circle
        cx="190"
        cy="66"
        r="15"
        fill={SPROUT}
        stroke={WHITE}
        strokeWidth="4"
      />
      <path
        d="M183 66 L188 71 L197 61"
        stroke={GD}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** A crate of produce wearing a heart tag, with a sparkle: for saved items. */
export function SavedArt({ className }: ArtProps) {
  return (
    <Svg viewBox="0 0 200 150" className={className}>
      <ellipse cx="96" cy="138" rx="70" ry="8" fill={SOIL} opacity="0.08" />
      {/* Produce */}
      <path d="M44 72 C34 48 58 38 68 58 C72 42 92 40 92 60 Z" fill={SPROUT} />
      <path
        d="M56 68 C52 54 60 48 66 58"
        stroke={G}
        strokeWidth="3"
        fill="none"
      />
      <ellipse
        cx="128"
        cy="60"
        rx="9"
        ry="22"
        transform="rotate(35 128 60)"
        fill={GOLD}
      />
      <Tomato x={78} y={68} r={14} />
      <Tomato x={104} y={66} r={15} />
      {/* Crate */}
      <rect x="30" y="76" width="132" height="56" rx="6" fill={WOOD} />
      <rect x="30" y="76" width="132" height="10" rx="5" fill={WOOD_DARK} />
      {[100, 118].map((y) => (
        <path
          key={y}
          d={`M38 ${y} H154`}
          stroke={WOOD_DARK}
          strokeWidth="3"
          opacity="0.6"
        />
      ))}
      {/* Heart tag on a string */}
      <path
        d="M150 82 C160 72 164 64 164 56"
        stroke={WHITE}
        strokeWidth="2.5"
        fill="none"
        opacity="0.9"
      />
      <g transform="rotate(10 168 40)">
        <circle cx="168" cy="40" r="22" fill={WHITE} />
        <path
          d="M168 52 C152 42 154 28 162 28 C165 28 167 30 168 33 C169 30 171 28 174 28 C182 28 184 42 168 52 Z"
          fill={TOMATO}
        />
      </g>
      {/* Sparkle */}
      <path
        d="M24 30 v12 M18 36 h12"
        stroke={GOLD}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </Svg>
  );
}
