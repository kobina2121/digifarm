import { ImageResponse } from "next/og";

import { appIconSvg } from "@/components/brand/app-icon-svg";

// PNG icons for the web app manifest and iOS home screen, generated at build time.
const VARIANTS = {
  "192.png": { size: 192, inset: 0.16, rounded: true },
  "512.png": { size: 512, inset: 0.16, rounded: true },
  // Maskable: full-bleed background, mark kept inside Android's safe zone.
  "maskable-512.png": { size: 512, inset: 0.26, rounded: false },
  "apple-touch-180.png": { size: 180, inset: 0.16, rounded: false },
} as const;

type Variant = keyof typeof VARIANTS;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(
  _request: Request,
  { params }: RouteContext<"/icons/[variant]">,
) {
  const { variant } = await params;
  const spec = VARIANTS[variant as Variant];
  if (!spec) return new Response("Not found", { status: 404 });

  const src = `data:image/svg+xml;base64,${Buffer.from(appIconSvg(spec)).toString("base64")}`;
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} width={spec.size} height={spec.size} alt="" />,
    { width: spec.size, height: spec.size },
  );
}
