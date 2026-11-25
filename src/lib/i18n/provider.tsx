"use client";

import { createContext, use, type ReactNode } from "react";
import type { Dictionary, Locale } from "./index";

type I18nValue = { locale: Locale; t: Dictionary };

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Makes the current dictionary available to client components.
 * The root layout renders this once with the dictionary chosen on the server.
 */
export function I18nProvider({ value, children }: { value: I18nValue; children: ReactNode }) {
  return <I18nContext value={value}>{children}</I18nContext>;
}

/** Read the active language and dictionary inside a client component. */
export function useI18n(): I18nValue {
  const value = use(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}
