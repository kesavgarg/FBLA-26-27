import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { AddProductForm, InventoryRowForm } from "@/components/staff/inventory-forms";
import { Alert } from "@/components/ui/alert";
import { Badge, Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { listInventory } from "@/lib/data/staff";
import { getStockStatus } from "@/lib/domain/inventory";
import { en } from "@/lib/i18n/en";

export const metadata = { title: "Staff · Inventory" };

/**
 * Inventory: low-stock alerts first, then every product with editable
 * stock, price and availability, then a form to add a product. Each save
 * runs staff_update_product(), which writes an audit-log entry.
 */
export default async function InventoryPage() {
  await requireRole(["staff", "owner"], "/staff/inventory");
  const products = await listInventory();
  const alerts = products.filter((p) => p.isActive && getStockStatus(p.quantity, p.lowStockThreshold) !== "in_stock");

  return (
    <>
      <div>
        <h1 className="text-[2rem] font-semibold tracking-tight">Inventory</h1>
        <p className="text-lg text-ink/80">Update stock and prices, hide products, and see what needs reordering. Prices are fictional.</p>
      </div>

      {alerts.length > 0 && (
        <Alert tone="warning" title={`${alerts.length} products low or out of stock`}>
          <ul className="mt-1 flex flex-wrap gap-2">
            {alerts.map((p) => (
              <li key={p.id}>
                <Badge tone={p.quantity === 0 ? "danger" : "warning"}>
                  <AlertTriangle className="size-3.5" aria-hidden="true" />
                  {p.name}: {p.quantity}
                </Badge>
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-canvas">
        {products.map((product) => {
          const status = getStockStatus(product.quantity, product.lowStockThreshold);
          return (
            <li key={product.id} className="flex flex-col gap-3 px-5 py-4 xl:flex-row xl:items-center xl:gap-6">
              <div className="min-w-0 xl:w-80">
                <Link href={`/shop/${product.slug}`} className="font-semibold hover:text-action">
                  {product.name}
                </Link>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className="text-sm text-muted">{en.shop.categories[product.category]}</span>
                  {!product.isActive && <Badge tone="neutral">Hidden</Badge>}
                  {product.requiresRx && <Badge tone="warning">Rx</Badge>}
                  {status === "out_of_stock" && <Badge tone="danger">Out</Badge>}
                  {status === "low_stock" && <Badge tone="warning">Low</Badge>}
                </div>
              </div>
              <InventoryRowForm product={product} />
            </li>
          );
        })}
      </ul>

      <Card className="flex flex-col gap-5 p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Add a product</h2>
        <AddProductForm />
      </Card>
    </>
  );
}
