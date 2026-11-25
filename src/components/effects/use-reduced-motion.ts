"use client";

import { useEffect, useRef } from "react";

/**
 * True when the visitor asked for less motion — either in their operating
 * system (prefers-reduced-motion) or with the site's own Accessibility menu
 * (html[data-motion="reduce"]). Returned as a ref so animation loops can read
 * the latest value every frame without restarting.
 */
export function useReducedMotionRef() {
  const ref = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const html = document.documentElement;
    const update = () => {
      ref.current = query.matches || html.getAttribute("data-motion") === "reduce";
    };
    update();
    query.addEventListener("change", update);
    const observer = new MutationObserver(update);
    observer.observe(html, { attributes: true, attributeFilter: ["data-motion"] });
    return () => {
      query.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);

  return ref;
}
