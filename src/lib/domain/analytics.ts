/**
 * Owner analytics. PURE functions: they take plain arrays of records and
 * return numbers, so every figure on the dashboard can be unit-tested and
 * explained. All amounts are SIMULATED (fictional demo orders).
 *
 * Dates are compared as store-local calendar days (America/New_York) in
 * YYYY-MM-DD form, so "today" means today at the pharmacy.
 */
import type { FulfillmentMethod } from "./pricing";

export const STORE_TZ = "America/New_York";

export type AnalyticsOrder = {
  createdAt: string; // ISO timestamp
  totalCents: number;
  status: string;
  fulfillment: FulfillmentMethod;
  items: Array<{ productId: string; name: string; category: string; quantity: number; unitPriceCents: number }>;
};
export type AnalyticsConsult = { createdAt: string; decidedAt: string | null; status: string };
export type AnalyticsRefill = { status: string };
export type DateRange = { from: string; to: string }; // inclusive YYYY-MM-DD

/** ISO timestamp → store-local YYYY-MM-DD. */
export function storeDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TZ }).format(new Date(iso));
}

/** Add whole days to a YYYY-MM-DD date. */
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Every calendar day from `from` to `to`, inclusive. */
export function daysInRange(range: DateRange): string[] {
  const days: string[] = [];
  for (let day = range.from; day <= range.to; day = addDays(day, 1)) days.push(day);
  return days;
}

const inRange = (day: string, range: DateRange) => day >= range.from && day <= range.to;
const counts = (status: string) => status !== "cancelled";

export type DashboardMetrics = {
  ordersInRange: number;
  cancelledInRange: number;
  ordersToday: number;
  ordersThisWeek: number;
  revenueCents: number;
  averageOrderCents: number;
  byDay: Array<{ day: string; orders: number; revenueCents: number }>;
  topProducts: Array<{ productId: string; name: string; units: number; revenueCents: number }>;
  fulfillment: { pickup: number; delivery: number };
  averageApprovalHours: number | null;
  consultsDecided: number;
  approvalRate: number | null;
  refillCompletionRate: number | null;
  refillsCompleted: number;
  refillsTotal: number;
};

/**
 * Compute every dashboard figure for a date range.
 * Cancelled orders are counted separately and excluded from revenue,
 * the daily chart, top products and the pickup/delivery split.
 */
export function computeDashboard(
  orders: readonly AnalyticsOrder[],
  consults: readonly AnalyticsConsult[],
  refills: readonly AnalyticsRefill[],
  range: DateRange,
  today: string,
): DashboardMetrics {
  const weekStart = addDays(today, -6);
  const byDay = new Map(daysInRange(range).map((day) => [day, { day, orders: 0, revenueCents: 0 }]));
  const products = new Map<string, { productId: string; name: string; units: number; revenueCents: number }>();
  const fulfillment = { pickup: 0, delivery: 0 };
  let ordersInRange = 0;
  let cancelledInRange = 0;
  let ordersToday = 0;
  let ordersThisWeek = 0;
  let revenueCents = 0;

  for (const order of orders) {
    const day = storeDay(order.createdAt);
    if (counts(order.status)) {
      if (day === today) ordersToday += 1;
      if (day >= weekStart && day <= today) ordersThisWeek += 1;
    }
    if (!inRange(day, range)) continue;
    if (!counts(order.status)) {
      cancelledInRange += 1;
      continue;
    }
    ordersInRange += 1;
    revenueCents += order.totalCents;
    fulfillment[order.fulfillment] += 1;
    const bucket = byDay.get(day);
    if (bucket) {
      bucket.orders += 1;
      bucket.revenueCents += order.totalCents;
    }
    for (const item of order.items) {
      const entry = products.get(item.productId) ?? { productId: item.productId, name: item.name, units: 0, revenueCents: 0 };
      entry.units += item.quantity;
      entry.revenueCents += item.quantity * item.unitPriceCents;
      products.set(item.productId, entry);
    }
  }

  // Consults decided in the range: average hours from request to decision.
  const decided = consults.filter((c) => c.decidedAt && inRange(storeDay(c.decidedAt), range));
  const hours = decided.map((c) => (Date.parse(c.decidedAt!) - Date.parse(c.createdAt)) / 3_600_000);
  const approved = decided.filter((c) => c.status === "approved").length;

  // Refills: completed out of all that reached an outcome or are still open.
  const relevant = refills.filter((r) => r.status !== "cancelled");
  const completed = relevant.filter((r) => r.status === "completed").length;

  return {
    ordersInRange,
    cancelledInRange,
    ordersToday,
    ordersThisWeek,
    revenueCents,
    averageOrderCents: ordersInRange ? Math.round(revenueCents / ordersInRange) : 0,
    byDay: [...byDay.values()],
    topProducts: [...products.values()].sort((a, b) => b.units - a.units || b.revenueCents - a.revenueCents).slice(0, 5),
    fulfillment,
    averageApprovalHours: hours.length ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10 : null,
    consultsDecided: decided.length,
    approvalRate: decided.length ? Math.round((approved / decided.length) * 100) : null,
    refillCompletionRate: relevant.length ? Math.round((completed / relevant.length) * 100) : null,
    refillsCompleted: completed,
    refillsTotal: relevant.length,
  };
}

