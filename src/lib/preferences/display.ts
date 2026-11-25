/**
 * Display (accessibility) preferences.
 *
 * Stored in one small cookie so the server can render the page in the right
 * mode on the first paint, with no flash of the wrong text size. Signed-in
 * users also get a copy saved in `user_preferences` (see Phase 5).
 */
export const DISPLAY_COOKIE = "gd_display";

export type DisplayPrefs = {
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
};

export const DEFAULT_DISPLAY: DisplayPrefs = {
  largeText: false,
  highContrast: false,
  reduceMotion: false,
};

/** Encode as a short string like "l1c0m0" (no JSON needed in a cookie). */
export function encodeDisplay(prefs: DisplayPrefs): string {
  return `l${+prefs.largeText}c${+prefs.highContrast}m${+prefs.reduceMotion}`;
}

/** Decode the cookie; anything unexpected falls back to the defaults. */
export function decodeDisplay(raw: string | undefined): DisplayPrefs {
  const match = /^l([01])c([01])m([01])$/.exec(raw ?? "");
  if (!match) return DEFAULT_DISPLAY;
  return {
    largeText: match[1] === "1",
    highContrast: match[2] === "1",
    reduceMotion: match[3] === "1",
  };
}

/** Turn preferences into the data attributes the CSS in globals.css reads. */
export function displayAttributes(prefs: DisplayPrefs): Record<string, string | undefined> {
  return {
    "data-text": prefs.largeText ? "large" : undefined,
    "data-contrast": prefs.highContrast ? "high" : undefined,
    "data-motion": prefs.reduceMotion ? "reduce" : undefined,
  };
}

/**
 * Browser only: save the preferences cookie immediately, so a reload right
 * after a change keeps it (the server action that follows also validates it).
 */
export function writeDisplayCookieInBrowser(prefs: DisplayPrefs): void {
  document.cookie = `${DISPLAY_COOKIE}=${encodeDisplay(prefs)}; path=/; max-age=31536000; samesite=lax`;
}
