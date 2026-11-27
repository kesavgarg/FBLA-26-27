import "server-only";
import { buildReport, storeDay, type ReportGroup, type ReportRow } from "@/lib/domain/analytics";
import type { DateRange } from "@/lib/domain/analytics";
import { loadAnalyticsData } from "@/lib/data/analytics";
import { en } from "@/lib/i18n/en";

/** Report options read from the URL (unknown values fall back to defaults). */
export const REPORT_GROUPS: ReadonlyArray<{ value: ReportGroup; label: string }> = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "category", label: "Category" },
  { value: "product", label: "Product" },
];
export const REPORT_COLUMNS = [
  { value: "orders", label: "Orders" },
  { value: "units", label: "Units sold" },
  { value: "revenue", label: "Simulated sales" },
] as const;
export type ReportColumn = (typeof REPORT_COLUMNS)[number]["value"];

export function parseReportOptions(params: Record<string, string | string[] | undefined>): { group: ReportGroup; columns: ReportColumn[] } {
  const group = (Array.isArray(params.group) ? params.group[0] : params.group) ?? "day";
  const rawCols = params.col === undefined ? [] : Array.isArray(params.col) ? params.col : [params.col];
  const columns = REPORT_COLUMNS.map((c) => c.value).filter((c) => rawCols.length === 0 || rawCols.includes(c));
  return {
    group: REPORT_GROUPS.some((g) => g.value === group) ? (group as ReportGroup) : "day",
    columns: columns.length ? columns : ["orders", "units", "revenue"],
  };
}

/** Load data and build the grouped report rows plus a totals row. */
export async function runReport(range: DateRange, group: ReportGroup, today: string): Promise<{ rows: ReportRow[]; totals: ReportRow }> {
  const { orders } = await loadAnalyticsData(range, today);
  const rows = buildReport(orders, range, group, (c) => en.shop.categories[c as keyof typeof en.shop.categories] ?? c);
  const totals = rows.reduce(
    (sum, r) => ({ ...sum, orders: sum.orders + r.orders, units: sum.units + r.units, revenueCents: sum.revenueCents + r.revenueCents }),
    { key: "total", label: "Total", orders: 0, units: 0, revenueCents: 0 },
  );
  // Category/product rows count an order once per group, so the total of
  // that column is not the number of orders; show the real order count.
  if (group === "category" || group === "product") {
    totals.orders = orders.filter((o) => {
      const day = storeDay(o.createdAt);
      return o.status !== "cancelled" && day >= range.from && day <= range.to;
    }).length;
  }
  return { rows, totals };
}
