import type { Category } from "@/lib/domain/catalog";
import { cx } from "@/lib/utils";

/**
 * Drawn package illustration for a product (no stock photos needed).
 * The package shape follows the category — a bottle for tablets, a box for
 * cold medicine, a tube for creams, a case for kits — in the brand palette.
 * Each product gets one of four tints, picked from its slug, so the grid
 * has variety while every image keeps the same frame and proportions.
 */
const TINTS = [
  { bg: "#EAF5FC", body: "#FFFFFF", band: "#A9D8F5", ink: "#18324B" },
  { bg: "#E6F0F8", body: "#FFFFFF", band: "#1F6FA8", ink: "#18324B" },
  { bg: "#EEF6FB", body: "#F7FBFE", band: "#7FC2EC", ink: "#18324B" },
  { bg: "#E9F2F9", body: "#FFFFFF", band: "#18324B", ink: "#18324B" },
] as const;

/** Small, stable hash so the same slug always gets the same tint. */
function tintFor(slug: string) {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TINTS[hash % TINTS.length];
}

function Bottle({ c, rx }: { c: (typeof TINTS)[number]; rx: boolean }) {
  return (
    <g>
      <rect x="128" y="52" width="64" height="26" rx="6" fill={rx ? "#F59E0B" : c.ink} />
      <rect x="120" y="76" width="80" height="14" rx="4" fill={c.ink} opacity="0.85" />
      <rect x="104" y="88" width="112" height="150" rx="22" fill={rx ? "#FDF3E1" : c.body} stroke={c.ink} strokeOpacity="0.12" strokeWidth="2" />
      <rect x="104" y="128" width="112" height="70" fill={rx ? "#FFFFFF" : c.band} opacity={rx ? 1 : 0.9} />
      <rect x="118" y="146" width="56" height="7" rx="3.5" fill={c.ink} opacity="0.75" />
      <rect x="118" y="162" width="78" height="6" rx="3" fill={c.ink} opacity="0.35" />
      <rect x="118" y="176" width="44" height="6" rx="3" fill={c.ink} opacity="0.35" />
      {rx && <text x="186" y="120" fontSize="16" fontWeight="700" fill="#9A6200" textAnchor="middle">Rx</text>}
    </g>
  );
}

function Box({ c }: { c: (typeof TINTS)[number] }) {
  return (
    <g>
      <path d="M96 92 L176 72 L232 92 L152 112 Z" fill={c.band} opacity="0.75" />
      <path d="M96 92 L152 112 L152 238 L96 218 Z" fill={c.body} stroke={c.ink} strokeOpacity="0.12" strokeWidth="2" />
      <path d="M152 112 L232 92 L232 218 L152 238 Z" fill={c.band} />
      <rect x="166" y="140" width="50" height="7" rx="3.5" fill="#FFFFFF" opacity="0.9" transform="skewY(-14) translate(0 42)" />
      <rect x="166" y="156" width="34" height="6" rx="3" fill="#FFFFFF" opacity="0.7" transform="skewY(-14) translate(0 42)" />
      <circle cx="124" cy="160" r="14" fill={c.band} opacity="0.5" />
    </g>
  );
}

function Tube({ c }: { c: (typeof TINTS)[number] }) {
  return (
    <g transform="rotate(-18 160 150)">
      <rect x="138" y="48" width="44" height="26" rx="6" fill={c.ink} />
      <path d="M126 74 H194 L214 236 H106 Z" fill={c.body} stroke={c.ink} strokeOpacity="0.12" strokeWidth="2" />
      <path d="M120 130 H200 L208 190 H112 Z" fill={c.band} />
      <rect x="104" y="230" width="112" height="12" rx="3" fill={c.ink} opacity="0.2" />
    </g>
  );
}

function Kit({ c }: { c: (typeof TINTS)[number] }) {
  return (
    <g>
      <rect x="122" y="70" width="76" height="34" rx="12" fill="none" stroke={c.ink} strokeWidth="10" />
      <rect x="80" y="96" width="160" height="130" rx="20" fill={c.body} stroke={c.ink} strokeOpacity="0.12" strokeWidth="2" />
      <rect x="80" y="96" width="160" height="26" rx="12" fill={c.band} />
      <path d="M160 140 v50 M135 165 h50" stroke="#B42318" strokeWidth="16" strokeLinecap="round" />
    </g>
  );
}

function Device({ c }: { c: (typeof TINTS)[number] }) {
  return (
    <g>
      <rect x="104" y="64" width="112" height="176" rx="26" fill={c.body} stroke={c.ink} strokeOpacity="0.12" strokeWidth="2" />
      <rect x="122" y="88" width="76" height="54" rx="10" fill={c.ink} />
      <text x="160" y="124" fontSize="24" fontWeight="600" fill={c.band} textAnchor="middle" fontFamily="ui-monospace, monospace">98.6</text>
      <circle cx="160" cy="186" r="22" fill={c.band} />
    </g>
  );
}

function Gift({ c }: { c: (typeof TINTS)[number] }) {
  return (
    <g>
      <rect x="92" y="118" width="136" height="116" rx="14" fill={c.body} stroke={c.ink} strokeOpacity="0.12" strokeWidth="2" />
      <rect x="84" y="96" width="152" height="36" rx="10" fill={c.band} />
      <rect x="150" y="96" width="20" height="138" fill={c.ink} opacity="0.85" />
      <path d="M160 96 C140 64 110 76 124 96 M160 96 C180 64 210 76 196 96" fill="none" stroke={c.ink} strokeWidth="8" strokeLinecap="round" />
    </g>
  );
}

export function ProductVisual({
  slug,
  category,
  label,
  className,
}: {
  slug: string;
  category: Category;
  /** Accessible description of the picture. Empty = decorative (hidden from screen readers). */
  label: string;
  className?: string;
}) {
  const c = tintFor(slug);
  const shape = (() => {
    switch (category) {
      case "cold_flu":
        return <Box c={c} />;
      case "personal_care":
        return <Tube c={c} />;
      case "first_aid":
        return slug.includes("kit") ? <Kit c={c} /> : <Box c={c} />;
      case "health_essentials":
        return <Device c={c} />;
      case "gifts":
        return <Gift c={c} />;
      default:
        return <Bottle c={c} rx={category === "prescription"} />;
    }
  })();

  return (
    <svg
      viewBox="0 0 320 280"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      className={cx("block h-auto w-full", className)}>
      <rect width="320" height="280" fill={c.bg} />
      <ellipse cx="160" cy="250" rx="92" ry="10" fill={c.ink} opacity="0.08" />
      {shape}
    </svg>
  );
}
