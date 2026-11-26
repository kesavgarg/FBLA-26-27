import { CircleCheck, CircleSlash, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/card";
import { getStockStatus } from "@/lib/domain/inventory";
import { fillTemplate } from "@/lib/domain/db-errors";
import type { Dictionary } from "@/lib/i18n";

/** In stock / Only 2 left / Out of stock — always icon + words, never colour alone. */
export function StockBadge({ stock, threshold, t }: { stock: number; threshold: number; t: Dictionary }) {
  const status = getStockStatus(stock, threshold);
  if (status === "out_of_stock") {
    return (
      <Badge tone="danger">
        <CircleSlash className="size-3.5" aria-hidden="true" />
        {t.shop.outOfStock}
      </Badge>
    );
  }
  if (status === "low_stock") {
    return (
      <Badge tone="warning">
        <TriangleAlert className="size-3.5" aria-hidden="true" />
        {fillTemplate(t.shop.lowStock, [String(stock)])}
      </Badge>
    );
  }
  return (
    <Badge tone="success">
      <CircleCheck className="size-3.5" aria-hidden="true" />
      {t.shop.inStock}
    </Badge>
  );
}
