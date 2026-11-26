"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { removeCartLineAction, updateCartLineAction } from "@/lib/actions/cart";
import { IDLE_RESULT } from "@/lib/actions/idle";
import { fillTemplate } from "@/lib/domain/db-errors";
import type { Category } from "@/lib/domain/catalog";
import { formatCents } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { ProductVisual } from "./product-visual";

type Line = {
  productId: string;
  slug: string;
  name: string;
  category: Category;
  priceCents: number;
  quantity: number;
  requiresRx: boolean;
  rxNumber: string | null;
  maxQuantity: number;
};

/** One editable cart line: picture, name, quantity, line total, remove. */
export function CartLineRow({ line }: { line: Line }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(updateCartLineAction, IDLE_RESULT);
  const [quantity, setQuantity] = useState(String(line.quantity));
  const qtyId = `qty-${line.productId}`;

  function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <li className="grid grid-cols-[88px_1fr] gap-4 py-5 sm:grid-cols-[112px_1fr_auto] sm:items-center sm:gap-6">
      <Link href={`/shop/${line.slug}`} className="overflow-hidden rounded-[var(--radius-field)] border border-line">
        <ProductVisual slug={line.slug} category={line.category} label={line.name} />
      </Link>

      <div className="flex min-w-0 flex-col gap-1">
        <Link href={`/shop/${line.slug}`} className="font-semibold text-ink hover:text-action">
          {line.name}
        </Link>
        <p className="tabular text-sm text-muted">{fillTemplate(t.cart.each, [formatCents(line.priceCents)])}</p>
        {line.rxNumber && <p className="text-sm font-medium text-warning">{fillTemplate(t.cart.rxLine, [line.rxNumber])}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {line.requiresRx ? (
            <span className="text-sm text-muted">
              {t.shop.quantity}: 1
            </span>
          ) : (
            <form onSubmit={update} className="flex items-center gap-2" noValidate>
              <input type="hidden" name="productId" value={line.productId} />
              <label htmlFor={qtyId} className="sr-only">
                {fillTemplate(t.cart.quantityFor, [line.name])}
              </label>
              <input
                id={qtyId}
                name="quantity"
                inputMode="numeric"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value.replace(/[^\d-]/g, "").slice(0, 3))}
                aria-invalid={Boolean(state.fieldErrors?.quantity || state.status === "error")}
                aria-describedby={`${qtyId}-msg`}
                className="tabular h-11 w-16 rounded-[var(--radius-field)] border border-line-strong text-center font-semibold"
              />
              <button
                type="submit"
                disabled={pending || quantity === String(line.quantity)}
                className="min-h-11 rounded-[var(--radius-pill)] px-3 text-sm font-semibold text-action hover:bg-sky-50 disabled:opacity-40"
              >
                {t.cart.update}
              </button>
            </form>
          )}
          <form action={removeCartLineAction}>
            <input type="hidden" name="productId" value={line.productId} />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-pill)] px-3 text-sm font-semibold text-danger hover:bg-danger-soft"
              aria-label={fillTemplate(t.cart.removeItem, [line.name])}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {t.cart.remove}
            </button>
          </form>
        </div>
        <p id={`${qtyId}-msg`} aria-live="polite" className="text-sm font-medium text-danger empty:hidden">
          {state.fieldErrors?.quantity ?? (state.status === "error" ? state.message : "")}
        </p>
      </div>

      <p className="tabular col-start-2 text-lg font-semibold sm:col-start-3 sm:text-right">
        {formatCents(line.priceCents * line.quantity)}
      </p>
    </li>
  );
}
