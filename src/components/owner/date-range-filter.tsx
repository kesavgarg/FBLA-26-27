import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { addDays, validateRange, type DateRange } from "@/lib/domain/analytics";
import { cx } from "@/lib/utils";

export type RangeResult = { range: DateRange; error: string | null };

const RANGE_ERRORS = {
  format: "Enter real dates (YYYY-MM-DD).",
  order: "The start date must be on or before the end date.",
  future: "The end date can’t be in the future.",
  too_long: "Choose a range of one year or less.",
} as const;

/** Read ?from=&to= from the URL; invalid input falls back to the last 14 days with a message. */
export function parseRange(params: Record<string, string | string[] | undefined>, today: string): RangeResult {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const fallback = { from: addDays(today, -13), to: today };
  const from = one(params.from);
  const to = one(params.to);
  if (!from && !to) return { range: fallback, error: null };
  const checked = validateRange(from, to, today);
  return checked.ok ? { range: checked.range, error: null } : { range: fallback, error: RANGE_ERRORS[checked.reason] };
}

/**
 * Date filter shown above the charts: quick ranges plus custom dates.
 * A plain GET form, so a filtered view can be bookmarked or shared.
 */
export function DateRangeFilter({ path, range, today, extra }: { path: string; range: DateRange; today: string; extra?: Record<string, string> }) {
  const quick = [
    { label: "Last 7 days", from: addDays(today, -6) },
    { label: "Last 14 days", from: addDays(today, -13) },
    { label: "Last 30 days", from: addDays(today, -29) },
  ];
  const qs = (from: string) => new URLSearchParams({ ...extra, from, to: today }).toString();
  const input = "min-h-11 rounded-[var(--radius-field)] border border-line-strong bg-canvas px-3 tabular";

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-sky-50 p-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick date ranges">
        {quick.map((q) => {
          const active = range.from === q.from && range.to === today;
          return (
            <Link
              key={q.label}
              href={`${path}?${qs(q.from)}`}
              aria-current={active ? "true" : undefined}
              className={cx(
                "inline-flex min-h-11 items-center rounded-[var(--radius-pill)] border px-4 text-sm font-semibold",
                active ? "border-ink bg-ink text-white" : "border-line-strong bg-canvas hover:border-action",
              )}
            >
              {q.label}
            </Link>
          );
        })}
      </div>
      <form action={path} method="get" className="flex flex-wrap items-end gap-2">
        {Object.entries(extra ?? {}).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label className="flex flex-col gap-1 text-sm font-semibold">
          From
          <input type="date" name="from" defaultValue={range.from} max={today} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          To
          <input type="date" name="to" defaultValue={range.to} max={today} className={input} />
        </label>
        <button type="submit" className={buttonClasses("secondary")}>
          Apply dates
        </button>
      </form>
    </div>
  );
}
