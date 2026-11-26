import { Search, SearchX } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ProductCard } from "@/components/shop/product-card";
import { SortSelect } from "@/components/shop/sort-select";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { listProducts } from "@/lib/data/catalog";
import { CATEGORIES, filterAndSortCatalog, parseCatalogQuery } from "@/lib/domain/catalog";
import { fillTemplate } from "@/lib/domain/db-errors";
import { getDictionary } from "@/lib/i18n/server";
import { cx } from "@/lib/utils";

export const metadata = { title: "Shop" };

/**
 * Product catalog. Search, category and sort live in the URL
 * (/shop?q=cough&category=cold_flu&sort=price_asc) so results can be
 * bookmarked, shared and reached with the Back button.
 */
export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const query = parseCatalogQuery(await searchParams);
  const { t, locale } = await getDictionary();
  const products = filterAndSortCatalog(await listProducts(locale), query);

  /** Link to the same page with one filter changed. */
  const hrefWith = (category: string | null) => {
    const params = new URLSearchParams();
    if (query.search) params.set("q", query.search);
    if (category) params.set("category", category);
    if (query.sort !== "featured") params.set("sort", query.sort);
    return `/shop${params.size ? `?${params}` : ""}`;
  };

  return (
    <div className="wrap flex flex-1 flex-col gap-8 py-10 lg:py-14">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-action">{t.shop.title}</p>
        <h1 className="max-w-2xl text-[2.1rem] leading-tight font-semibold tracking-tight sm:text-[2.6rem]">{t.shop.heading}</h1>
        <p className="max-w-2xl text-lg text-ink/80">{t.shop.intro}</p>
      </header>

      {/* Search: a plain GET form, so it works even before JavaScript loads. */}
      <form action="/shop" method="get" role="search" className="flex flex-col gap-3 sm:flex-row">
        {query.category && <input type="hidden" name="category" value={query.category} />}
        {query.sort !== "featured" && <input type="hidden" name="sort" value={query.sort} />}
        <label htmlFor="shop-search" className="sr-only">
          {t.shop.searchLabel}
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id="shop-search"
            name="q"
            type="search"
            defaultValue={query.search}
            maxLength={60}
            placeholder={t.shop.searchPlaceholder}
            className="min-h-13 w-full rounded-[var(--radius-pill)] border border-line-strong bg-canvas pr-4 pl-12 text-base focus:border-action focus:ring-4 focus:ring-sky-200 focus:outline-none"
          />
        </div>
        <button type="submit" className={buttonClasses("primary", "lg")}>
          {t.shop.searchButton}
        </button>
      </form>

      <nav aria-label={t.shop.category} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {[null, ...CATEGORIES].map((category) => {
          const active = query.category === category;
          return (
            <Link
              key={category ?? "all"}
              href={hrefWith(category)}
              aria-current={active ? "page" : undefined}
              className={cx(
                "inline-flex min-h-11 shrink-0 items-center rounded-[var(--radius-pill)] border px-4 text-[0.94rem] font-medium whitespace-nowrap transition-colors",
                active ? "border-ink bg-ink text-white" : "border-line bg-canvas text-ink hover:border-action hover:text-action",
              )}
            >
              {category ? t.shop.categories[category] : t.shop.allCategories}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <p className="text-muted" aria-live="polite">
          {products.length === 1 ? t.shop.resultsOne : fillTemplate(t.shop.results, [String(products.length)])}
        </p>
        <Suspense>
          <SortSelect value={query.sort} />
        </Suspense>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-[var(--radius-card)] border border-dashed border-line-strong p-10">
          <SearchX className="size-8 text-muted" aria-hidden="true" />
          <h2 className="text-xl font-semibold">{t.shop.noResultsTitle}</h2>
          <p className="text-ink/80">{t.shop.noResultsBody}</p>
          <ButtonLink href="/shop" variant="secondary">
            {t.shop.clearFilters}
          </ButtonLink>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} t={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
