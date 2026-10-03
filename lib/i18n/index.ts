import { ar } from "./ar";

export type Locale = "ar";
export type Dictionary = typeof ar;

const dictionaries: Record<Locale, Dictionary> = { ar };

/** Text direction per locale; add "en" (ltr) or "he" (rtl) here with its dictionary. */
export const localeDir: Record<Locale, "rtl" | "ltr"> = { ar: "rtl" };

export function getDictionary(locale: string): Dictionary {
  return dictionaries[(locale as Locale) in dictionaries ? (locale as Locale) : "ar"];
}
