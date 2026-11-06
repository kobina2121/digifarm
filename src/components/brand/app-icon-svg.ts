/** The Akuafo glyph (white A, Sprout leaf crossbar, gold sun) on its 80×80 grid. */
const GLYPH = `<path d="M18 68 L40 22 L62 68" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M26 51 C32 42 46 41 54 47 C47 57 33 57 26 51 Z" fill="#8fd16a"/>
    <circle cx="40" cy="11" r="6" fill="#f2a900"/>`;

/**
 * The app icon: the Akuafo tile (Field Green) filling the icon, as an SVG
 * string for generated PNG icons and the favicon. `inset` shrinks the glyph
 * for maskable icons, which Android crops to a circle.
 */
export function appIconSvg({
  size,
  inset = 0,
  rounded = true,
}: {
  size: number;
  inset?: number;
  rounded?: boolean;
}) {
  const pad = size * inset;
  const scale = (size - pad * 2) / 80;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rounded ? size * 0.225 : 0}" fill="#17663a"/>
  <g transform="translate(${pad} ${pad}) scale(${scale})">
    ${GLYPH}
  </g>
</svg>`;
}

/** The glyph alone, cropped to its edges, for drawing on a Field Green background. */
export function onGreenMarkSvg(width: number) {
  const height = (width * 70) / 54;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="13 4 54 70">
  ${GLYPH}
</svg>`;
}
