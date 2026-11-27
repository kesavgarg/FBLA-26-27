import { describe, expect, it } from "vitest";
import { addDays, buildReport, computeDashboard, daysInRange, toCsv, validateRange, type AnalyticsOrder } from "@/lib/domain/analytics";

// Noon UTC = morning in Georgia, so the store day equals the UTC date here.
const order = (day: string, total: number, extra: Partial<AnalyticsOrder> = {}): AnalyticsOrder => ({
  createdAt: `${day}T16:00:00Z`,
  totalCents: total,
  status: "completed",
  fulfillment: "pickup",
  items: [{ productId: "p1", name: "Vitamin D3", category: "vitamins", quantity: 2, unitPriceCents: 500 }],
  ...extra,
});

const today = "2026-11-26";
const range = { from: "2026-11-20", to: "2026-11-26" };

describe("computeDashboard", () => {
  const orders = [
    order("2026-11-26", 1000),
    order("2026-11-26", 2000, { fulfillment: "delivery" }),
    order("2026-11-24", 1500, { items: [{ productId: "p2", name: "Bandages", category: "first_aid", quantity: 5, unitPriceCents: 300 }] }),
    order("2026-11-25", 9999, { status: "cancelled" }),
    order("2026-11-10", 4000), // outside the range
  ];
  const consults = [
    { createdAt: "2026-11-25T10:00:00Z", decidedAt: "2026-11-25T14:00:00Z", status: "approved" },
    { createdAt: "2026-11-24T10:00:00Z", decidedAt: "2026-11-24T12:00:00Z", status: "denied" },
    { createdAt: "2026-11-26T10:00:00Z", decidedAt: null, status: "submitted" },
  ];
  const refills = [{ status: "completed" }, { status: "requested" }, { status: "rejected" }, { status: "cancelled" }];
  const m = computeDashboard(orders, consults, refills, range, today);

  it("counts orders, excluding cancelled ones from revenue", () => {
    expect(m.ordersInRange).toBe(3);
    expect(m.cancelledInRange).toBe(1);
    expect(m.revenueCents).toBe(4500);
    expect(m.averageOrderCents).toBe(1500);
    expect(m.ordersToday).toBe(2);
    expect(m.ordersThisWeek).toBe(3);
  });

  it("fills every day of the range, including days with no orders", () => {
    expect(m.byDay).toHaveLength(7);
    expect(m.byDay.find((d) => d.day === "2026-11-21")?.orders).toBe(0);
    expect(m.byDay.find((d) => d.day === "2026-11-26")).toEqual({ day: "2026-11-26", orders: 2, revenueCents: 3000 });
  });

  it("ranks products by units and splits pickup / delivery", () => {
    expect(m.topProducts[0]).toMatchObject({ name: "Bandages", units: 5 });
    expect(m.fulfillment).toEqual({ pickup: 2, delivery: 1 });
  });

  it("averages consult approval time and refill completion", () => {
    expect(m.averageApprovalHours).toBe(3); // (4 + 2) / 2
    expect(m.approvalRate).toBe(50);
    expect(m.refillCompletionRate).toBe(33); // 1 of 3 (cancelled excluded)
  });

  it("handles no data without dividing by zero", () => {
    const empty = computeDashboard([], [], [], range, today);
    expect(empty.averageOrderCents).toBe(0);
    expect(empty.averageApprovalHours).toBeNull();
    expect(empty.refillCompletionRate).toBeNull();
  });
});

describe("date helpers and range validation", () => {
  it("adds days across month ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(daysInRange({ from: "2026-11-29", to: "2026-12-02" })).toEqual(["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"]);
  });
  it("rejects impossible, reversed, future and over-long ranges", () => {
    expect(validateRange("2026-02-30", today, today)).toEqual({ ok: false, reason: "format" });
    expect(validateRange("2026-11-26", "2026-11-01", today)).toEqual({ ok: false, reason: "order" });
    expect(validateRange("2026-11-01", "2026-12-31", today)).toEqual({ ok: false, reason: "future" });
    expect(validateRange("2024-01-01", today, today)).toEqual({ ok: false, reason: "too_long" });
    expect(validateRange("2026-11-01", today, today).ok).toBe(true);
  });
});

describe("reports", () => {
  const orders = [order("2026-11-23", 1070), order("2026-11-25", 2140)];
  it("groups by week starting Monday", () => {
    const rows = buildReport(orders, range, "week", (c) => c);
    expect(rows.map((r) => r.key)).toEqual(["2026-11-23"]); // Nov 23 2026 is a Monday
    expect(rows[0].orders).toBe(2);
  });
  it("groups by category using line totals", () => {
    const rows = buildReport(orders, range, "category", (c) => c.toUpperCase());
    expect(rows).toEqual([{ key: "vitamins", label: "VITAMINS", orders: 2, units: 4, revenueCents: 2000 }]);
  });
  it("writes safe CSV (quotes, and no spreadsheet formulas)", () => {
    expect(toCsv(["Name", "Total"], [['Say "hi"', 12], ["=SUM(A1)", 3]])).toBe('"Name","Total"\r\n"Say ""hi""","12"\r\n"\'=SUM(A1)","3"');
  });
});
