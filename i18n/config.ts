/** Languages Aboyun supports. Add a code here, then add messages/<code>.json. */
export const locales = ["en", "pcm", "yo", "ig", "ha"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Cookie that remembers the visitor's language (set when they use the language toggle). */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Each language written in itself, so people can find theirs. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  pcm: "Pidgin",
  yo: "Yorùbá",
  ig: "Igbo",
  ha: "Hausa",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/** Best match from an Accept-Language header, or null. */
export function localeFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  for (const part of header.split(",")) {
    const code = part.split(";")[0]?.trim().toLowerCase().split("-")[0];
    if (isLocale(code)) return code;
  }
  return null;
}
