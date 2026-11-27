import "server-only";
import { addDays, type AnalyticsConsult, type AnalyticsOrder, type AnalyticsRefill, type DateRange } from "@/lib/domain/analytics";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Raw records for owner analytics and reports. The owner's RLS policies
 * allow reading orders, consults and refills; the math happens in
 * src/lib/domain/analytics.ts.
 */
export async function loadAnalyticsData(range: DateRange, today: string): Promise<{
  orders: AnalyticsOrder[];
  consults: AnalyticsConsult[];
  refills: AnalyticsRefill[];
}> {
  const supabase = await createSupabaseServerClient();
  // Read from the earlier of the range start and "a week ago" (for the
  // "this week" tile), plus a day of margin for time-zone edges.
  const start = addDays(range.from < addDays(today, -6) ? range.from : addDays(today, -6), -1);
  const end = addDays(range.to > today ? range.to : today, 1);

  const [orders, consults, refills] = await Promise.all([
    supabase
      .from("orders")
      .select("created_at, total_cents, status, fulfillment, order_items(product_id, quantity, unit_price_cents, products(name, category))")
      .gte("created_at", `${start}T00:00:00Z`)
      .lte("created_at", `${end}T23:59:59Z`)
      .limit(5000),
    supabase.from("consult_requests").select("created_at, decided_at, status"),
    supabase.from("refill_requests").select("status"),
  ]);
  if (orders.error) throw orders.error;

  return {
    orders: (orders.data ?? []).map((o) => ({
      createdAt: o.created_at,
      totalCents: o.total_cents,
      status: o.status,
      fulfillment: o.fulfillment,
      items: o.order_items.map((i) => ({
        productId: i.product_id,
        name: i.products?.name ?? "Unknown product",
        category: i.products?.category ?? "health_essentials",
        quantity: i.quantity,
        unitPriceCents: i.unit_price_cents,
      })),
    })),
    consults: (consults.data ?? []).map((c) => ({ createdAt: c.created_at, decidedAt: c.decided_at, status: c.status })),
    refills: refills.data ?? [],
  };
}
