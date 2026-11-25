import { Fraunces, Inter } from "next/font/google";

/**
 * Typefaces, loaded once and self-hosted by next/font (no request to Google
 * at runtime). Exported so the canvas wordmark can draw with the same font.
 *   Inter    — interface and body text
 *   Fraunces — brand wordmark and a few heritage headings
 */
export const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
export const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600"],
});
