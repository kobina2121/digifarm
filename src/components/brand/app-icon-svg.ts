/**
 * The app icon from the brand sheet (white "D" + leaf on Field Green, gold pixel),
 * as an SVG string for generated PNG icons and the favicon.
 * `inset` shrinks the mark for maskable icons, which Android crops to a circle.
 */
export function appIconSvg({
  size,
  inset = 0.2,
  rounded = true,
}: {
  size: number;
  inset?: number;
  rounded?: boolean;
}) {
  const pad = size * inset;
  const scale = (size - pad * 2) / 124;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rounded ? size * 0.22 : 0}" fill="#17663a"/>
  <g transform="translate(${pad} ${pad}) scale(${scale})">
    <rect x="104" y="0" width="18" height="18" rx="3" fill="#f2a900"/>
    <path d="M2 16 H60 A53 53 0 0 1 60 122 H2 Z" fill="#ffffff"/>
    <path d="M22 104 C22 68 46 46 86 44 C84 82 60 104 22 104 Z" fill="#17663a"/>
    <line x1="30" y1="96" x2="72" y2="58" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>
  </g>
</svg>`;
}

/** The mark alone (white "D", Field Green leaf, gold pixel) on a transparent background. */
export function onGreenMarkSvg(width: number) {
  const height = (width * 122) / 124;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 124 122">
  <rect x="104" y="0" width="18" height="18" rx="3" fill="#f2a900"/>
  <path d="M2 16 H60 A53 53 0 0 1 60 122 H2 Z" fill="#ffffff"/>
  <path d="M22 104 C22 68 46 46 86 44 C84 82 60 104 22 104 Z" fill="#17663a"/>
  <line x1="30" y1="96" x2="72" y2="58" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>
</svg>`;
}
