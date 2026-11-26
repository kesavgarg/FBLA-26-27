"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { addProductAction, updateProductAction } from "@/lib/actions/staff";
import type { InventoryRow } from "@/lib/data/staff";
import { CATEGORIES } from "@/lib/domain/catalog";
import { en } from "@/lib/i18n/en";
import { ActionForm } from "./action-form";

const small = "h-11 w-24 rounded-[var(--radius-field)] border border-line-strong px-3 tabular";

/** One editable inventory row: stock, price, low-stock level, available. */
export function InventoryRowForm({ product }: { product: InventoryRow }) {
  return (
    <ActionForm action={updateProductAction} hidden={{ productId: product.id }} className="flex flex-wrap items-end gap-3">
      {(state, pending) => (
        <>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Stock
            <input name="quantity" inputMode="numeric" defaultValue={product.quantity} className={small} aria-invalid={Boolean(state.fieldErrors?.quantity)} aria-label={`Stock for ${product.name}`} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Price ($)
            <input name="price" inputMode="decimal" defaultValue={(product.priceCents / 100).toFixed(2)} className={small} aria-invalid={Boolean(state.fieldErrors?.price)} aria-label={`Price for ${product.name}`} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Low at
            <input name="threshold" inputMode="numeric" defaultValue={product.lowStockThreshold} className={small} aria-label={`Low-stock level for ${product.name}`} />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="active" defaultChecked={product.isActive} className="size-5 accent-[var(--color-action)]" />
            Available
          </label>
          <Button type="submit" variant="secondary" pending={pending}>
            Save
          </Button>
          {state.fieldErrors && <p className="basis-full text-sm font-medium text-danger">{Object.values(state.fieldErrors)[0]}</p>}
        </>
      )}
    </ActionForm>
  );
}

/** Add a new over-the-counter product (prescription items can't be added). */
export function AddProductForm() {
  return (
    <ActionForm action={addProductAction} className="grid gap-4 md:grid-cols-2">
      {(state, pending) => {
        const err = state.fieldErrors ?? {};
        return (
          <>
            <Field id="np-name" label="Name (English)" error={err.name}>
              {(d, i) => <Input id="np-name" name="name" maxLength={80} aria-describedby={d} aria-invalid={i} />}
            </Field>
            <Field id="np-name-es" label="Name (Spanish, optional)" error={err.nameEs}>
              {(d, i) => <Input id="np-name-es" name="nameEs" maxLength={80} aria-describedby={d} aria-invalid={i} />}
            </Field>
            <Field id="np-desc" label="Description (English)" error={err.description}>
              {(d, i) => <Textarea id="np-desc" name="description" maxLength={600} rows={2} aria-describedby={d} aria-invalid={i} />}
            </Field>
            <Field id="np-desc-es" label="Description (Spanish, optional)" error={err.descriptionEs}>
              {(d, i) => <Textarea id="np-desc-es" name="descriptionEs" maxLength={600} rows={2} aria-describedby={d} aria-invalid={i} />}
            </Field>
            <Field id="np-cat" label="Category" error={err.category}>
              {(d, i) => (
                <Select id="np-cat" name="category" defaultValue="health_essentials" aria-describedby={d} aria-invalid={i}>
                  {CATEGORIES.filter((c) => c !== "prescription").map((c) => (
                    <option key={c} value={c}>
                      {en.shop.categories[c]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field id="np-ingredient" label="Main ingredient (optional, for allergy checks)" error={err.ingredient}>
              {(d, i) => <Input id="np-ingredient" name="ingredient" maxLength={60} aria-describedby={d} aria-invalid={i} />}
            </Field>
            <Field id="np-price" label="Price ($)" error={err.price}>
              {(d, i) => <Input id="np-price" name="price" inputMode="decimal" placeholder="9.99" aria-describedby={d} aria-invalid={i} />}
            </Field>
            <Field id="np-qty" label="Starting stock" error={err.quantity}>
              {(d, i) => <Input id="np-qty" name="quantity" inputMode="numeric" placeholder="20" aria-describedby={d} aria-invalid={i} />}
            </Field>
            <Button type="submit" pending={pending} className="self-start md:col-span-2" icon={<Plus className="size-4" aria-hidden="true" />}>
              Add product
            </Button>
          </>
        );
      }}
    </ActionForm>
  );
}
