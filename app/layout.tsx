import type { Metadata, Viewport } from "next";

import { fontStack } from "@/lib/fonts";
import { localeDir, type Locale } from "@/lib/i18n";

const locale: Locale = "ar";

/* Launch images for the installed app on iPhone (one per screen size). */
const startupImage = [
  {
    "url": "/splash/iphone-750x1334.png",
    "media": "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
  },
  {
    "url": "/splash/iphone-828x1792.png",
    "media": "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
  },
  {
    "url": "/splash/iphone-1125x2436.png",
    "media": "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
  },
  {
    "url": "/splash/iphone-1242x2688.png",
    "media": "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
  },
  {
    "url": "/splash/iphone-1170x2532.png",
    "media": "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
  },
  {
    "url": "/splash/iphone-1284x2778.png",
    "media": "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
  },
  {
    "url": "/splash/iphone-1179x2556.png",
    "media": "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
  },
  {
    "url": "/splash/iphone-1290x2796.png",
    "media": "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
  },
  {
    "url": "/splash/iphone-1206x2622.png",
    "media": "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
  },
  {
    "url": "/splash/iphone-1320x2868.png",
    "media": "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
  }
];

export const metadata: Metadata = {
  title: "Raghad Beauty - رغد بيوتي",
  applicationName: "Raghad Beauty",
  icons: { icon: "/icon.svg", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "رغد بيوتي", statusBarStyle: "black-translucent", startupImage },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#26102b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={locale} dir={localeDir[locale]} style={{ "--font-stack": fontStack } as React.CSSProperties}>
      <body>{children}</body>
    </html>
  );
}
