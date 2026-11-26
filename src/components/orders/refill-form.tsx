"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { SlotPicker } from "@/components/shop/slot-picker";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { IDLE_RESULT } from "@/lib/actions/idle";
import { requestRefillAction } from "@/lib/actions/orders";
import type { FulfillmentMethod } from "@/lib/domain/pricing";
import type { SlotLike } from "@/lib/domain/slots";
import { useI18n } from "@/lib/i18n/provider";
import { cx } from "@/lib/utils";

/** "Request refill" → choose pickup time or delivery → send. */
export function RefillForm({ prescriptionId, slots }: { prescriptionId: string; slots: SlotLike[] }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(requestRefillAction, IDLE_RESULT);
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<FulfillmentMethod>("pickup");

  if (state.status === "success") return <Alert tone="success">{state.message}</Alert>;
  if (!open) return <Button onClick={() => setOpen(true)}>{t.refills.request}</Button>;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-[var(--radius-card)] border border-line bg-sky-50 p-5" noValidate>
      <input type="hidden" name="prescriptionId" value={prescriptionId} />
      <fieldset className="flex min-w-0 flex-wrap gap-2">
        <legend className="mb-2 text-[0.94rem] font-semibold">{t.checkout.fulfillmentLegend}</legend>
        {(["pickup", "delivery"] as const).map((value) => (
          <label
            key={value}
            className={cx(
              "flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] border px-4 font-medium has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-action",
              method === value ? "border-action bg-canvas" : "border-line-strong",
            )}
          >
            <input type="radio" name="fulfillment" value={value} checked={method === value} onChange={() => setMethod(value)} className="accent-[var(--color-action)]" />
            {value === "pickup" ? t.checkout.pickup : t.checkout.delivery}
          </label>
        ))}
      </fieldset>
      {method === "pickup" && <SlotPicker slots={slots} error={state.fieldErrors?.slotId} />}
      <div aria-live="polite">{state.status === "error" && state.message && <Alert tone="danger">{state.message}</Alert>}</div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" pending={pending}>
          {pending ? t.refills.submitting : t.refills.submit}
        </Button>
        <Button variant="quiet" onClick={() => setOpen(false)}>
          {t.refills.close}
        </Button>
      </div>
    </form>
  );
}
