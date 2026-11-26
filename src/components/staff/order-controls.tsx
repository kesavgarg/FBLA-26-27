"use client";

import { ArrowRight, Send, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { sendOrderMessageAction, setOrderStatusAction } from "@/lib/actions/staff";
import type { OrderStatus } from "@/lib/domain/orders";
import type { FulfillmentMethod } from "@/lib/domain/pricing";
import { nextOrderStatus, staffCanCancelOrder } from "@/lib/domain/workflow";
import { en } from "@/lib/i18n/en";
import { ActionForm } from "./action-form";

/** The next-status button, plus cancel with a required reason. */
export function OrderStatusControls({ orderId, status, method }: { orderId: string; status: OrderStatus; method: FulfillmentMethod }) {
  const next = nextOrderStatus(status, method);
  const [cancelling, setCancelling] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {next && (
        <ActionForm action={setOrderStatusAction} hidden={{ orderId, status: next }} className="flex flex-col gap-3">
          {(_, pending) => (
            <Button type="submit" size="lg" pending={pending}>
              Mark as “{en.orders.status[next]}”
              <ArrowRight className="size-5" aria-hidden="true" />
            </Button>
          )}
        </ActionForm>
      )}
      {staffCanCancelOrder(status) &&
        (cancelling ? (
          <ActionForm action={setOrderStatusAction} hidden={{ orderId, status: "cancelled" }} className="flex flex-col gap-3 rounded-[var(--radius-field)] border border-danger/30 bg-danger-soft p-4">
            {(state, pending) => (
              <>
                <label htmlFor="cancel-reason" className="font-semibold">
                  Reason (the customer will see this)
                </label>
                <Textarea id="cancel-reason" name="reason" maxLength={300} rows={2} aria-invalid={Boolean(state.fieldErrors?.reason)} />
                {state.fieldErrors?.reason && <p className="text-sm font-medium text-danger">{state.fieldErrors.reason}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" variant="danger" pending={pending}>
                    Cancel order and restock
                  </Button>
                  <Button variant="secondary" onClick={() => setCancelling(false)}>
                    Keep order
                  </Button>
                </div>
              </>
            )}
          </ActionForm>
        ) : (
          <Button variant="quiet" className="self-start text-danger" onClick={() => setCancelling(true)} icon={<XCircle className="size-4" aria-hidden="true" />}>
            Cancel this order…
          </Button>
        ))}
      {!next && !staffCanCancelOrder(status) && <p className="text-muted">This order is finished.</p>}
    </div>
  );
}

/** Send a message the customer sees on their order page. */
export function OrderMessageForm({ orderId }: { orderId: string }) {
  return (
    <ActionForm action={sendOrderMessageAction} hidden={{ orderId }} className="flex flex-col gap-3">
      {(state, pending) => (
        <>
          <label htmlFor="order-message" className="font-semibold">
            Message the customer
          </label>
          <Textarea id="order-message" name="body" maxLength={1000} rows={3} aria-invalid={Boolean(state.fieldErrors?.body)} />
          {state.fieldErrors?.body && <p className="text-sm font-medium text-danger">{state.fieldErrors.body}</p>}
          <Button type="submit" variant="secondary" pending={pending} className="self-start" icon={<Send className="size-4" aria-hidden="true" />}>
            Send message
          </Button>
        </>
      )}
    </ActionForm>
  );
}
