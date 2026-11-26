import { ArrowLeft, MapPin, MessageSquare, PartyPopper, Store } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelOrderForm } from "@/components/orders/cancel-order-form";
import { OrderStatusBadge, OrderTracker } from "@/components/orders/order-tracker";
import { PriceSummary } from "@/components/shop/price-summary";
import { ProductVisual } from "@/components/shop/product-visual";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getStoreSettings } from "@/lib/data/catalog";
import { getMyOrder } from "@/lib/data/orders";
import { fillTemplate } from "@/lib/domain/db-errors";
import { canCustomerCancel } from "@/lib/domain/orders";
import { formatStoreDateTime } from "@/lib/domain/slots";
import { formatCents } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "Order" };

/** One order: tracker, pickup/delivery details, items, totals, updates, cancel. */
export default async function OrderPage({ params, searchParams }: PageProps<"/account/orders/[id]">) {
  const { id } = await params;
  const justPlaced = (await searchParams).placed === "1";
  await requireRole(["customer", "staff", "doctor", "owner"], `/account/orders/${id}`);
  const { t, locale } = await getDictionary();
  // RLS returns nothing for someone else's order, so this also blocks snooping.
  const [order, settings] = await Promise.all([getMyOrder(id, locale), getStoreSettings()]);
  if (!order) notFound();

  return (
    <>
      <Link href="/account/orders" className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-action hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.orders.title}
      </Link>

      {justPlaced && (
        <div className="flex items-start gap-4 rounded-[var(--radius-card)] border border-success/25 bg-success-soft p-6">
          <PartyPopper className="size-7 shrink-0 text-success" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-semibold">{t.orders.confirmedTitle}</h1>
            <p className="text-ink/85">{t.orders.confirmedBody}</p>
          </div>
        </div>
      )}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted">{t.orders.number}</p>
          {justPlaced ? (
            <p className="tabular text-[2rem] font-semibold tracking-tight">{order.orderNumber}</p>
          ) : (
            <h1 className="tabular text-[2rem] font-semibold tracking-tight">{order.orderNumber}</h1>
          )}
          <p className="text-muted">
            {fillTemplate(t.orders.placedOn, [formatStoreDateTime(order.createdAt, locale)])}
          </p>
        </div>
        <OrderStatusBadge status={order.status} t={t} />
      </header>

      <Card className="flex flex-col gap-6 p-6 sm:p-8">
        <h2 className="text-lg font-semibold">{t.orders.trackerTitle}</h2>
        <OrderTracker status={order.status} method={order.fulfillment} t={t} />
        <p className="flex items-center gap-2 text-ink/85">
          {order.fulfillment === "pickup" ? <Store className="size-5 text-action" aria-hidden="true" /> : <MapPin className="size-5 text-action" aria-hidden="true" />}
          {order.fulfillment === "pickup"
            ? fillTemplate(t.orders.pickupAt, [order.pickupAt ? formatStoreDateTime(order.pickupAt, locale) : "—"]) + " · 116 W. Maple St."
            : fillTemplate(t.orders.deliverTo, [`${order.deliveryLine1}, ${order.deliveryCity} ${order.deliveryZip}`])}
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-start">
        <Card className="p-6 sm:p-8">
          <ul className="divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.productId} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="w-16 shrink-0 overflow-hidden rounded-[var(--radius-field)] border border-line">
                  <ProductVisual slug={item.slug} category={item.category} label={item.name} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="tabular text-sm text-muted">
                    {item.quantity} × {formatCents(item.unitPriceCents)}
                    {item.rxNumber && ` · ${fillTemplate(t.cart.rxLine, [item.rxNumber])}`}
                  </p>
                </div>
                <p className="tabular font-semibold">{formatCents(item.quantity * item.unitPriceCents)}</p>
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4 p-6">
            <PriceSummary totals={order} t={t} taxRateBps={settings.taxRateBps} totalLabel={t.orders.total} />
            <p className="text-sm text-muted">{t.orders.simulatedPayment}</p>
          </Card>
          {canCustomerCancel(order.status) && (
            <Card className="p-6">
              <CancelOrderForm orderId={order.id} orderNumber={order.orderNumber} />
            </Card>
          )}
        </div>
      </div>

      <section className="flex flex-col gap-4" aria-labelledby="updates">
        <h2 id="updates" className="flex items-center gap-2 text-xl font-semibold">
          <MessageSquare className="size-5 text-action" aria-hidden="true" />
          {t.orders.updates}
        </h2>
        {order.messages.length === 0 ? (
          <p className="text-muted">{t.orders.noUpdates}</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {order.messages.map((message) => (
              <li key={message.id} className="rounded-[var(--radius-field)] border border-line bg-sky-50 px-4 py-3">
                <p>{message.body}</p>
                <p className="text-sm text-muted">{formatStoreDateTime(message.createdAt, locale)}</p>
              </li>
            ))}
          </ol>
        )}
        {order.status === "cancelled" && order.cancelReason && <Alert tone="info">{order.cancelReason}</Alert>}
      </section>
    </>
  );
}
