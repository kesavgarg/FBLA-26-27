import { describe, expect, it } from "vitest";
import { checkBudget } from "@/lib/domain/budget";
import { fillTemplate, parseDbError } from "@/lib/domain/db-errors";
import { getStockStatus, maxOrderableQuantity } from "@/lib/domain/inventory";
import { canCustomerCancel, trackerProgress, trackerSteps } from "@/lib/domain/orders";
import { calculateOrderTotals, calculateTax, formatTaxRate, type StoreRates } from "@/lib/domain/pricing";
import { getRefillEligibility, type RefillCandidate } from "@/lib/domain/refills";
import { checkoutSchema, quantitySchema } from "@/lib/validation/ordering";

const RATES: StoreRates = { taxRateBps: 700, deliveryFeeCents: 599, freeDeliveryThresholdCents: 3500 };

describe("calculateOrderTotals — brief scenario 12: checkout totals", () => {
  it("adds subtotal, 7% tax on OTC items and no fee for pickup", () => {
    const totals = calculateOrderTotals(
      [
        { unitPriceCents: 799, quantity: 2, taxable: true }, // $15.98
        { unitPriceCents: 1299, quantity: 1, taxable: true }, // $12.99
      ],
      "pickup",
      RATES,
    );
    expect(totals).toMatchObject({ itemCount: 3, subtotalCents: 2897, taxCents: 203, deliveryFeeCents: 0, totalCents: 3100 });
  });

  it("does not tax prescription items", () => {
    const totals = calculateOrderTotals(
      [
        { unitPriceCents: 1200, quantity: 1, taxable: false },
        { unitPriceCents: 1000, quantity: 1, taxable: true },
      ],
      "pickup",
      RATES,
    );
    expect(totals.taxableSubtotalCents).toBe(1000);
    expect(totals.taxCents).toBe(70);
    expect(totals.totalCents).toBe(2270);
  });

  it("charges delivery below the free threshold and shows how far away it is", () => {
    const totals = calculateOrderTotals([{ unitPriceCents: 2000, quantity: 1, taxable: true }], "delivery", RATES);
    expect(totals.deliveryFeeCents).toBe(599);
    expect(totals.amountToFreeDeliveryCents).toBe(1500);
    expect(totals.totalCents).toBe(2000 + 140 + 599);
  });

  it("makes delivery free at exactly the threshold", () => {
    const totals = calculateOrderTotals([{ unitPriceCents: 3500, quantity: 1, taxable: true }], "delivery", RATES);
    expect(totals.deliveryFeeCents).toBe(0);
    expect(totals.amountToFreeDeliveryCents).toBe(0);
  });

  it("rounds tax to the nearest cent, halves up", () => {
    expect(calculateTax(50, 700)).toBe(4); // 3.5 → 4
    expect(calculateTax(49, 700)).toBe(3); // 3.43 → 3
  });

  it("rejects zero, negative and fractional quantities", () => {
    for (const quantity of [0, -1, 1.5]) {
      expect(() => calculateOrderTotals([{ unitPriceCents: 100, quantity, taxable: true }], "pickup", RATES)).toThrow();
    }
  });

  it("formats the tax rate", () => {
    expect(formatTaxRate(700)).toBe("7%");
    expect(formatTaxRate(725)).toBe("7.25%");
  });
});

describe("stock rules", () => {
  it("classifies stock levels", () => {
    expect(getStockStatus(0, 5)).toBe("out_of_stock");
    expect(getStockStatus(5, 5)).toBe("low_stock");
    expect(getStockStatus(6, 5)).toBe("in_stock");
  });

  it("caps orderable quantity by stock, per-line limit and Rx rule", () => {
    expect(maxOrderableQuantity(0, 10, false)).toBe(0);
    expect(maxOrderableQuantity(2, 10, false)).toBe(2);
    expect(maxOrderableQuantity(50, 10, false)).toBe(10);
    expect(maxOrderableQuantity(50, 10, true)).toBe(1);
  });
});

describe("budget limit", () => {
  it("handles no limit, under and over", () => {
    expect(checkBudget(5000, null)).toEqual({ status: "no_limit" });
    expect(checkBudget(4000, 5000)).toEqual({ status: "within", remainingCents: 1000, percentUsed: 80 });
    expect(checkBudget(5600, 5000)).toEqual({ status: "over", overByCents: 600, percentUsed: 112 });
  });
});

