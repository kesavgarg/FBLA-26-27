/**
 * Pricing rules for an order. PURE functions: no database, no UI.
 *
 * All money is in whole cents (integers), so 0.1 + 0.2 rounding problems
 * cannot happen. The database function place_order() applies the same rules
 * when it saves the order; tests check the two agree.
 *
 * Business rules (store settings, editable by the owner):
 *   - Sales tax applies to over-the-counter items only. Georgia generally
 *     exempts prescription drugs. Rate is in basis points (700 = 7.00%).
 *   - Delivery costs a flat fee unless the subtotal reaches the
 *     free-delivery threshold. Pickup is always free.
 */

export type FulfillmentMethod = "pickup" | "delivery";

export type PricedLine = {
  unitPriceCents: number;
  quantity: number;
  /** False for prescription items (tax exempt). */
  taxable: boolean;
};

export type StoreRates = {
  taxRateBps: number;
  deliveryFeeCents: number;
  freeDeliveryThresholdCents: number;
};

export type OrderTotals = {
  itemCount: number;
  subtotalCents: number;
  taxableSubtotalCents: number;
  taxCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  /** How much more to spend for free delivery (0 when already free). */
  amountToFreeDeliveryCents: number;
};

/** Tax on a taxable amount, rounded to the nearest cent (halves round up). */
export function calculateTax(taxableCents: number, taxRateBps: number): number {
  return Math.round((taxableCents * taxRateBps) / 10_000);
}

/** Delivery fee for an order: free for pickup or above the threshold. */
export function calculateDeliveryFee(subtotalCents: number, method: FulfillmentMethod, rates: StoreRates): number {
  if (method === "pickup") return 0;
  return subtotalCents >= rates.freeDeliveryThresholdCents ? 0 : rates.deliveryFeeCents;
}

/**
 * Add up an order. Loops over the lines once, keeping two running totals:
 * everything, and just the taxable (non-prescription) part.
 */
export function calculateOrderTotals(lines: readonly PricedLine[], method: FulfillmentMethod, rates: StoreRates): OrderTotals {
  let itemCount = 0;
  let subtotalCents = 0;
  let taxableSubtotalCents = 0;

  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new RangeError(`Invalid quantity: ${line.quantity}`);
    }
    const lineTotal = line.unitPriceCents * line.quantity;
    itemCount += line.quantity;
    subtotalCents += lineTotal;
    if (line.taxable) taxableSubtotalCents += lineTotal;
  }

  const taxCents = calculateTax(taxableSubtotalCents, rates.taxRateBps);
  const deliveryFeeCents = calculateDeliveryFee(subtotalCents, method, rates);
  const amountToFreeDeliveryCents =
    method === "delivery" ? Math.max(0, rates.freeDeliveryThresholdCents - subtotalCents) : 0;

  return {
    itemCount,
    subtotalCents,
    taxableSubtotalCents,
    taxCents,
    deliveryFeeCents,
    totalCents: subtotalCents + taxCents + deliveryFeeCents,
    amountToFreeDeliveryCents,
  };
}

/** Basis points → "7%" or "7.25%" for display. */
export function formatTaxRate(taxRateBps: number): string {
  return `${Number((taxRateBps / 100).toFixed(2))}%`;
}
