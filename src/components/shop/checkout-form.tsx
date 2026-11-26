"use client";

import { Lock, Store, Truck } from "lucide-react";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { IDLE_RESULT } from "@/lib/actions/idle";
import { placeOrderAction } from "@/lib/actions/orders";
import { fillTemplate } from "@/lib/domain/db-errors";
import { calculateOrderTotals, type FulfillmentMethod, type PricedLine, type StoreRates } from "@/lib/domain/pricing";
import type { SlotLike } from "@/lib/domain/slots";
import { formatCents } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { cx } from "@/lib/utils";
import { PriceSummary } from "./price-summary";
import { SlotPicker } from "./slot-picker";

/**
 * Checkout form. Switching pickup/delivery re-prices the order instantly
 * (same pricing module as the server). The idempotency key is created once
 * per page load, so a double click or a resend cannot create two orders.
 */
export function CheckoutForm({
  lines,
  rates,
  slots,
  deliveryZips,
  idempotencyKey,
}: {
  lines: PricedLine[];
  rates: StoreRates;
  slots: SlotLike[];
  deliveryZips: string[];
  idempotencyKey: string;
}) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(placeOrderAction, IDLE_RESULT);
  const [method, setMethod] = useState<FulfillmentMethod>("pickup");
  const totals = calculateOrderTotals(lines, method, rates);
  const err = state.fieldErrors ?? {};

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  const options: Array<{ value: FulfillmentMethod; title: string; body: string; icon: React.ReactNode }> = [
    { value: "pickup", title: t.checkout.pickup, body: t.checkout.pickupBody, icon: <Store className="size-5" aria-hidden="true" /> },
    {
      value: "delivery",
      title: t.checkout.delivery,
      body: fillTemplate(t.checkout.deliveryBody, [formatCents(rates.deliveryFeeCents), formatCents(rates.freeDeliveryThresholdCents)]),
      icon: <Truck className="size-5" aria-hidden="true" />,
    },
  ];

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start" noValidate>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <div className="flex min-w-0 flex-col gap-8">
        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="mb-3 text-lg font-semibold">{t.checkout.fulfillmentLegend}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {options.map((option) => (
              <label
                key={option.value}
                className={cx(
                  "flex cursor-pointer gap-3 rounded-[var(--radius-card)] border p-5 transition-colors",
                  "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-action",
                  method === option.value ? "border-action bg-sky-50" : "border-line-strong hover:border-action",
                )}
              >
                <input
                  type="radio"
                  name="fulfillment"
                  value={option.value}
                  checked={method === option.value}
                  onChange={() => setMethod(option.value)}
                  className="mt-1 size-5 accent-[var(--color-action)]"
                />
                <span className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 font-semibold">
                    {option.icon}
                    {option.title}
                  </span>
                  <span className="text-sm text-ink/75">{option.body}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {method === "pickup" ? (
          <SlotPicker slots={slots} error={err.slotId} />
        ) : (
          <div className="flex flex-col gap-4">
            <Field id="line1" label={t.checkout.address} error={err.line1}>
              {(d, invalid) => (
                <Input id="line1" name="line1" autoComplete="address-line1" maxLength={120} aria-describedby={d} aria-invalid={invalid} />
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
              <Field id="city" label={t.checkout.city} error={err.city}>
                {(d, invalid) => (
                  <Input id="city" name="city" defaultValue="Cumming" autoComplete="address-level2" maxLength={60} aria-describedby={d} aria-invalid={invalid} />
                )}
              </Field>
              <Field id="zip" label={t.checkout.zip} hint={fillTemplate(t.checkout.zipHint, [deliveryZips.join(", ")])} error={err.zip}>
                {(d, invalid) => (
                  <Input id="zip" name="zip" inputMode="numeric" autoComplete="postal-code" maxLength={5} aria-describedby={d} aria-invalid={invalid} />
                )}
              </Field>
            </div>
            <Field id="notes" label={t.checkout.notes} hint={t.checkout.notesHint} error={err.notes}>
              {(d, invalid) => <Textarea id="notes" name="notes" maxLength={300} rows={3} aria-describedby={d} aria-invalid={invalid} />}
            </Field>
          </div>
        )}

        <div className="flex gap-3 rounded-[var(--radius-card)] border border-line bg-sky-50 p-5">
          <Lock className="mt-0.5 size-5 shrink-0 text-action" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">{t.checkout.paymentTitle}</h2>
            <p className="text-ink/80">{t.checkout.paymentBody}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 rounded-[var(--radius-card)] border border-line bg-canvas p-6 shadow-soft lg:sticky lg:top-28">
        <h2 className="text-lg font-semibold">{t.checkout.reviewTitle}</h2>
        <PriceSummary totals={totals} t={t} taxRateBps={rates.taxRateBps} />
        <div aria-live="polite">{state.status === "error" && state.message && <Alert tone="danger">{state.message}</Alert>}</div>
        <Button type="submit" size="lg" pending={pending}>
          {pending ? t.checkout.placingOrder : `${t.checkout.placeOrder} · ${formatCents(totals.totalCents)}`}
        </Button>
      </div>
    </form>
  );
}
