/**
 * Stock rules shown to customers and staff. PURE functions.
 * The database re-checks stock with row locks at checkout; these functions
 * only decide what to SHOW (badges, the largest quantity a selector allows).
 */

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

/** Classify a stock count against its low-stock threshold. */
export function getStockStatus(quantity: number, lowStockThreshold: number): StockStatus {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= lowStockThreshold) return "low_stock";
  return "in_stock";
}

/**
 * The most a customer may put in the cart for one product: limited by the
 * stock on hand and by the store's per-line limit. Prescription items are
 * always exactly one fill.
 */
export function maxOrderableQuantity(stock: number, perLineLimit: number, requiresRx: boolean): number {
  if (stock <= 0) return 0;
  if (requiresRx) return 1;
  return Math.min(stock, perLineLimit);
}
