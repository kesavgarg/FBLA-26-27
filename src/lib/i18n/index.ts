/**
 * Language helpers shared by server and client code.
 *
 * The chosen language is stored in the `gd_locale` cookie so it stays the
 * same on every page and survives a refresh. Server components call
 * `getDictionary()` (see server.ts); client components read the dictionary
 * from <I18nProvider>.
 */
import { en, type Dictionary } from "./en";
import { es } from "./es";

/** Languages the site supports. A tuple, so it doubles as a runtime list. */
export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "gd_locale";

const DICTIONARIES: Record<Locale, Dictionary> = { en, es };

/** Narrow any string (for example a cookie value) to a supported locale. */
export function toLocale(value: string | undefined | null): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
}

/** Return the full dictionary for a locale. */
export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export type { Dictionary };
