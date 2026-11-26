import { AlertTriangle, ChevronRight, ClipboardList, Pill, Search } from "lucide-react";
import Link from "next/link";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { OrderStatusBadge } from "@/components/orders/order-tracker";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat";
import { requireRole } from "@/lib/auth/session";
import { listInventory, listOrdersForStaff, listRefillsForStaff, type OrderFilters } from "@/lib/data/staff";
import { ORDER_STATUSES } from "@/lib/domain/orders";
import { formatStoreDateTime } from "@/lib/domain/slots";
import { formatCents } from "@/lib/format";
import { en } from "@/lib/i18n/en";

export const metadata = { title: "Staff · Orders" };

/** Read filters from the URL, accepting only known values. */
function parseFilters(params: Record<string, string | string[] | undefined>): OrderFilters {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const status = one(params.status);
  const fulfillment = one(params.fulfillment);
  return {
    status: status === "all" || (ORDER_STATUSES as readonly string[]).includes(status) ? (status as OrderFilters["status"]) : "open",
    fulfillment: fulfillment === "pickup" || fulfillment === "delivery" ? fulfillment : "all",
    q: one(params.q).slice(0, 60),
  };
}

/** Order queue: open orders oldest first, with filters and search. */
export default async function StaffOrdersPage({ searchParams }: PageProps<"/staff">) {
  const user = await requireRole(["staff", "owner"], "/staff");
  const filters = parseFilters(await searchParams);
  const [orders, refills, inventory] = await Promise.all([listOrdersForStaff(filters), listRefillsForStaff(), listInventory()]);
  const openRefills = refills.filter((r) => ["requested", "verified", "preparing", "ready"].includes(r.status)).length;
  const lowStock = inventory.filter((p) => p.isActive && p.quantity <= p.lowStockThreshold).length;
  const selectClass = "min-h-11 rounded-[var(--radius-field)] border border-line-strong bg-canvas px-3";

  return (
    <>
      <WorkspaceHeader user={user} title="Order queue" description="Prepare orders oldest first. Every status change is saved, logged and shown to the customer." />
      <div className="grid gap-6 sm:grid-cols-3">
        <StatTile label="Orders shown" value={orders.length} icon={<ClipboardList className="size-4" aria-hidden="true" />} />
        <Link href="/staff/refills" className="rounded-[var(--radius-card)]">
          <StatTile label="Refills to handle" value={openRefills} icon={<Pill className="size-4" aria-hidden="true" />} />
        </Link>
        <Link href="/staff/inventory" className="rounded-[var(--radius-card)]">
          <StatTile label="Low or out of stock" value={lowStock} icon={<AlertTriangle className="size-4" aria-hidden="true" />} />
        </Link>
      </div>

      <form action="/staff" method="get" className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-sky-50 p-4 md:flex-row md:items-end">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Status
          <select name="status" defaultValue={filters.status} className={selectClass}>
            <option value="open">Open (not finished)</option>
            <option value="all">All</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {en.orders.status[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Method
          <select name="fulfillment" defaultValue={filters.fulfillment} className={selectClass}>
            <option value="all">Pickup and delivery</option>
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm font-semibold">
          Search order number or customer
          <span className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input name="q" defaultValue={filters.q} maxLength={60} className={`${selectClass} w-full pl-9`} />
          </span>
        </label>
        <button type="submit" className={buttonClasses("primary")}>
          Apply
        </button>
      </form>

      {orders.length === 0 ? (
        <p className="text-muted">No orders match these filters.</p>
      ) : (
        <div className="relative overflow-x-auto rounded-[var(--radius-card)] border border-line">
          <table className="w-full min-w-[46rem] text-left">
            <thead className="bg-sky-50 text-sm text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Order</th>
                <th scope="col" className="px-4 py-3 font-semibold">Customer</th>
                <th scope="col" className="px-4 py-3 font-semibold">Method</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Total</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-sky-50">
                  <td className="px-4 py-3">
                    <Link href={`/staff/orders/${order.id}`} className="tabular font-semibold text-action hover:underline">
                      {order.orderNumber}
                    </Link>
                    <p className="text-xs text-muted">{formatStoreDateTime(order.createdAt, "en")}</p>
                  </td>
                  <td className="px-4 py-3">{order.customerName}</td>
                  <td className="px-4 py-3">
                    {order.fulfillment === "pickup" ? `Pickup ${order.pickupAt ? formatStoreDateTime(order.pickupAt, "en") : ""}` : "Delivery"}
                    {order.hasRx && <Badge tone="warning" className="ml-2">Rx</Badge>}
                  </td>
                  <td className="px-4 py-3"><OrderStatusBadge status={order.status} t={en} /></td>
                  <td className="tabular px-4 py-3 text-right">{formatCents(order.totalCents)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/staff/orders/${order.id}`} aria-label={`Open ${order.orderNumber}`}>
                      <ChevronRight className="inline size-5 text-muted" aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
