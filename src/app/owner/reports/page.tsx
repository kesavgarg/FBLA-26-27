import { Download } from "lucide-react";
import { DateRangeFilter, parseRange } from "@/components/owner/date-range-filter";
import { PrintButton } from "@/components/owner/print-button";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { storeToday } from "@/lib/domain/refills";
import { formatCents } from "@/lib/format";
import { parseReportOptions, REPORT_COLUMNS, REPORT_GROUPS, runReport } from "@/lib/reports";
import { cx } from "@/lib/utils";

export const metadata = { title: "Owner · Reports" };

/**
 * Customisable sales report: date range, group by day/week/category/product,
 * choose columns, then export CSV or print. Options live in the URL.
 */
export default async function ReportsPage({ searchParams }: PageProps<"/owner/reports">) {
  await requireRole(["owner"], "/owner/reports");
  const params = await searchParams;
  const today = storeToday();
  const { range, error } = parseRange(params, today);
  const { group, columns } = parseReportOptions(params);
  const { rows, totals } = await runReport(range, group, today);

  const query = new URLSearchParams({ from: range.from, to: range.to, group });
  columns.forEach((c) => query.append("col", c));
  const show = (c: (typeof columns)[number]) => columns.includes(c);
  const firstHeader = REPORT_GROUPS.find((g) => g.value === group)?.label ?? "Group";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-tight">Sales report</h1>
          <p className="text-lg text-ink/80">
            {range.from} to {range.to} · grouped by {firstHeader.toLowerCase()} · simulated data
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <a href={`/owner/reports/export?${query}`} className={buttonClasses("primary")} download>
            <Download className="size-4" aria-hidden="true" />
            Download CSV
          </a>
          <PrintButton />
        </div>
      </div>

      <div className="print:hidden">
        <DateRangeFilter path="/owner/reports" range={range} today={today} extra={{ group }} />
      </div>
      {error && <Alert tone="danger">{error} Showing the last 14 days instead.</Alert>}

      <form action="/owner/reports" method="get" className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line p-4 lg:flex-row lg:items-end print:hidden">
        <input type="hidden" name="from" value={range.from} />
        <input type="hidden" name="to" value={range.to} />
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">Group by</legend>
          <div className="flex flex-wrap gap-2">
            {REPORT_GROUPS.map((g) => (
              <label
                key={g.value}
                className={cx(
                  "flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] border px-4 text-sm font-semibold has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-action",
                  g.value === group ? "border-action bg-sky-50" : "border-line-strong",
                )}
              >
                <input type="radio" name="group" value={g.value} defaultChecked={g.value === group} className="accent-[var(--color-action)]" />
                {g.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">Columns</legend>
          <div className="flex flex-wrap gap-2">
            {REPORT_COLUMNS.map((c) => (
              <label key={c.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] border border-line-strong px-4 text-sm font-semibold">
                <input type="checkbox" name="col" value={c.value} defaultChecked={show(c.value)} className="accent-[var(--color-action)]" />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className={buttonClasses("secondary")}>
          Update report
        </button>
      </form>

      <Card className="overflow-hidden">
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left">
            <caption className="sr-only">
              Sales report grouped by {firstHeader}, {range.from} to {range.to}
            </caption>
            <thead className="bg-sky-50 text-sm text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">{firstHeader}</th>
                {show("orders") && <th scope="col" className="px-5 py-3 text-right font-semibold">Orders</th>}
                {show("units") && <th scope="col" className="px-5 py-3 text-right font-semibold">Units sold</th>}
                {show("revenue") && <th scope="col" className="px-5 py-3 text-right font-semibold">{group === "category" || group === "product" ? "Simulated sales (before tax)" : "Simulated revenue"}</th>}
              </tr>
            </thead>
            <tbody className="tabular divide-y divide-line">
              {rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-muted" colSpan={4}>No orders in this period.</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.key}>
                    <th scope="row" className="px-5 py-3 text-left font-medium">{r.label}</th>
                    {show("orders") && <td className="px-5 py-3 text-right">{r.orders}</td>}
                    {show("units") && <td className="px-5 py-3 text-right">{r.units}</td>}
                    {show("revenue") && <td className="px-5 py-3 text-right">{formatCents(r.revenueCents)}</td>}
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="tabular bg-sky-50 font-semibold">
              <tr>
                <th scope="row" className="px-5 py-3 text-left">Total</th>
                {show("orders") && <td className="px-5 py-3 text-right">{totals.orders}</td>}
                {show("units") && <td className="px-5 py-3 text-right">{totals.units}</td>}
                {show("revenue") && <td className="px-5 py-3 text-right">{formatCents(totals.revenueCents)}</td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
      <p className="text-sm text-muted">
        Day and week totals include tax and delivery fees; category and product totals are item sales before tax. Cancelled orders are excluded. All
        figures are simulated.
      </p>
    </>
  );
}
