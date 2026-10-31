/*
 * Flat illustrations for the welcome screens, drawn in the brand palette
 * (Field Green, Sprout, Harvest Gold, Soil, Paper). Decorative: the text
 * beside each one says the same thing for screen readers.
 */

const G = "#17663a";
const GD = "#11502d";
const SPROUT = "#8fd16a";
const SOFT = "#eaf5e1";
const GOLD = "#f2a900";
const SOIL = "#13261a";
const WHITE = "#ffffff";
const LINE = "#d3d8cc";
const TOMATO = "#d9462b";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 280 220"
      className="h-auto w-full"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="140" cy="112" r="100" fill={SOFT} />
      {children}
    </svg>
  );
}

function Check({ x, y, r = 18 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={G} stroke={WHITE} strokeWidth="4" />
      <path
        d={`M${x - r * 0.42} ${y + r * 0.02} L${x - r * 0.1} ${y + r * 0.34} L${x + r * 0.45} ${y - r * 0.3}`}
        fill="none"
        stroke={WHITE}
        strokeWidth={r * 0.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** Step 1 — a farm DigiFarm has visited and approved. */
export function VerifiedFarm() {
  return (
    <Frame>
      <circle cx="196" cy="62" r="18" fill={GOLD} />
      <defs>
        <clipPath id="welcome-farm-clip">
          <circle cx="140" cy="112" r="100" />
        </clipPath>
      </defs>
      <g clipPath="url(#welcome-farm-clip)">
        <path
          d="M20 150 Q100 110 160 132 T260 120 L260 220 L20 220 Z"
          fill={SPROUT}
        />
        <path d="M20 165 Q110 128 260 150 L260 220 L20 220 Z" fill={G} />
        <path
          d="M60 185 Q130 160 230 172"
          fill="none"
          stroke={SPROUT}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M50 198 Q130 176 240 188"
          fill="none"
          stroke={SPROUT}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
      <rect
        x="92"
        y="96"
        width="62"
        height="48"
        fill={WHITE}
        stroke={SOIL}
        strokeWidth="3"
      />
      <path
        d="M84 100 L123 70 L162 100 Z"
        fill={TOMATO}
        stroke={SOIL}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect
        x="114"
        y="116"
        width="18"
        height="28"
        fill={GOLD}
        stroke={SOIL}
        strokeWidth="3"
      />
      <rect
        x="98"
        y="106"
        width="12"
        height="12"
        fill={SOFT}
        stroke={SOIL}
        strokeWidth="2.5"
      />
      <rect
        x="136"
        y="106"
        width="12"
        height="12"
        fill={SOFT}
        stroke={SOIL}
        strokeWidth="2.5"
      />
      <Check x={176} y={92} r={20} />
    </Frame>
  );
}

/** Step 2 — comparing price, unit, grade and minimum order. */
export function ChooseProduce() {
  return (
    <Frame>
      <rect
        x="70"
        y="38"
        width="140"
        height="156"
        rx="16"
        fill={WHITE}
        stroke={LINE}
        strokeWidth="2"
      />
      <rect x="82" y="50" width="116" height="66" rx="10" fill={SOFT} />
      <circle cx="122" cy="88" r="20" fill={TOMATO} />
      <circle cx="152" cy="92" r="16" fill={TOMATO} />
      <path
        d="M116 70 Q122 64 128 70 M146 76 Q152 70 158 76"
        fill="none"
        stroke={G}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="82" y="128" width="70" height="9" rx="4.5" fill={SOIL} />
      <rect x="82" y="145" width="50" height="7" rx="3.5" fill={LINE} />
      <rect x="82" y="168" width="58" height="14" rx="7" fill={G} />
      <rect
        x="148"
        y="164"
        width="38"
        height="22"
        rx="11"
        fill={SOFT}
        stroke={G}
        strokeWidth="2"
      />
      <path
        d="M161 175 h12 M167 169 v12"
        stroke={G}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle
        cx="198"
        cy="52"
        r="20"
        fill={GOLD}
        stroke={WHITE}
        strokeWidth="4"
      />
      <text
        x="198"
        y="59"
        textAnchor="middle"
        fontSize="20"
        fontWeight="700"
        fill={SOIL}
        fontFamily="-apple-system, system-ui, sans-serif"
      >
        A
      </text>
    </Frame>
  );
}

/** Step 3 — paying with mobile money or card. */
export function PaySecurely() {
  return (
    <Frame>
      <rect
        x="46"
        y="96"
        width="98"
        height="64"
        rx="10"
        fill={GOLD}
        transform="rotate(-12 95 128)"
      />
      <rect
        x="52"
        y="112"
        width="86"
        height="10"
        fill={SOIL}
        transform="rotate(-12 95 128)"
      />
      <rect x="112" y="30" width="96" height="170" rx="18" fill={SOIL} />
      <rect x="120" y="44" width="80" height="142" rx="10" fill={WHITE} />
      <rect x="146" y="36" width="28" height="5" rx="2.5" fill={GD} />
      <rect x="130" y="60" width="44" height="7" rx="3.5" fill={LINE} />
      <rect x="130" y="74" width="60" height="12" rx="6" fill={SOIL} />
      <Check x={160} y={124} r={22} />
      <rect x="130" y="160" width="60" height="16" rx="8" fill={G} />
      <rect
        x="196"
        y="140"
        width="34"
        height="30"
        rx="6"
        fill={G}
        stroke={WHITE}
        strokeWidth="3"
      />
      <path
        d="M204 140 v-8 a9 9 0 0 1 18 0 v8"
        fill="none"
        stroke={G}
        strokeWidth="5"
      />
      <circle cx="213" cy="155" r="4" fill={WHITE} />
    </Frame>
  );
}

/** Step 4 — DigiFarm phones the farmer to confirm the order. */
export function ConfirmWithFarm() {
  return (
    <Frame>
      <rect x="44" y="70" width="58" height="104" rx="12" fill={SOIL} />
      <rect x="50" y="82" width="46" height="80" rx="6" fill={SPROUT} />
      <path
        d="M62 112 q11 -14 22 0"
        fill="none"
        stroke={G}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M112 100 q10 10 0 20 M122 92 q18 18 0 36"
        fill="none"
        stroke={G}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M150 112 h20"
        stroke={G}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="2 8"
      />
      <circle cx="206" cy="84" r="17" fill="#8a5a3b" />
      <path
        d="M182 74 h48 l-8 -10 h-32 z"
        fill={GOLD}
        stroke={SOIL}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M180 150 q0 -40 26 -42 q26 2 26 42 z" fill={G} />
      <rect
        x="170"
        y="148"
        width="72"
        height="40"
        rx="6"
        fill={GOLD}
        stroke={SOIL}
        strokeWidth="3"
      />
      <path d="M170 162 h72 M170 176 h72" stroke={SOIL} strokeWidth="2" />
      <circle cx="186" cy="146" r="9" fill={TOMATO} />
      <circle cx="204" cy="144" r="9" fill={TOMATO} />
      <circle cx="222" cy="146" r="9" fill={TOMATO} />
      <Check x={232} y={58} r={16} />
    </Frame>
  );
}

/** Step 5 — status updates from confirmation to delivery. */
export function TrackDelivery() {
  return (
    <Frame>
      <path
        d="M40 176 Q120 150 150 168 T246 150"
        fill="none"
        stroke={SOIL}
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M40 176 Q120 150 150 168 T246 150"
        fill="none"
        stroke={WHITE}
        strokeWidth="2.5"
        strokeDasharray="10 10"
      />
      <g transform="translate(82 112)">
        <rect x="0" y="12" width="66" height="40" rx="6" fill={G} />
        <path d="M66 22 h22 l14 16 v14 h-36 z" fill={GD} />
        <rect x="74" y="26" width="16" height="10" rx="2" fill={SOFT} />
        <circle
          cx="18"
          cy="54"
          r="10"
          fill={SOIL}
          stroke={WHITE}
          strokeWidth="3"
        />
        <circle
          cx="84"
          cy="54"
          r="10"
          fill={SOIL}
          stroke={WHITE}
          strokeWidth="3"
        />
        <rect x="10" y="20" width="22" height="14" rx="3" fill={GOLD} />
      </g>
      <path
        d="M232 132 c-14 -18 -14 -40 0 -46 c14 6 14 28 0 46 z"
        fill={TOMATO}
      />
      <circle cx="232" cy="102" r="7" fill={WHITE} />
      <g>
        <line
          x1="70"
          y1="54"
          x2="190"
          y2="54"
          stroke={LINE}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <line
          x1="70"
          y1="54"
          x2="130"
          y2="54"
          stroke={G}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="70" cy="54" r="10" fill={G} />
        <circle cx="130" cy="54" r="10" fill={G} />
        <circle
          cx="190"
          cy="54"
          r="10"
          fill={WHITE}
          stroke={G}
          strokeWidth="4"
        />
      </g>
    </Frame>
  );
}
