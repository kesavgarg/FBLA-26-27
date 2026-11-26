import { ShoppingBag } from "lucide-react";
import { BudgetForm } from "@/components/shop/budget-form";
import { CartLineRow } from "@/components/shop/cart-line-row";
import { PriceSummary } from "@/components/shop/price-summary";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getBudgetLimit, getCart } from "@/lib/data/cart";
import { getStoreSettings } from "@/lib/data/catalog";
import { checkBudget } from "@/lib/domain/budget";
import { fillTemplate } from "@/lib/domain/db-errors";
import { maxOrderableQuantity } from "@/lib/domain/inventory";
import { calculateOrderTotals } from "@/lib/domain/pricing";
import { formatCents } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "Cart" };

/**
 * Cart. Totals are calculated here for display with the same pricing
 * module the checkout uses; place_order() recalculates them from database
 * prices when the order is saved.
 */
export default async function CartPage() {
  const user = await requireRole(["customer", "staff", "doctor", "owner"], "/cart");
  const { t, locale } = await getDictionary();
  const [lines, settings, limit] = await Promise.all([getCart(locale), getStoreSettings(), getBudgetLimit(user.id)]);

  if (lines.length === 0) {
    return (
      <div className="wrap flex flex-1 flex-col items-start justify-center gap-5 py-20">
        <ShoppingBag className="size-10 text-action" aria-hidden="true" />
        <h1 className="text-[2.1rem] font-semibold tracking-tight">{t.cart.emptyTitle}</h1>
        <p className="max-w-prose text-lg text-ink/80">{t.cart.emptyBody}</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/shop" size="lg">
            {t.cart.browse}
          </ButtonLink>
          <ButtonLink href="/account/prescriptions" size="lg" variant="secondary">
            {t.refills.title}
          </ButtonLink>
        </div>
      </div>
    );
  }

  // Pickup totals (delivery fee is shown as a range until checkout).
  const totals = calculateOrderTotals(
    lines.map((line) => ({ unitPriceCents: line.priceCents, quantity: line.quantity, taxable: !line.requiresRx })),
    "pickup",
    settings,
  );
  const budget = checkBudget(totals.totalCents, limit);
  const stockProblem = lines.find((line) => line.quantity > line.stock);

  return (
    <div className="wrap flex flex-1 flex-col gap-8 py-10 lg:py-14">
      <h1 className="text-[2.1rem] font-semibold tracking-tight">{t.cart.title}</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
        <ul className="divide-y divide-line border-y border-line">
          {lines.map((line) => (
            <CartLineRow
              key={line.productId}
              line={{ ...line, maxQuantity: maxOrderableQuantity(line.stock, settings.maxLineQuantity, line.requiresRx) }}
            />
          ))}
        </ul>

        <div className="flex flex-col gap-6 lg:sticky lg:top-28">
          <Card className="flex flex-col gap-5 p-6">
            <h2 className="text-lg font-semibold">{t.cart.summary}</h2>
            <PriceSummary
              totals={totals}
              t={t}
              taxRateBps={settings.taxRateBps}
              deliveryLabel={fillTemplate(t.cart.deliveryEstimate, [
                formatCents(settings.deliveryFeeCents),
                formatCents(settings.freeDeliveryThresholdCents),
              ])}
            />
            {stockProblem && (
              <Alert tone="danger">
                {fillTemplate(t.dbErrors.NOT_ENOUGH_STOCK, [stockProblem.name, String(stockProblem.stock)])}
              </Alert>
            )}
            {budget.status === "over" && (
              <Alert tone="danger">
                {fillTemplate(t.cart.budgetOver, [formatCents(budget.overByCents), formatCents(limit ?? 0)])}
              </Alert>
            )}
            {budget.status === "within" && (
              <Alert tone={budget.percentUsed >= 90 ? "warning" : "info"}>
                {fillTemplate(t.cart.budgetWithin, [formatCents(budget.remainingCents), formatCents(limit ?? 0)])}
              </Alert>
            )}
            {budget.status === "over" || stockProblem ? (
              <span
                aria-disabled="true"
                className="inline-flex min-h-13 cursor-not-allowed items-center justify-center rounded-[var(--radius-pill)] bg-line px-7 font-semibold text-muted"
              >
                {t.cart.checkout}
              </span>
            ) : (
              <ButtonLink href="/checkout" size="lg">
                {t.cart.checkout}
              </ButtonLink>
            )}
            <ButtonLink href="/shop" variant="quiet">
              {t.cart.continueShopping}
            </ButtonLink>
          </Card>
          <Card className="p-6">
            <BudgetForm limitCents={limit} />
          </Card>
        </div>
      </div>
    </div>
  );
}
