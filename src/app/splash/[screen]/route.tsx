import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

import { onGreenMarkSvg } from "@/components/brand/app-icon-svg";
import { SPLASH_SCREENS } from "@/components/pwa/splash-screens";

// iPhone launch images, generated at build time from the brand mark and wordmark.
// Inter is the closest open-licence match to the iPhone system font used in the app.
export function generateStaticParams() {
  return SPLASH_SCREENS.map((s) => ({ screen: `${s.id}.png` }));
}

const fonts = Promise.all(
  ["500", "700"].map((weight) =>
    readFile(path.join(process.cwd(), `src/assets/fonts/inter-${weight}.woff`)),
  ),
);

export async function GET(
  _request: Request,
  { params }: RouteContext<"/splash/[screen]">,
) {
  const { screen } = await params;
  const spec = SPLASH_SCREENS.find((s) => `${s.id}.png` === screen);
  if (!spec) return new Response("Not found", { status: 404 });

  const width = spec.width * spec.ratio;
  const height = spec.height * spec.ratio;
  const unit = width / 100; // sizes scale with the screen width
  const [medium, bold] = await fonts;
  const mark = `data:image/svg+xml;base64,${Buffer.from(onGreenMarkSvg(Math.round(unit * 26))).toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#17663a",
        fontFamily: "Inter",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mark}
        width={Math.round(unit * 26)}
        height={Math.round((unit * 26 * 122) / 124)}
        alt=""
      />
      <div
        style={{
          display: "flex",
          marginTop: unit * 7,
          fontSize: unit * 13,
          fontWeight: 700,
          letterSpacing: -unit * 0.45,
          color: "#ffffff",
        }}
      >
        Digi<span style={{ color: "#8fd16a" }}>Farm</span>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: unit * 2.5,
          fontSize: unit * 3.4,
          fontWeight: 500,
          letterSpacing: unit * 0.9,
          color: "rgba(255,255,255,0.75)",
        }}
      >
        FARM TO BUYER · GHANA
      </div>
    </div>,
    {
      width,
      height,
      fonts: [
        { name: "Inter", data: medium, weight: 500, style: "normal" },
        { name: "Inter", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
