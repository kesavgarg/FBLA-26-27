"use client";

import { Minus, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { addToCartAction } from "@/lib/actions/cart";
import { IDLE_RESULT } from "@/lib/actions/idle";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Quantity stepper + Add to cart. The − and + buttons stay inside the
 * allowed range (1 … max); typing is checked again on the server.
 */
export function AddToCartForm({
  productId,
  max,
  prescriptionId,
}: {
  productId: string;
  /** Largest quantity allowed (stock and per-order limit). */
  max: number;
  prescriptionId?: string;
}) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(addToCartAction, IDLE_RESULT);
  const [quantity, setQuantity] = useState("1");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  const numeric = Number(quantity) || 1;
  const step = (delta: number) => setQuantity(String(Math.min(max, Math.max(1, numeric + delta))));

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="productId" value={productId} />
      {prescriptionId && <input type="hidden" name="prescriptionId" value={prescriptionId} />}

      <div className="flex flex-wrap items-end gap-3">
        {max > 1 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qty" className="text-[0.94rem] font-semibold">
              {t.shop.quantity}
            </label>
            <div className="flex items-center rounded-[var(--radius-pill)] border border-line-strong">
              <button
                type="button"
                onClick={() => step(-1)}
                disabled={numeric <= 1}
                className="flex size-12 items-center justify-center rounded-full text-ink hover:bg-sky-50 disabled:opacity-40"
              >
                <Minus className="size-4" aria-hidden="true" />
                <span className="sr-only">−1</span>
              </button>
              <input
                id="qty"
                name="quantity"
                inputMode="numeric"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value.replace(/[^\d]/g, "").slice(0, 2))}
                aria-invalid={Boolean(state.fieldErrors?.quantity)}
                aria-describedby={state.fieldErrors?.quantity ? "qty-error" : undefined}
                className="tabular h-12 w-14 bg-transparent text-center text-lg font-semibold focus:outline-none"
              />
              <button
                type="button"
                onClick={() => step(1)}
                disabled={numeric >= max}
                className="flex size-12 items-center justify-center rounded-full text-ink hover:bg-sky-50 disabled:opacity-40"
              >
                <Plus className="size-4" aria-hidden="true" />
                <span className="sr-only">+1</span>
              </button>
            </div>
          </div>
        )}
        {max <= 1 && <input type="hidden" name="quantity" value="1" />}
        <Button type="submit" size="lg" pending={pending} icon={<ShoppingBag className="size-5" aria-hidden="true" />}>
          {pending ? t.shop.addingToCart : t.shop.addToCart}
        </Button>
      </div>

      {state.fieldErrors?.quantity && (
        <p id="qty-error" className="text-sm font-medium text-danger">
          {state.fieldErrors.quantity}
        </p>
      )}
      <div aria-live="polite">
        {state.status === "success" && (
          <Alert tone="success">
            {state.message}{" "}
            <Link href="/cart" className="font-semibold text-action underline">
              {t.shop.viewCart}
            </Link>
          </Alert>
        )}
        {state.status === "error" && state.message && <Alert tone="danger">{state.message}</Alert>}
      </div>
    </form>
  );
}
