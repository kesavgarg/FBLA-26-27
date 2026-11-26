"use client";

import { Wallet } from "lucide-react";
import { startTransition, useActionState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { saveBudgetAction } from "@/lib/actions/cart";
import { IDLE_RESULT } from "@/lib/actions/idle";
import { useI18n } from "@/lib/i18n/provider";

/** Set or remove the customer's spending limit (shown beside the cart). */
export function BudgetForm({ limitCents }: { limitCents: number | null }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(saveBudgetAction, IDLE_RESULT);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const formData = new FormData(event.currentTarget);
    if (submitter?.name === "intent") formData.set("intent", submitter.value);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <div className="flex items-center gap-2">
        <Wallet className="size-5 text-action" aria-hidden="true" />
        <h2 className="font-semibold">{t.cart.budgetTitle}</h2>
      </div>
      <p className="text-sm text-muted">{t.cart.budgetHint}</p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="budget-amount" className="text-sm font-semibold">
            {t.cart.budgetAmount}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true">
              $
            </span>
            <input
              id="budget-amount"
              name="amount"
              inputMode="decimal"
              defaultValue={limitCents ? (limitCents / 100).toFixed(2) : ""}
              aria-invalid={Boolean(state.fieldErrors?.amount)}
              aria-describedby={state.fieldErrors?.amount ? "budget-error" : undefined}
              className="tabular h-11 w-32 rounded-[var(--radius-field)] border border-line-strong pr-3 pl-7"
            />
          </div>
        </div>
        <Button type="submit" name="intent" value="save" variant="secondary" pending={pending}>
          {t.cart.budgetSave}
        </Button>
        {limitCents && (
          <Button type="submit" name="intent" value="clear" variant="quiet">
            {t.cart.budgetClear}
          </Button>
        )}
      </div>
      {state.fieldErrors?.amount && (
        <p id="budget-error" className="text-sm font-medium text-danger">
          {state.fieldErrors.amount}
        </p>
      )}
      <div aria-live="polite">{state.status === "success" && <Alert tone="success">{state.message}</Alert>}</div>
    </form>
  );
}
