"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, toLocale } from "@/lib/i18n";
import { DISPLAY_COOKIE, encodeDisplay, type DisplayPrefs } from "./display";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Save the visitor's language choice. Validated with `toLocale`, so a forged
 * value can only ever become "en" or "es".
 */
export async function setLocaleAction(locale: string): Promise<void> {
  const store = await cookies();
  store.set(LOCALE_COOKIE, toLocale(locale), {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
}

/** Save accessibility display settings (each value is forced to a boolean). */
export async function setDisplayPrefsAction(prefs: DisplayPrefs): Promise<void> {
  const store = await cookies();
  const clean: DisplayPrefs = {
    largeText: prefs.largeText === true,
    highContrast: prefs.highContrast === true,
    reduceMotion: prefs.reduceMotion === true,
  };
  store.set(DISPLAY_COOKIE, encodeDisplay(clean), {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
}
