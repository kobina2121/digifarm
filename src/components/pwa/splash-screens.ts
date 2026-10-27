/**
 * iPhone launch ("splash") screens for the installed PWA. iOS only shows a
 * launch image whose size exactly matches the device, so each screen size
 * gets its own image (portrait). Android builds its splash from the manifest.
 */
export const SPLASH_SCREENS = [
  { id: "1320x2868", width: 440, height: 956, ratio: 3 }, // 17 Pro Max, 16 Pro Max
  { id: "1290x2796", width: 430, height: 932, ratio: 3 }, // 15/16 Plus, 14/15 Pro Max
  { id: "1260x2736", width: 420, height: 912, ratio: 3 }, // iPhone Air
  { id: "1206x2622", width: 402, height: 874, ratio: 3 }, // 17, 17 Pro, 16 Pro
  { id: "1179x2556", width: 393, height: 852, ratio: 3 }, // 15, 15 Pro, 16, 14 Pro
  { id: "1284x2778", width: 428, height: 926, ratio: 3 }, // 14 Plus, 13/12 Pro Max
  { id: "1170x2532", width: 390, height: 844, ratio: 3 }, // 14, 13, 13 Pro, 12, 16e
  { id: "1125x2436", width: 375, height: 812, ratio: 3 }, // 13/12 mini, 11 Pro, X, XS
  { id: "1242x2688", width: 414, height: 896, ratio: 3 }, // 11 Pro Max, XS Max
  { id: "828x1792", width: 414, height: 896, ratio: 2 }, // 11, XR
  { id: "1242x2208", width: 414, height: 736, ratio: 3 }, // 8 Plus
  { id: "750x1334", width: 375, height: 667, ratio: 2 }, // SE (2nd/3rd gen), 8
] as const;

export type SplashScreen = (typeof SPLASH_SCREENS)[number];

export function splashStartupImages() {
  return SPLASH_SCREENS.map((s) => ({
    url: `/splash/${s.id}.png`,
    media: `(device-width: ${s.width}px) and (device-height: ${s.height}px) and (-webkit-device-pixel-ratio: ${s.ratio}) and (orientation: portrait)`,
  }));
}
