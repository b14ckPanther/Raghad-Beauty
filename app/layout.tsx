import type { Metadata, Viewport } from "next";

import { fontStack } from "@/lib/fonts";
import { localeDir, type Locale } from "@/lib/i18n";

const locale: Locale = "ar";

export const metadata: Metadata = {
  title: "Raghad Beauty - رغد بيوتي",
  applicationName: "Raghad Beauty",
  icons: { icon: "/icon.svg" },
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
