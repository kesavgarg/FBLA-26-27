import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/shop/product-card";
import { ProductVisual } from "@/components/shop/product-visual";
import { buttonClasses } from "@/components/ui/button";
import { listProducts } from "@/lib/data/catalog";
import { CATEGORIES, filterAndSortCatalog } from "@/lib/domain/catalog";
import type { Dictionary, Locale } from "@/lib/i18n";

/** A sample product slug per category, used to draw each category tile. */
const CATEGORY_PICTURE: Record<(typeof CATEGORIES)[number], string> = {
  pain_relief: "select-acetaminophen-500",
  cold_flu: "select-daytime-cold",
  vitamins: "select-vitamin-d3",
  first_aid: "first-aid-kit-family",
  personal_care: "spf-50-sunscreen",
  health_essentials: "digital-thermometer",
  gifts: "get-well-basket",
  prescription: "rx-lisinopril-10",
};

/**
 * Home page shopping section: a search bar, category tiles and the
 * featured products (live from the database, with live stock).
 */
export async function ShopPreview({ t, locale }: { t: Dictionary; locale: Locale }) {
  const featured = filterAndSortCatalog(await listProducts(locale), { sort: "featured" })
    .filter((product) => product.isFeatured && !product.requiresRx)
    .slice(0, 4);

  return (
    <section className="py-16 lg:py-24" aria-labelledby="shop-title">
      <div className="wrap flex flex-col gap-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-end">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-action">{t.shop.title}</p>
            <h2 id="shop-title" className="text-[2rem] leading-tight font-semibold tracking-tight sm:text-[2.6rem]">
              {t.shop.heading}
            </h2>
          </div>
          <form action="/shop" method="get" role="search" className="flex gap-2">
            <label htmlFor="home-search" className="sr-only">
              {t.shop.searchLabel}
            </label>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="home-search"
                name="q"
                type="search"
                maxLength={60}
                placeholder={t.shop.searchPlaceholder}
                className="min-h-13 w-full rounded-[var(--radius-pill)] border border-line-strong bg-canvas pr-4 pl-12 text-base focus:border-action focus:ring-4 focus:ring-sky-200 focus:outline-none"
              />
            </div>
            <button type="submit" className={buttonClasses("primary", "lg")}>
              {t.shop.searchButton}
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-5">
          <h3 className="text-xl font-semibold">{t.shop.shopByCategory}</h3>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {CATEGORIES.filter((category) => category !== "prescription").map((category) => (
              <li key={category}>
                <Link
                  href={`/shop?category=${category}`}
                  className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-canvas transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <ProductVisual slug={CATEGORY_PICTURE[category]} category={category} label="" className="transition-transform duration-300 group-hover:scale-[1.03]" />
                  <span className="px-4 py-3 text-[0.94rem] font-semibold">{t.shop.categories[category]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-semibold">{t.shop.featured}</h3>
            <Link href="/shop" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-action hover:underline">
              {t.shop.seeAll}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-6 min-[480px]:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} t={t} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
