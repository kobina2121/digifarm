import type { Metadata, Viewport } from "next";
import "./globals.css";

import { LaunchSplash } from "@/components/pwa/launch-splash";
import { ThemeScript } from "@/components/theme/theme-script";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { splashStartupImages } from "@/components/pwa/splash-screens";

export const metadata: Metadata = {
  title: {
    default: "Akuafo — Farm to buyer, Ghana",
    template: "%s · Akuafo",
  },
  description:
    "Source fresh produce from verified Ghanaian farms for your restaurant, hotel, shop or business.",
  applicationName: "Akuafo",
  appleWebApp: {
    capable: true,
    title: "Akuafo",
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
    // The theme and launch-screen scripts add classes to <html> before React loads.
    <html lang="en-GH" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <ThemeScript />
        <LaunchSplash />
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
