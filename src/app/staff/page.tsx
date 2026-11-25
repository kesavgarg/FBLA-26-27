import { AlertTriangle, ClipboardList, Package, Pill } from "lucide-react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { StatTile } from "@/components/ui/stat";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Staff" };

/** Staff overview. Counts come straight from the database through RLS. */
export default async function StaffHomePage() {
  const user = await requireRole(["staff", "owner"], "/staff");
  const supabase = await createSupabaseServerClient();

  const [openOrders, openRefills, products, stock] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["received", "preparing"]),
    supabase.from("refill_requests").select("id", { count: "exact", head: true }).in("status", ["requested", "verified", "preparing"]),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("inventory").select("quantity, low_stock_threshold"),
  ]);
  const lowStock = (stock.data ?? []).filter((row) => row.quantity <= row.low_stock_threshold).length;

  return (
    <>
      <WorkspaceHeader user={user} title="Pharmacy workspace" description="Orders waiting to be prepared, refills to verify and stock to watch." />
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Open orders" value={openOrders.count ?? 0} icon={<ClipboardList className="size-4" aria-hidden="true" />} />
        <StatTile label="Refills to handle" value={openRefills.count ?? 0} icon={<Pill className="size-4" aria-hidden="true" />} />
        <StatTile label="Active products" value={products.count ?? 0} icon={<Package className="size-4" aria-hidden="true" />} />
        <StatTile label="Low or out of stock" value={lowStock} icon={<AlertTriangle className="size-4" aria-hidden="true" />} />
      </div>
    </>
  );
}
