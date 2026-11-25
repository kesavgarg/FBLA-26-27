import Link from "next/link";

/**
 * Goodson Drug Co. wordmark for this student project.
 * A simple original mark (a rounded tile with a serif "G" and a small cross)
 * — not the real store's logo, which we do not use.
 */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-3 rounded-lg" aria-label="Goodson Drug Co. home">
      <svg viewBox="0 0 40 40" className="size-10 shrink-0" aria-hidden="true">
        <rect width="40" height="40" rx="11" fill="var(--color-sky-100)" />
        <rect x="0.5" y="0.5" width="39" height="39" rx="10.5" fill="none" stroke="var(--color-sky-300)" />
        <text
          x="17.5"
          y="28.5"
          textAnchor="middle"
          fontFamily="var(--font-serif)"
          fontSize="24"
          fontWeight="600"
          fill="var(--color-ink)"
        >
          G
        </text>
        <path d="M30 9.5v7M26.5 13h7" stroke="var(--color-action)" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-serif text-[1.3rem] font-semibold tracking-tight text-ink">Goodson</span>
          <span className="mt-0.5 text-[0.8rem] font-medium text-muted">Drug Co. · Cumming, GA</span>
        </span>
      )}
    </Link>
  );
}
