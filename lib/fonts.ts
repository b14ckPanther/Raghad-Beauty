import { Cairo, Ubuntu } from "next/font/google";

/* Ubuntu carries Latin text and digits; it has no Arabic glyphs, so Arabic
   falls through to Cairo in the "Ubuntu, Cairo" stack. */
export const fontLatin = Ubuntu({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  adjustFontFallback: false,
});

export const fontArabic = Cairo({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/* Only Ubuntu's real face goes first: its generated fallback face has Arabic
   glyphs and would catch Arabic text before it reaches Cairo. */
export const fontStack = `${fontLatin.style.fontFamily.split(",")[0]}, ${fontArabic.style.fontFamily}, system-ui, sans-serif`;
