import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

import { ServiceWorker } from "@/components/pwa/service-worker";
import { splashStartupImages } from "@/components/pwa/splash-screens";

// Only the DigiFarm wordmark uses a web font; all other text uses the system font.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "DigiFarm — Farm to buyer, Ghana",
    template: "%s · DigiFarm",
  },
  description:
    "Source fresh produce from verified Ghanaian farms for your restaurant, hotel, shop or business.",
  applicationName: "DigiFarm",
  appleWebApp: {
    capable: true,
    title: "DigiFarm",
    statusBarStyle: "default",
    startupImage: splashStartupImages(),
  },
  icons: { apple: [{ url: "/icons/apple-touch-180.png", sizes: "180x180" }] },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#17663a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GH"
      className={`${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