export type RangeCheck = { ok: true; range: DateRange } | { ok: false; reason: "format" | "order" | "future" | "too_long" };

/** Validate a date filter: real dates, from ≤ to, not in the future, at most a year. */
export function validateRange(from: string, to: string, today: string): RangeCheck {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  const real = (d: string) => pattern.test(d) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;
  if (!real(from) || !real(to)) return { ok: false, reason: "format" };
  if (from > to) return { ok: false, reason: "order" };
  if (to > today) return { ok: false, reason: "future" };
  if (daysInRange({ from, to }).length > 366) return { ok: false, reason: "too_long" };
  return { ok: true, range: { from, to } };
}

export type ReportGroup = "day" | "week" | "category" | "product";
export type ReportRow = { key: string; label: string; orders: number; units: number; revenueCents: number };

/** Group the orders in a range for the Reports page (and its CSV export). */
export function buildReport(orders: readonly AnalyticsOrder[], range: DateRange, group: ReportGroup, categoryLabel: (c: string) => string): ReportRow[] {
  const rows = new Map<string, ReportRow>();
  const add = (key: string, label: string, orders: number, units: number, revenueCents: number) => {
    const row = rows.get(key) ?? { key, label, orders: 0, units: 0, revenueCents: 0 };
    row.orders += orders;
    row.units += units;
    row.revenueCents += revenueCents;
    rows.set(key, row);
  };

  if (group === "day") for (const day of daysInRange(range)) add(day, day, 0, 0, 0);

  for (const order of orders) {
    const day = storeDay(order.createdAt);
    if (!inRange(day, range) || !counts(order.status)) continue;
    const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
    if (group === "day") add(day, day, 1, units, order.totalCents);
    else if (group === "week") {
      const monday = addDays(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7));
      add(monday, `Week of ${monday}`, 1, units, order.totalCents);
    } else {
      // Category/product rows use line totals (before tax and delivery).
      const seen = new Set<string>();
      for (const item of order.items) {
        const key = group === "category" ? item.category : item.productId;
        const label = group === "category" ? categoryLabel(item.category) : item.name;
        add(key, label, seen.has(key) ? 0 : 1, item.quantity, item.quantity * item.unitPriceCents);
        seen.add(key);
      }
    }
  }

  const list = [...rows.values()];
  return group === "day" || group === "week" ? list.sort((a, b) => a.key.localeCompare(b.key)) : list.sort((a, b) => b.revenueCents - a.revenueCents);
}

/** Turn rows into CSV text. Quotes every field and doubles inner quotes. */
export function toCsv(header: readonly string[], rows: ReadonlyArray<ReadonlyArray<string | number>>): string {
  const cell = (value: string | number) => {
    const text = String(value);
    // Guard against spreadsheet formula injection (=, +, -, @ at the start).
    const safe = /^[=+\-@]/.test(text) && typeof value === "string" ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}
