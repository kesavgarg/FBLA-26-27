import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, dictionaryFor, toLocale, type Dictionary, type Locale } from "./index";

/** Read the visitor's language from the `gd_locale` cookie. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return toLocale(store.get(LOCALE_COOKIE)?.value);
}

/** Convenience for server components: the dictionary for the current visitor. */
export async function getDictionary(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getLocale();
  return { locale, t: dictionaryFor(locale) };
}