describe("refill eligibility — brief scenario 9: expired prescription", () => {
  const base: RefillCandidate = {
    patientId: "margaret",
    status: "active",
    expiresOn: "2027-06-01",
    refillsRemaining: 3,
    hasOpenRefill: false,
  };
  const today = "2026-11-26";

  it("allows a valid refill", () => {
    expect(getRefillEligibility(base, "margaret", today)).toBe("eligible");
  });
  it("refuses someone else's prescription first", () => {
    expect(getRefillEligibility({ ...base, status: "inactive" }, "daniel", today)).toBe("wrong_patient");
  });
  it("refuses inactive, expired, no-refill and in-progress prescriptions", () => {
    expect(getRefillEligibility({ ...base, status: "denied" }, "margaret", today)).toBe("inactive");
    expect(getRefillEligibility({ ...base, expiresOn: "2026-11-25" }, "margaret", today)).toBe("expired");
    expect(getRefillEligibility({ ...base, refillsRemaining: 0 }, "margaret", today)).toBe("no_refills");
    expect(getRefillEligibility({ ...base, hasOpenRefill: true }, "margaret", today)).toBe("in_progress");
  });
  it("still allows a refill on its expiry date", () => {
    expect(getRefillEligibility({ ...base, expiresOn: today }, "margaret", today)).toBe("eligible");
  });
});

describe("order status rules", () => {
  it("uses different tracker steps for pickup and delivery", () => {
    expect(trackerSteps("pickup")).toContain("ready_for_pickup");
    expect(trackerSteps("delivery")).toContain("out_for_delivery");
  });
  it("reports progress and cancellation", () => {
    expect(trackerProgress("preparing", "pickup")).toBe(1);
    expect(trackerProgress("cancelled", "pickup")).toBe(-1);
  });
  it("lets customers cancel only before preparing", () => {
    expect(canCustomerCancel("received")).toBe(true);
    expect(canCustomerCancel("preparing")).toBe(false);
  });
});

describe("database error codes", () => {
  it("parses codes with details", () => {
    expect(parseDbError("NOT_ENOUGH_STOCK:Thermometer|2")).toEqual({ key: "NOT_ENOUGH_STOCK", details: ["Thermometer", "2"] });
    expect(parseDbError("RX_EXPIRED")).toEqual({ key: "RX_EXPIRED", details: [] });
    expect(parseDbError("something unexpected")).toEqual({ key: "UNKNOWN", details: [] });
  });
  it("fills message templates", () => {
    expect(fillTemplate("Only {1} {0} left", ["thermometers", "2"])).toBe("Only 2 thermometers left");
  });
});

describe("checkout and quantity validation", () => {
  const zips = ["30040", "30041"];
  const key = "2b1c0d0e-4a5b-4c6d-8e7f-8091a2b3c4d5";

  it("rejects negative, fractional, non-numeric and over-limit quantities", () => {
    const schema = quantitySchema(10);
    expect(schema.safeParse("3").success).toBe(true);
    expect(schema.safeParse("-1").success).toBe(false);
    expect(schema.safeParse("1.5").success).toBe(false);
    expect(schema.safeParse("abc").success).toBe(false);
    expect(schema.safeParse("11").success).toBe(false);
  });

  it("requires a slot for pickup", () => {
    expect(checkoutSchema(zips).safeParse({ fulfillment: "pickup", slotId: "", idempotencyKey: key }).success).toBe(false);
  });

  it("requires a real address inside the delivery area", () => {
    const schema = checkoutSchema(zips);
    expect(schema.safeParse({ fulfillment: "delivery", line1: "12 Elm", zip: "30040", idempotencyKey: key }).success).toBe(true);
    expect(schema.safeParse({ fulfillment: "delivery", line1: "12 Elm", zip: "3004", idempotencyKey: key }).success).toBe(false);
    expect(schema.safeParse({ fulfillment: "delivery", line1: "12 Elm", zip: "90210", idempotencyKey: key }).success).toBe(false);
    expect(schema.safeParse({ fulfillment: "delivery", line1: "", zip: "30040", idempotencyKey: key }).success).toBe(false);
    expect(
      schema.safeParse({ fulfillment: "delivery", line1: "12 Elm", zip: "30040", notes: "x".repeat(301), idempotencyKey: key })
        .success,
    ).toBe(false);
  });
});
