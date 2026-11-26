import { fillTemplate } from "@/lib/domain/db-errors";
import { formatTaxRate, type OrderTotals } from "@/lib/domain/pricing";
import { formatCents } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";

/**
 * Subtotal / tax / delivery / total table. Used on the cart, checkout and
 * order pages so totals always look the same everywhere.
 */
export function PriceSummary({
  totals,
  t,
  taxRateBps,
  deliveryLabel,
  totalLabel,
}: {
  totals: Pick<OrderTotals, "subtotalCents" | "taxCents" | "deliveryFeeCents" | "totalCents">;
  t: Dictionary;
  taxRateBps: number;
  /** Text for the delivery row, e.g. "Free pickup" or "$5.99". */
  deliveryLabel?: string;
  totalLabel?: string;
}) {
  return (
    <dl className="tabular flex flex-col gap-3 text-[0.98rem]">
      <div className="flex justify-between gap-4">
        <dt className="text-ink/80">{t.cart.subtotal}</dt>
        <dd>{formatCents(totals.subtotalCents)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-ink/80">{fillTemplate(t.cart.tax, [formatTaxRate(taxRateBps)])}</dt>
        <dd>{formatCents(totals.taxCents)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-ink/80">{t.cart.delivery}</dt>
        <dd>{deliveryLabel ?? (totals.deliveryFeeCents === 0 ? t.cart.pickupFree : formatCents(totals.deliveryFeeCents))}</dd>
      </div>
      <div className="flex justify-between gap-4 border-t border-line pt-3 text-lg font-semibold">
        <dt>{totalLabel ?? t.cart.total}</dt>
        <dd>{formatCents(totals.totalCents)}</dd>
      </div>
    </dl>
  );
}
