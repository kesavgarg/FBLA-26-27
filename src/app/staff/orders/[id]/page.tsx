import { ArrowLeft, MapPin, ShieldAlert, ShieldCheck, Store } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusBadge, OrderTracker } from "@/components/orders/order-tracker";
import { OrderMessageForm, OrderStatusControls } from "@/components/staff/order-controls";
import { Alert } from "@/components/ui/alert";
import { Badge, Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getOrderForStaff } from "@/lib/data/staff";
import { formatStoreDateTime } from "@/lib/domain/slots";
import { formatCents } from "@/lib/format";
import { en } from "@/lib/i18n/en";

export const metadata = { title: "Staff · Order" };

/** One order for the pharmacist: safety check, items, status, messages. */
export default async function StaffOrderPage({ params }: PageProps<"/staff/orders/[id]">) {
  const { id } = await params;
  await requireRole(["staff", "owner"], `/staff/orders/${id}`);
  const order = await getOrderForStaff(id);
  if (!order) notFound();
  const conflicts = order.items.filter((item) => item.allergyConflict);

  return (
    <>
      <Link href="/staff" className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-action hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Order queue
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="tabular text-[2rem] font-semibold tracking-tight">{order.orderNumber}</h1>
          <p className="text-muted">
            {order.customerName}
            {order.customerPhone ? ` · ${order.customerPhone} (fictional)` : ""} · placed {formatStoreDateTime(order.createdAt, "en")}
          </p>
        </div>
        <OrderStatusBadge status={order.status} t={en} />
      </header>

      <Card className="flex flex-col gap-6 p-6 sm:p-8">
        <OrderTracker status={order.status} method={order.fulfillment} t={en} />
        <p className="flex items-center gap-2">
          {order.fulfillment === "pickup" ? <Store className="size-5 text-action" aria-hidden="true" /> : <MapPin className="size-5 text-action" aria-hidden="true" />}
          {order.fulfillment === "pickup"
            ? `Pickup ${order.pickupAt ? formatStoreDateTime(order.pickupAt, "en") : ""}`
            : `Deliver to ${order.address}${order.deliveryNotes ? ` — “${order.deliveryNotes}”` : ""}`}
        </p>
        {order.status === "cancelled" && order.cancelReason && <Alert tone="info" title="Cancelled">{order.cancelReason}</Alert>}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_26rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              {conflicts.length || order.interactions.length ? (
                <ShieldAlert className="size-5 text-danger" aria-hidden="true" />
              ) : (
                <ShieldCheck className="size-5 text-success" aria-hidden="true" />
              )}
              Safety check
            </h2>
            {conflicts.length === 0 && order.interactions.length === 0 && (
              <Alert tone="success">No allergy matches or interaction cautions for this order (demo tables).</Alert>
            )}
            {conflicts.map((item) => (
              <Alert key={item.name} tone="danger" title="Allergy match">
                {item.name} contains {item.ingredient}; the customer lists an allergy to {item.allergyConflict}.
              </Alert>
            ))}
            {order.interactions.map((warning) => (
              <Alert key={warning.between.join("+")} tone="warning" title={`Interaction caution: ${warning.between.join(" + ")}`}>
                {warning.note}
              </Alert>
            ))}
            <p className="text-sm text-muted">
              Allergies: {order.allergies.length ? order.allergies.join(", ") : "none on file"} · Medicines: {order.medications.length ? order.medications.join(", ") : "none on file"}
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 text-lg font-semibold">Items</h2>
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.name} className="flex items-center gap-4 py-3">
                  <span className="tabular w-10 font-semibold">{item.quantity}×</span>
                  <span className="flex-1">
                    {item.name}
                    {item.rxNumber && <Badge tone="warning" className="ml-2">{item.rxNumber}</Badge>}
                  </span>
                  <span className="tabular">{formatCents(item.quantity * item.unitPriceCents)}</span>
                </li>
              ))}
            </ul>
            <dl className="tabular mt-4 flex flex-col gap-1 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatCents(order.subtotalCents)}</dd></div>
              <div className="flex justify-between"><dt>Tax</dt><dd>{formatCents(order.taxCents)}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd>{formatCents(order.deliveryFeeCents)}</dd></div>
              <div className="flex justify-between text-base font-semibold"><dt>Total (simulated payment)</dt><dd>{formatCents(order.totalCents)}</dd></div>
            </dl>
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-28">
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-lg font-semibold">Update status</h2>
            <OrderStatusControls orderId={order.id} status={order.status} method={order.fulfillment} />
          </Card>
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-lg font-semibold">Messages</h2>
            {order.messages.length === 0 ? (
              <p className="text-muted">No messages yet.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {order.messages.map((m) => (
                  <li key={m.id} className={`rounded-[var(--radius-field)] px-3 py-2 ${m.fromStaff ? "bg-sky-50" : "bg-canvas border border-line"}`}>
                    <p>{m.body}</p>
                    <p className="text-xs text-muted">{formatStoreDateTime(m.createdAt, "en")}</p>
                  </li>
                ))}
              </ol>
            )}
            <OrderMessageForm orderId={order.id} />
          </Card>
        </div>
      </div>
    </>
  );
}
