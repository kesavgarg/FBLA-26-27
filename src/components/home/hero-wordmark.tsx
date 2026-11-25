"use client";

import { useSyncExternalStore } from "react";
import { VectorWordmark } from "@/components/effects/vector-wordmark";
import { fraunces } from "@/lib/fonts";

const NARROW = "(max-width: 639px)";

/** Subscribe to a CSS media query (true on phones). */
function useIsNarrow(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(NARROW);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}

/**
 * The large interactive "Goodson" word across the home hero, drawn in the
 * site's Fraunces serif. Decorative: the page's real heading is plain text.
 * On phones the word is drawn relatively larger so it still fills the width.
 */
export function HeroWordmark() {
  const narrow = useIsNarrow();
  return (
    <VectorWordmark
      text="Goodson"
      fontFamily={fraunces.style.fontFamily}
      fontWeight={600}
      fontSize={narrow ? 280 : 255}
      textColor="#A9D8F5"
      shade="#D9EEFB"
      accent="#A9D8F5"
      className="h-[clamp(130px,25vw,380px)] w-full max-sm:h-[34vw]"
    />
  );
}
