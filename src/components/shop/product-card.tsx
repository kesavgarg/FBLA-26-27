import { Lock } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/card";
import type { Product } from "@/lib/data/catalog";
import { formatCents } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { ProductVisual } from "./product-visual";
import { StockBadge } from "./stock-badge";

/** One product tile in the shop grid. The whole card links to the product page. */
export function ProductCard({ product, t }: { product: Product; t: Dictionary }) {
  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-canvas shadow-soft transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="overflow-hidden">
        <ProductVisual
          slug={product.slug}
          category={product.category}
          label={product.imageAlt ?? product.name}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-sm text-muted">{t.shop.categories[product.category]}</p>
        <h3 className="line-clamp-2 text-[1.05rem] leading-snug font-semibold text-ink">{product.name}</h3>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <p className="tabular text-lg font-semibold">{formatCents(product.priceCents)}</p>
          {product.requiresRx ? (
            <Badge tone="warning">
              <Lock className="size-3.5" aria-hidden="true" />
              {t.shop.rxRequired}
            </Badge>
          ) : (
            <StockBadge stock={product.stock} threshold={product.lowStockThreshold} t={t} />
          )}
        </div>
      </div>
    </Link>
  );
}
