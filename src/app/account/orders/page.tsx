import { ChevronRight, PackageOpen } from "lucide-react";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/orders/order-tracker";
import { ButtonLink } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { listMyOrders, type OrderSummary } from "@/lib/data/orders";
import { fillTemplate } from "@/lib/domain/db-errors";
import { isOpenOrder } from "@/lib/domain/orders";
import { formatCents } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "Orders" };

function OrderRow({ order, t, locale }: { order: OrderSummary; t: Dictionary; locale: "en" | "es" }) {
  const placed = new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { dateStyle: "medium" }).format(new Date(order.createdAt));
  return (
    <li>
      <Link
        href={`/account/orders/${order.id}`}
        aria-label={fillTemplate(t.orders.view, [order.orderNumber])}
        className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-canvas p-5 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lift"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
          <p className="tabular font-semibold">{order.orderNumber}</p>
          <p className="text-sm text-muted">
            {fillTemplate(t.orders.placedOn, [placed])} ·{" "}
            {order.itemCount === 1 ? t.orders.itemsOne : fillTemplate(t.orders.items, [String(order.itemCount)])}
          </p>
        </div>
        <OrderStatusBadge status={order.status} t={t} />
        <p className="tabular hidden w-24 text-right font-semibold sm:block">{formatCents(order.totalCents)}</p>
        <ChevronRight className="size-5 text-muted" aria-hidden="true" />
      </Link>
    </li>
  );
}

/** Order history split into current (still moving) and past orders. */
export default async function OrdersPage() {
  await requireRole(["customer", "staff", "doctor", "owner"], "/account/orders");
  const { t, locale } = await getDictionary();
  const orders = await listMyOrders();
  const current = orders.filter((order) => isOpenOrder(order.status));
  const past = orders.filter((order) => !isOpenOrder(order.status));

  return (
    <>
      <header className="flex flex-col gap-2 border-b border-line pb-8">
        <h1 className="text-[2.1rem] font-semibold tracking-tight">{t.orders.title}</h1>
        <p className="text-lg text-ink/80">{t.orders.intro}</p>
      </header>

      {orders.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <PackageOpen className="size-10 text-action" aria-hidden="true" />
          <p className="text-lg">{t.orders.none}</p>
          <ButtonLink href="/shop">{t.cart.browse}</ButtonLink>
        </div>
      ) : (
        <>
          {current.length > 0 && (
            <section className="flex flex-col gap-4" aria-labelledby="current-orders">
              <h2 id="current-orders" className="text-xl font-semibold">
                {t.orders.current}
              </h2>
              <ul className="flex flex-col gap-3">
                {current.map((order) => (
                  <OrderRow key={order.id} order={order} t={t} locale={locale} />
                ))}
              </ul>
            </section>
          )}
          {past.length > 0 && (
            <section className="flex flex-col gap-4" aria-labelledby="past-orders">
              <h2 id="past-orders" className="text-xl font-semibold">
                {t.orders.past}
              </h2>
              <ul className="flex flex-col gap-3">
                {past.map((order) => (
                  <OrderRow key={order.id} order={order} t={t} locale={locale} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
