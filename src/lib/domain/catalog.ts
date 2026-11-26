/**
 * Catalog search, filtering and sorting. PURE functions over an array of
 * products, so they can be unit-tested and explained line by line.
 * The catalog is small (dozens of items), so filtering in memory after one
 * database read is simpler and safer than building SQL from user input.
 */

export const CATEGORIES = [
  "pain_relief",
  "cold_flu",
  "vitamins",
  "first_aid",
  "personal_care",
  "health_essentials",
  "gifts",
  "prescription",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SORTS = ["featured", "price_asc", "price_desc", "name"] as const;
export type SortOption = (typeof SORTS)[number];

export type CatalogItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: Category;
  priceCents: number;
  requiresRx: boolean;
  isFeatured: boolean;
  stock: number;
};

export type CatalogQuery = { search?: string; category?: Category | null; sort?: SortOption };

/** Accept only known values from the URL (anything else is ignored). */
export function parseCatalogQuery(params: Record<string, string | string[] | undefined>): Required<CatalogQuery> {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const category = first(params.category);
  const sort = first(params.sort);
  return {
    search: first(params.q).trim().slice(0, 60),
    category: (CATEGORIES as readonly string[]).includes(category) ? (category as Category) : null,
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as SortOption) : "featured",
  };
}

/** Lower-case and strip accents so "vitamina" finds "Vitamína". */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Every word the customer typed must appear in the product's name or
 * description ("vitamin d" matches "Vitamin D3 2000 IU").
 */
export function matchesSearch(item: Pick<CatalogItem, "name" | "description">, search: string): boolean {
  const words = normalize(search).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalize(`${item.name} ${item.description}`);
  return words.every((word) => haystack.includes(word));
}

/** Apply search, category and sort. Returns a NEW array; the input is not changed. */
export function filterAndSortCatalog<T extends CatalogItem>(items: readonly T[], query: CatalogQuery): T[] {
  const filtered = items.filter(
    (item) => (!query.category || item.category === query.category) && matchesSearch(item, query.search ?? ""),
  );

  const byName = (a: T, b: T) => a.name.localeCompare(b.name);
  switch (query.sort) {
    case "price_asc":
      return filtered.sort((a, b) => a.priceCents - b.priceCents || byName(a, b));
    case "price_desc":
      return filtered.sort((a, b) => b.priceCents - a.priceCents || byName(a, b));
    case "name":
      return filtered.sort(byName);
    default:
      // Featured first, then in-stock before sold-out, then by name.
      return filtered.sort(
        (a, b) => Number(b.isFeatured) - Number(a.isFeatured) || Number(b.stock > 0) - Number(a.stock > 0) || byName(a, b),
      );
  }
}
