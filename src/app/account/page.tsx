import { ChevronRight, Package, Pill, ShieldCheck, ShoppingBag, ShoppingCart } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { OrderStatusBadge } from "@/components/orders/order-tracker";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { getCartCount } from "@/lib/data/cart";
import { listMyOrders, listMyPrescriptions } from "@/lib/data/orders";
import { requireRole } from "@/lib/auth/session";
import { fillTemplate } from "@/lib/domain/db-errors";
import { isOpenOrder } from "@/lib/domain/orders";
import { getRefillEligibility, storeToday } from "@/lib/domain/refills";
import { formatCents } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "My account" };

function ActionCard({ href, icon, title, body, highlight }: { href: string; icon: ReactNode; title: string; body: string; highlight?: boolean }) {
  return (
    <Link
      href={href}
      className={
        "group flex h-full flex-col gap-3 rounded-[var(--radius-card)] border p-6 shadow-soft transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift " +
        (highlight ? "border-sky-300 bg-sky-50" : "border-line bg-canvas")
      }
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-sky-100 text-action">{icon}</span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-ink/80">{body}</p>
    </Link>
  );
}

/** Customer home: quick actions with live counts, recent orders, security. */
export default async function AccountPage() {
  const user = await requireRole(["customer", "staff", "doctor", "owner"], "/account");
  const { t, locale } = await getDictionary();
  const [orders, prescriptions, cartCount] = await Promise.all([
    listMyOrders(),
    listMyPrescriptions(user.id, locale),
    getCartCount(),
  ]);

  const today = storeToday();
  const refillable = prescriptions.filter(
    (rx) =>
      getRefillEligibility(
        { patientId: user.id, status: rx.status, expiresOn: rx.expiresOn, refillsRemaining: rx.refillsRemaining, hasOpenRefill: Boolean(rx.openRefill) },
        user.id,
        today,
      ) === "eligible",
  ).length;
  const openOrders = orders.filter((order) => isOpenOrder(order.status));
  const a = t.dashboard.actions;

  return (
    <>
      <WorkspaceHeader user={user} title={`${t.account.greeting}, ${user.fullName.split(" ")[0]}`} />

      <section className="flex flex-col gap-4" aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="text-xl font-semibold">
          {t.dashboard.quickActions}
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <ActionCard href="/shop" icon={<ShoppingBag className="size-5" aria-hidden="true" />} title={a.shop.title} body={a.shop.body} />
          <ActionCard
            href="/account/prescriptions"
            icon={<Pill className="size-5" aria-hidden="true" />}
            title={refillable ? a.refill.title : a.refillNone.title}
            body={refillable ? fillTemplate(a.refill.body, [String(refillable)]) : a.refillNone.body}
            highlight={refillable > 0}
          />
          <ActionCard
            href="/account/orders"
            icon={<Package className="size-5" aria-hidden="true" />}
            title={openOrders.length ? a.orders.title : a.ordersNone.title}
            body={openOrders.length ? fillTemplate(a.orders.body, [String(openOrders.length)]) : a.ordersNone.body}
            highlight={openOrders.length > 0}
          />
          {cartCount > 0 ? (
            <ActionCard href="/cart" icon={<ShoppingCart className="size-5" aria-hidden="true" />} title={a.cart.title} body={fillTemplate(a.cart.body, [String(cartCount)])} highlight />
          ) : (
            <ActionCard href="/account/security" icon={<ShieldCheck className="size-5" aria-hidden="true" />} title={t.account.securityTitle} body={t.account.securityBody} />
          )}
        </div>
      </section>

      {orders.length > 0 && (
        <section className="flex flex-col gap-4" aria-labelledby="recent-orders">
          <div className="flex items-center justify-between gap-4">
            <h2 id="recent-orders" className="text-xl font-semibold">
              {t.dashboard.recentOrders}
            </h2>
            <Link href="/account/orders" className="font-semibold text-action hover:underline">
              {t.dashboard.seeAllOrders}
            </Link>
          </div>
          <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
            {orders.slice(0, 3).map((order) => (
              <li key={order.id}>
                <Link href={`/account/orders/${order.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-sky-50">
                  <span className="tabular flex-1 font-medium">{order.orderNumber}</span>
                  <OrderStatusBadge status={order.status} t={t} />
                  <span className="tabular hidden w-24 text-right sm:block">{formatCents(order.totalCents)}</span>
                  <ChevronRight className="size-5 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
