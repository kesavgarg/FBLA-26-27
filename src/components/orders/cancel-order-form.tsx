"use client";

import { startTransition, useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { IDLE_RESULT } from "@/lib/actions/idle";
import { cancelOrderAction } from "@/lib/actions/orders";
import { fillTemplate } from "@/lib/domain/db-errors";
import { useI18n } from "@/lib/i18n/provider";

/** Two-step cancel: ask first, then confirm. Cancelling is not undoable. */
export function CancelOrderForm({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(cancelOrderAction, IDLE_RESULT);
  const [asking, setAsking] = useState(false);

  if (state.status === "success") return <Alert tone="success">{state.message}</Alert>;

  return (
    <div className="flex flex-col gap-3">
      {!asking ? (
        <>
          <Button variant="danger" onClick={() => setAsking(true)}>
            {t.orders.cancel}
          </Button>
          <p className="text-sm text-muted">{t.orders.cancelHint}</p>
        </>
      ) : (
        <div role="alertdialog" aria-labelledby="cancel-q" className="flex flex-col gap-3 rounded-[var(--radius-field)] border border-danger/30 bg-danger-soft p-4">
          <p id="cancel-q" className="font-medium">
            {fillTemplate(t.orders.cancelQuestion, [orderNumber])}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              pending={pending}
              onClick={() => {
                const formData = new FormData();
                formData.set("orderId", orderId);
                startTransition(() => action(formData));
              }}
            >
              {t.orders.cancelConfirm}
            </Button>
            <Button variant="secondary" onClick={() => setAsking(false)} autoFocus>
              {t.orders.cancelKeep}
            </Button>
          </div>
        </div>
      )}
      <div aria-live="polite">{state.status === "error" && <Alert tone="danger">{state.message}</Alert>}</div>
    </div>
  );
}
