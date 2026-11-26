import { ArrowLeft, Lock, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartForm } from "@/components/shop/add-to-cart-form";
import { ProductVisual } from "@/components/shop/product-visual";
import { StockBadge } from "@/components/shop/stock-badge";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth/session";
import { getProductBySlug, getShopperContext, getStoreSettings } from "@/lib/data/catalog";
import { fillTemplate } from "@/lib/domain/db-errors";
import { maxOrderableQuantity } from "@/lib/domain/inventory";
import { formatCents } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const { locale } = await getDictionary();
  const product = await getProductBySlug(slug, locale);
  return { title: product?.name ?? "Product" };
}

/**
 * Product detail. Decides which buying option to show, in this order:
 *   signed out → "Sign in to buy"
 *   allergy match → blocked with the reason
 *   prescription item → locked unless an approved first fill exists
 *   out of stock → explanation
 *   otherwise → quantity + Add to cart
 * The database repeats every one of these checks when adding to the cart.
 */
export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const { t, locale } = await getDictionary();
  const [product, user, settings] = await Promise.all([getProductBySlug(slug, locale), getSessionUser(), getStoreSettings()]);
  if (!product) notFound();

  const context = user ? await getShopperContext(user.id) : null;
  const allergen =
    context && product.activeIngredient && context.allergies.includes(product.activeIngredient.toLowerCase())
      ? product.activeIngredient
      : null;
  const firstFill = context?.firstFills.get(product.id) ?? null;
  const max = maxOrderableQuantity(product.stock, settings.maxLineQuantity, product.requiresRx);

  let buying: React.ReactNode;
  if (!user) {
    buying = (
      <ButtonLink href={`/login?next=${encodeURIComponent(`/shop/${product.slug}`)}`} size="lg">
        {t.shop.signInToBuy}
      </ButtonLink>
    );
  } else if (allergen) {
    buying = (
      <Alert tone="danger" title={t.shop.allergyTitle}>
        {fillTemplate(t.shop.allergyWarning, [allergen])}
      </Alert>
    );
  } else if (product.requiresRx && !firstFill) {
    buying = (
      <Alert tone="warning" title={t.shop.rxRequired}>
        {t.shop.rxLockedBody}{" "}
        <Link href="/account/prescriptions" className="font-semibold text-action underline">
          {t.shop.rxRefillNote}
        </Link>
      </Alert>
    );
  } else if (max === 0) {
    buying = <Alert tone="warning" title={t.shop.outOfStock}>{t.shop.outOfStockBody}</Alert>;
  } else {
    buying = (
      <div className="flex flex-col gap-4">
        {firstFill && (
          <Alert tone="success" title={fillTemplate(t.shop.rxApproved, [firstFill.rxNumber])}>
            {fillTemplate(t.shop.rxFirstFillNote, [firstFill.directions])}
          </Alert>
        )}
        <AddToCartForm productId={product.id} max={max} prescriptionId={firstFill?.id} />
      </div>
    );
  }

  return (
    <div className="wrap flex flex-1 flex-col gap-8 py-10 lg:py-14">
      <Link href="/shop" className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-action hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.shop.backToShop}
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div className="overflow-hidden rounded-[28px] border border-line">
          <ProductVisual slug={product.slug} category={product.category} label={product.imageAlt ?? product.name} />
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/shop?category=${product.category}`} className="text-sm font-semibold text-action hover:underline">
              {t.shop.categories[product.category]}
            </Link>
            {product.requiresRx ? (
              <Badge tone="warning">
                <Lock className="size-3.5" aria-hidden="true" />
                {t.shop.rxRequired}
              </Badge>
            ) : (
              <StockBadge stock={product.stock} threshold={product.lowStockThreshold} t={t} />
            )}
          </div>
          <h1 className="text-[2rem] leading-tight font-semibold tracking-tight sm:text-[2.4rem]">{product.name}</h1>
          <div>
            <p className="tabular text-[2rem] font-semibold">{formatCents(product.priceCents)}</p>
            <p className="text-sm text-muted">
              {t.shop.demoPrice}. {product.requiresRx ? "" : t.shop.taxNote}
            </p>
          </div>
          <p className="max-w-prose text-lg text-ink/85">{product.description}</p>
          {product.activeIngredient && (
            <p className="flex items-center gap-2 text-[0.94rem] text-muted">
              <ShieldAlert className="size-4" aria-hidden="true" />
              {t.shop.activeIngredient}: <span className="font-medium text-ink">{product.activeIngredient}</span>
            </p>
          )}
          <div className="border-t border-line pt-6">{buying}</div>
        </div>
      </div>
    </div>
  );
}
