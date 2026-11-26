import "server-only";
import type { Category } from "@/lib/domain/catalog";
import type { Locale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** One line in the signed-in customer's cart, joined with product and stock. */
export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  category: Category;
  priceCents: number;
  quantity: number;
  requiresRx: boolean;
  stock: number;
  prescriptionId: string | null;
  rxNumber: string | null;
};

/** Read the cart (RLS limits it to the signed-in user's own rows). */
export async function getCart(locale: Locale): Promise<CartLine[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cart_items")
    .select(
      "product_id, quantity, prescription_id, added_at, products(slug, name, name_es, category, price_cents, requires_rx, inventory(quantity)), prescriptions(rx_number)",
    )
    .order("added_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).flatMap((row) => {
    const product = row.products;
    if (!product) return [];
    return [
      {
        productId: row.product_id,
        slug: product.slug,
        name: locale === "es" ? product.name_es : product.name,
        category: product.category as Category,
        priceCents: product.price_cents,
        quantity: row.quantity,
        requiresRx: product.requires_rx,
        stock: product.inventory?.quantity ?? 0,
        prescriptionId: row.prescription_id,
        rxNumber: row.prescriptions?.rx_number ?? null,
      },
    ];
  });
}

/** Number of items in the cart (for the header badge). */
export async function getCartCount(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("cart_items").select("quantity");
  return (data ?? []).reduce((sum, row) => sum + row.quantity, 0);
}

/** The customer's spending limit in cents, or null. */
export async function getBudgetLimit(userId: string): Promise<number | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("user_preferences").select("budget_limit_cents").eq("profile_id", userId).single();
  return data?.budget_limit_cents ?? null;
}
