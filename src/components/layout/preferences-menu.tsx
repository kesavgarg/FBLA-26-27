"use client";

import { Accessibility, Check, Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { setDisplayPrefsAction, setLocaleAction } from "@/lib/preferences/actions";
import { displayAttributes, writeDisplayCookieInBrowser, type DisplayPrefs } from "@/lib/preferences/display";
import { useI18n } from "@/lib/i18n/provider";
import { cx } from "@/lib/utils";

/**
 * Language switch (English / Español). Saves a cookie on the server, then
 * refreshes so every server-rendered string comes back in the new language.
 */
export function LanguageSwitch() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: "en" | "es") {
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={t.prefs.language}
      className={cx(
        "inline-flex items-center rounded-[var(--radius-pill)] border border-line bg-canvas p-1",
        pending && "opacity-70",
      )}
    >
      <Languages className="mx-1.5 size-4 text-muted" aria-hidden="true" />
      {(["en", "es"] as const).map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          onClick={() => choose(code)}
          aria-pressed={locale === code}
          className={cx(
            "min-h-9 rounded-[var(--radius-pill)] px-3 text-sm font-semibold transition-colors",
            locale === code ? "bg-ink text-white" : "text-ink hover:bg-sky-50",
          )}
        >
          {code === "en" ? "EN" : "ES"}
          <span className="sr-only"> — {code === "en" ? t.prefs.english : t.prefs.spanish}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Accessibility menu: larger text, high contrast, reduced motion.
 * Changes apply instantly (by setting data attributes on <html>) and are
 * saved in a cookie so the next page loads in the same mode.
 */
export function AccessibilityMenu({ initial }: { initial: DisplayPrefs }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<DisplayPrefs>(initial);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape or a click outside, and return focus to the button.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onClick(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node) && !buttonRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  function toggle(key: keyof DisplayPrefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    const html = document.documentElement;
    for (const [attr, value] of Object.entries(displayAttributes(next))) {
      if (value) html.setAttribute(attr, value);
      else html.removeAttribute(attr);
    }
    // Save straight away in the browser so a reload keeps the setting, then
    // confirm on the server (which validates the values).
    writeDisplayCookieInBrowser(next);
    void setDisplayPrefsAction(next);
  }

  const options: Array<{ key: keyof DisplayPrefs; label: string }> = [
    { key: "largeText", label: t.prefs.largeText },
    { key: "highContrast", label: t.prefs.highContrast },
    { key: "reduceMotion", label: t.prefs.reduceMotion },
  ];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="a11y-panel"
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-line bg-canvas px-3 text-sm font-semibold text-ink transition-colors hover:border-action hover:text-action"
      >
        <Accessibility className="size-[1.1rem]" aria-hidden="true" />
        <span className="hidden 2xl:inline">{t.prefs.accessibility}</span>
        <span className="sr-only 2xl:hidden">{t.prefs.accessibility}</span>
      </button>
      {open && (
        <div
          ref={panelRef}
          id="a11y-panel"
          role="group"
          aria-label={t.prefs.accessibility}
          className="absolute right-0 z-50 mt-2 w-64 rounded-[var(--radius-card)] border border-line bg-canvas p-2 shadow-lift"
        >
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              role="switch"
              aria-checked={prefs[option.key]}
              onClick={() => toggle(option.key)}
              className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[var(--radius-field)] px-3 text-left font-medium hover:bg-sky-50"
            >
              {option.label}
              <span
                aria-hidden="true"
                className={cx(
                  "flex h-6 w-11 items-center rounded-full p-0.5 transition-colors",
                  prefs[option.key] ? "bg-action" : "bg-line-strong",
                )}
              >
                <span
                  className={cx(
                    "flex size-5 items-center justify-center rounded-full bg-white shadow transition-transform",
                    prefs[option.key] && "translate-x-5",
                  )}
                >
                  {prefs[option.key] && <Check className="size-3 text-action" />}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
