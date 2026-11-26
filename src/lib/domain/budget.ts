/**
 * Customer budget limit (the FBLA topic names "customer budget
 * constraints"). A customer may set a spending limit; the cart warns as they
 * approach it and checkout is blocked above it until they remove items or
 * raise the limit. PURE function.
 */

export type BudgetCheck =
  | { status: "no_limit" }
  | { status: "within"; remainingCents: number; percentUsed: number }
  | { status: "over"; overByCents: number; percentUsed: number };

export function checkBudget(totalCents: number, limitCents: number | null | undefined): BudgetCheck {
  if (limitCents === null || limitCents === undefined || limitCents <= 0) return { status: "no_limit" };
  const percentUsed = Math.round((totalCents / limitCents) * 100);
  if (totalCents > limitCents) return { status: "over", overByCents: totalCents - limitCents, percentUsed };
  return { status: "within", remainingCents: limitCents - totalCents, percentUsed };
}
