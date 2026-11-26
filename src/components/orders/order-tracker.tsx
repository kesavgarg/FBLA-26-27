import { Check, XCircle } from "lucide-react";
import { trackerProgress, trackerSteps, type OrderStatus } from "@/lib/domain/orders";
import type { FulfillmentMethod } from "@/lib/domain/pricing";
import type { Dictionary } from "@/lib/i18n";
import { Badge } from "@/components/ui/card";
import { cx } from "@/lib/utils";

/** Received → Being prepared → Ready / Out for delivery → Completed. */
export function OrderTracker({ status, method, t }: { status: OrderStatus; method: FulfillmentMethod; t: Dictionary }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-danger/25 bg-danger-soft p-5">
        <XCircle className="size-6 text-danger" aria-hidden="true" />
        <p className="font-semibold">{t.orders.cancelled}</p>
      </div>
    );
  }
  const steps = trackerSteps(method);
  const current = trackerProgress(status, method);

  return (
    <ol className="grid gap-4 sm:grid-cols-4 sm:gap-0" aria-label={t.orders.trackerTitle}>
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step} className="relative flex items-center gap-3 sm:flex-col sm:items-start sm:gap-3 sm:pr-4">
            {/* connecting line (desktop) */}
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={cx("absolute top-5 left-10 hidden h-0.5 w-[calc(100%-2.5rem)] sm:block", index < current ? "bg-action" : "bg-line")}
              />
            )}
            <span
              className={cx(
                "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
                done && "border-action bg-action text-white",
                active && "border-action bg-sky-100 text-action",
                !done && !active && "border-line bg-canvas text-muted",
              )}
            >
              {done ? <Check className="size-5" aria-hidden="true" /> : index + 1}
            </span>
            <span className={cx("font-medium", active ? "text-ink" : done ? "text-ink/80" : "text-muted")}>
              {t.orders.status[step]}
              {active && <span className="sr-only"> (current)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Small coloured label for an order status (icon-free, words carry the meaning). */
export function OrderStatusBadge({ status, t }: { status: OrderStatus; t: Dictionary }) {
  const tone =
    status === "cancelled" ? "danger" : status === "completed" ? "neutral" : status === "ready_for_pickup" || status === "out_for_delivery" ? "success" : "info";
  return <Badge tone={tone}>{t.orders.status[status]}</Badge>;
}
