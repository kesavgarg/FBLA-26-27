import "server-only";
import type { Category } from "@/lib/domain/catalog";
import type { OrderStatus } from "@/lib/domain/orders";
import type { FulfillmentMethod } from "@/lib/domain/pricing";
import { findAllergyConflict, findInteractions, type InteractionWarning } from "@/lib/domain/safety";
import type { RefillStatus } from "@/lib/domain/workflow";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Reads for the pharmacy staff screens (RLS: staff and owner roles). */

export type StaffOrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  status: OrderStatus;
  fulfillment: FulfillmentMethod;
  totalCents: number;
  itemCount: number;
  createdAt: string;
  pickupAt: string | null;
  hasRx: boolean;
};

export type OrderFilters = { status: OrderStatus | "open" | "all"; fulfillment: FulfillmentMethod | "all"; q: string };

/** Order queue with filters. Search matches order number or customer name. */
export async function listOrdersForStaff(filters: OrderFilters): Promise<StaffOrderRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, status, fulfillment, total_cents, created_at, pickup_slots(starts_at), customer:profiles!orders_customer_id_fkey(full_name), order_items(quantity, prescription_id)",
    )
    .order("created_at", { ascending: filters.status === "open" })
    .limit(200);
  if (filters.status === "open") query = query.in("status", ["received", "preparing", "ready_for_pickup", "out_for_delivery"]);
  else if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.fulfillment !== "all") query = query.eq("fulfillment", filters.fulfillment);
  const { data, error } = await query;
  if (error) throw error;

  const needle = filters.q.trim().toLowerCase();
  return (data ?? [])
    .map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      customerName: row.customer?.full_name ?? "—",
      status: row.status,
      fulfillment: row.fulfillment,
      totalCents: row.total_cents,
      itemCount: row.order_items.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: row.created_at,
      pickupAt: row.pickup_slots?.starts_at ?? null,
      hasRx: row.order_items.some((item) => item.prescription_id),
    }))
    .filter((row) => !needle || row.orderNumber.toLowerCase().includes(needle) || row.customerName.toLowerCase().includes(needle));
}

export type StaffOrderDetail = StaffOrderRow & {
  customerId: string;
  customerPhone: string | null;
  subtotalCents: number;
  taxCents: number;
  deliveryFeeCents: number;
  address: string | null;
  deliveryNotes: string | null;
  cancelReason: string | null;
  items: Array<{ name: string; quantity: number; unitPriceCents: number; ingredient: string | null; rxNumber: string | null; allergyConflict: string | null }>;
  allergies: string[];
  medications: string[];
  interactions: InteractionWarning[];
  messages: Array<{ id: string; body: string; kind: string; createdAt: string; fromStaff: boolean }>;
};

export async function getOrderForStaff(id: string): Promise<StaffOrderDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: o } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, fulfillment, total_cents, subtotal_cents, tax_cents, delivery_fee_cents, created_at, delivery_line1, delivery_city, delivery_zip, delivery_notes, cancel_reason, customer_id, pickup_slots(starts_at), customer:profiles!orders_customer_id_fkey(full_name, phone), order_items(quantity, unit_price_cents, prescription_id, products(name, active_ingredient), prescriptions(rx_number)), messages(id, body, kind, created_at, sender_id)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!o) return null;

  const [allergies, meds] = await Promise.all([
    supabase.from("allergies").select("substance").eq("profile_id", o.customer_id),
    supabase.from("current_medications").select("name, ingredient").eq("profile_id", o.customer_id),
  ]);
  const allergyList = (allergies.data ?? []).map((a) => a.substance);
  const itemIngredients = o.order_items.map((i) => i.products?.active_ingredient).filter((x): x is string => Boolean(x));
  const medIngredients = (meds.data ?? []).map((m) => m.ingredient ?? m.name.split(" ")[0]);

  return {
    id: o.id,
    orderNumber: o.order_number,
    customerName: o.customer?.full_name ?? "—",
    customerId: o.customer_id,
    customerPhone: o.customer?.phone ?? null,
    status: o.status,
    fulfillment: o.fulfillment,
    totalCents: o.total_cents,
    subtotalCents: o.subtotal_cents,
    taxCents: o.tax_cents,
    deliveryFeeCents: o.delivery_fee_cents,
    itemCount: o.order_items.reduce((sum, i) => sum + i.quantity, 0),
    createdAt: o.created_at,
    pickupAt: o.pickup_slots?.starts_at ?? null,
    hasRx: o.order_items.some((i) => i.prescription_id),
    address: o.delivery_line1 ? `${o.delivery_line1}, ${o.delivery_city} ${o.delivery_zip}` : null,
    deliveryNotes: o.delivery_notes,
    cancelReason: o.cancel_reason,
    items: o.order_items.map((i) => ({
      name: i.products?.name ?? "",
      quantity: i.quantity,
      unitPriceCents: i.unit_price_cents,
      ingredient: i.products?.active_ingredient ?? null,
      rxNumber: i.prescriptions?.rx_number ?? null,
      allergyConflict: findAllergyConflict(i.products?.active_ingredient, allergyList),
    })),
    allergies: allergyList,
    medications: (meds.data ?? []).map((m) => m.name),
    interactions: findInteractions([...itemIngredients, ...medIngredients]),
    messages: [...o.messages]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((m) => ({ id: m.id, body: m.body, kind: m.kind, createdAt: m.created_at, fromStaff: m.sender_id !== o.customer_id })),
  };
}

export type StaffRefillRow = {
  id: string;
  status: RefillStatus;
  fulfillment: FulfillmentMethod;
  requestedAt: string;
  pickupAt: string | null;
  patientName: string;
  rxNumber: string;
  productName: string;
  refillsRemaining: number;
  rxStatus: string;
  expiresOn: string;
  staffNote: string | null;
};

export async function listRefillsForStaff(): Promise<StaffRefillRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("refill_requests")
    .select(
      "id, status, fulfillment, requested_at, staff_note, pickup_slots(starts_at), patient:profiles!refill_requests_patient_id_fkey(full_name), prescriptions(rx_number, refills_remaining, status, expires_on, products(name))",
    )
    .order("requested_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    fulfillment: row.fulfillment,
    requestedAt: row.requested_at,
    pickupAt: row.pickup_slots?.starts_at ?? null,
    patientName: row.patient?.full_name ?? "—",
    rxNumber: row.prescriptions?.rx_number ?? "",
    productName: row.prescriptions?.products?.name ?? "",
    refillsRemaining: row.prescriptions?.refills_remaining ?? 0,
    rxStatus: row.prescriptions?.status ?? "",
    expiresOn: row.prescriptions?.expires_on ?? "",
    staffNote: row.staff_note,
  }));
}

export type InventoryRow = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  priceCents: number;
  isActive: boolean;
  requiresRx: boolean;
  quantity: number;
  lowStockThreshold: number;
  updatedAt: string | null;
};

export async function listInventory(): Promise<InventoryRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, category, price_cents, is_active, requires_rx, inventory(quantity, low_stock_threshold, updated_at)")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category as Category,
    priceCents: row.price_cents,
    isActive: row.is_active,
    requiresRx: row.requires_rx,
    quantity: row.inventory?.quantity ?? 0,
    lowStockThreshold: row.inventory?.low_stock_threshold ?? 5,
    updatedAt: row.inventory?.updated_at ?? null,
  }));
}
