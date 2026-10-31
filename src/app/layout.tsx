import type { Metadata, Viewport } from "next";
import "./globals.css";

import { LaunchSplash } from "@/components/pwa/launch-splash";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { splashStartupImages } from "@/components/pwa/splash-screens";

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
    // The launch screen adds a class to <html> before React loads.
    <html lang="en-GH" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <LaunchSplash />
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
