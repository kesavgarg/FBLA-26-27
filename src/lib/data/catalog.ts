import "server-only";
import { cache } from "react";
import type { Category, CatalogItem } from "@/lib/domain/catalog";
import type { Locale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Catalog and store-settings reads. Runs on the server with the visitor's
 * own session, so Row Level Security applies (signed-out visitors see only
 * active products).
 */

export type Product = CatalogItem & {
  activeIngredient: string | null;
  lowStockThreshold: number;
  imageAlt: string | null;
};

export type StoreSettings = {
  taxRateBps: number;
  deliveryFeeCents: number;
  freeDeliveryThresholdCents: number;
  deliveryZips: string[];
  maxLineQuantity: number;
  pharmacistName: string;
};

export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("store_settings")
    .select("tax_rate_bps, delivery_fee_cents, free_delivery_threshold_cents, delivery_zips, max_line_quantity, pharmacist_name")
    .eq("id", 1)
    .single();
  if (error || !data) throw new Error("Store settings are missing. Run the demo reset.");
  return {
    taxRateBps: data.tax_rate_bps,
    deliveryFeeCents: data.delivery_fee_cents,
    freeDeliveryThresholdCents: data.free_delivery_threshold_cents,
    deliveryZips: data.delivery_zips,
    maxLineQuantity: data.max_line_quantity,
    pharmacistName: data.pharmacist_name,
  };
});

/** All active products with stock, in the visitor's language. */
export const listProducts = cache(async (locale: Locale): Promise<Product[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, name_es, description, description_es, category, price_cents, requires_rx, is_featured, active_ingredient, image_alt, inventory(quantity, low_stock_threshold)",
    )
    .eq("is_active", true);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: locale === "es" ? row.name_es : row.name,
    description: locale === "es" ? row.description_es : row.description,
    category: row.category as Category,
    priceCents: row.price_cents,
    requiresRx: row.requires_rx,
    isFeatured: row.is_featured,
    activeIngredient: row.active_ingredient,
    imageAlt: row.image_alt,
    stock: row.inventory?.quantity ?? 0,
    lowStockThreshold: row.inventory?.low_stock_threshold ?? 5,
  }));
});

export async function getProductBySlug(slug: string, locale: Locale): Promise<Product | null> {
  const products = await listProducts(locale);
  return products.find((product) => product.slug === slug) ?? null;
}

/**
 * Personal context for the signed-in customer: their allergy list and any
 * approved prescriptions waiting for a first fill (keyed by product id).
 */
export async function getShopperContext(userId: string) {
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const [allergies, prescriptions] = await Promise.all([
    supabase.from("allergies").select("substance").eq("profile_id", userId),
    supabase
      .from("prescriptions")
      .select("id, rx_number, product_id, directions")
      .eq("patient_id", userId)
      .eq("status", "active")
      .is("first_filled_at", null)
      .gte("expires_on", today),
  ]);
  const firstFills = new Map<string, { id: string; rxNumber: string; directions: string }>();
  for (const rx of prescriptions.data ?? []) {
    firstFills.set(rx.product_id, { id: rx.id, rxNumber: rx.rx_number, directions: rx.directions });
  }
  return {
    allergies: (allergies.data ?? []).map((row) => row.substance.toLowerCase()),
    firstFills,
  };
}
