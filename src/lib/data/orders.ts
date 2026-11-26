import "server-only";
import type { Category } from "@/lib/domain/catalog";
import type { OrderStatus } from "@/lib/domain/orders";
import type { FulfillmentMethod } from "@/lib/domain/pricing";
import type { Locale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Reads for orders, pickup slots and prescriptions (RLS: own rows only). */

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  fulfillment: FulfillmentMethod;
  totalCents: number;
  itemCount: number;
  createdAt: string;
  pickupAt: string | null;
};

export type OrderDetail = OrderSummary & {
  subtotalCents: number;
  taxCents: number;
  deliveryFeeCents: number;
  deliveryLine1: string | null;
  deliveryCity: string | null;
  deliveryZip: string | null;
  cancelReason: string | null;
  items: Array<{ productId: string; slug: string; name: string; category: Category; quantity: number; unitPriceCents: number; rxNumber: string | null }>;
  messages: Array<{ id: string; body: string; kind: string; createdAt: string }>;
};

const SUMMARY_FIELDS =
  "id, order_number, status, fulfillment, total_cents, created_at, pickup_slots(starts_at), order_items(quantity)";

export async function listMyOrders(): Promise<OrderSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("orders")
    .select(SUMMARY_FIELDS)
    .eq("customer_id", auth.user?.id ?? "")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    fulfillment: row.fulfillment,
    totalCents: row.total_cents,
    itemCount: row.order_items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: row.created_at,
    pickupAt: row.pickup_slots?.starts_at ?? null,
  }));
}

export async function getMyOrder(id: string, locale: Locale): Promise<OrderDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, order_number, status, fulfillment, total_cents, created_at, pickup_slots(starts_at),
       subtotal_cents, tax_cents, delivery_fee_cents, delivery_line1, delivery_city, delivery_zip, cancel_reason,
       order_items(product_id, quantity, unit_price_cents, products(slug, name, name_es, category), prescriptions(rx_number)),
       messages(id, body, kind, created_at)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  return {
    id: data.id,
    orderNumber: data.order_number,
    status: data.status,
    fulfillment: data.fulfillment,
    totalCents: data.total_cents,
    itemCount: data.order_items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: data.created_at,
    pickupAt: data.pickup_slots?.starts_at ?? null,
    subtotalCents: data.subtotal_cents,
    taxCents: data.tax_cents,
    deliveryFeeCents: data.delivery_fee_cents,
    deliveryLine1: data.delivery_line1,
    deliveryCity: data.delivery_city,
    deliveryZip: data.delivery_zip,
    cancelReason: data.cancel_reason,
    items: data.order_items.map((item) => ({
      productId: item.product_id,
      slug: item.products?.slug ?? "",
      name: (locale === "es" ? item.products?.name_es : item.products?.name) ?? "",
      category: (item.products?.category ?? "health_essentials") as Category,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
      rxNumber: item.prescriptions?.rx_number ?? null,
    })),
    messages: [...data.messages]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((message) => ({ id: message.id, body: message.body, kind: message.kind, createdAt: message.created_at })),
  };
}

export type PickupSlot = { id: string; startsAt: string; remaining: number };

/**
 * Open pickup slots for the coming week. First asks the database to create
 * any missing slots inside store hours (Sundays stay closed).
 */
export async function listOpenSlots(): Promise<PickupSlot[]> {
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("ensure_pickup_slots", { p_days: 7 });
  const earliest = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("pickup_slots")
    .select("id, starts_at, capacity, booked_count")
    .gte("starts_at", earliest)
    .order("starts_at")
    .limit(200);
  return (data ?? []).map((slot) => ({ id: slot.id, startsAt: slot.starts_at, remaining: slot.capacity - slot.booked_count }));
}

export type MyPrescription = {
  id: string;
  rxNumber: string;
  productId: string;
  productSlug: string;
  productName: string;
  directions: string;
  refillsRemaining: number;
  status: "pending_approval" | "active" | "inactive" | "denied";
  expiresOn: string;
  firstFilledAt: string | null;
  prescriberName: string | null;
  openRefill: { id: string; status: string; fulfillment: FulfillmentMethod; pickupAt: string | null } | null;
};

export async function listMyPrescriptions(userId: string, locale: Locale): Promise<MyPrescription[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("prescriptions")
    .select(
      "id, rx_number, product_id, directions, refills_remaining, status, expires_on, first_filled_at, products(slug, name, name_es), prescriber:profiles!prescriptions_prescriber_id_fkey(full_name), refill_requests(id, status, fulfillment, requested_at, pickup_slots(starts_at))",
    )
    .eq("patient_id", userId)
    .order("expires_on", { ascending: false });
  if (error) throw error;

  const OPEN = ["requested", "verified", "preparing", "ready"];
  return (data ?? []).map((row) => {
    const open = row.refill_requests.find((request) => OPEN.includes(request.status));
    return {
      id: row.id,
      rxNumber: row.rx_number,
      productId: row.product_id,
      productSlug: row.products?.slug ?? "",
      productName: (locale === "es" ? row.products?.name_es : row.products?.name) ?? "",
      directions: row.directions,
      refillsRemaining: row.refills_remaining,
      status: row.status,
      expiresOn: row.expires_on,
      firstFilledAt: row.first_filled_at,
      prescriberName: row.prescriber?.full_name ?? null,
      openRefill: open
        ? { id: open.id, status: open.status, fulfillment: open.fulfillment, pickupAt: open.pickup_slots?.starts_at ?? null }
        : null,
    };
  });
}
