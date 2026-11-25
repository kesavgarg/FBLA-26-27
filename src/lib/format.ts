/**
 * Display formatting helpers. Money is stored as whole cents everywhere and
 * only turned into dollars here, at the very last moment.
 */
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** 1299 → "$12.99" */
export function formatCents(cents: number): string {
  return usd.format(cents / 100);
}
