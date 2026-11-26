"use server";

/**
 * Cart actions: add a product, change a quantity, remove a line, and set a
 * spending limit. Order of work in each:
 *   1. who is signed in?            (requireRole)
 *   2. is the input valid?          (Zod: syntax + meaning)
 *   3. ask the database to do it    (set_cart_quantity re-checks stock,
 *                                    allergies and prescriptions)
 *   4. refresh the pages that show the cart
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { getStoreSettings } from "@/lib/data/catalog";
import { getDictionary } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { productIdSchema, quantitySchema } from "@/lib/validation/ordering";
import { dbErrorMessage, field, type ActionResult } from "./result";

const SHOPPERS = ["customer", "staff", "doctor", "owner"] as const;

function refreshCartPages() {
  revalidatePath("/", "layout"); // header cart count
}

/** Add a product (or more of it) to the cart. */
export async function addToCartAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireRole(SHOPPERS);
  const { t } = await getDictionary();
  const settings = await getStoreSettings();

  const productId = productIdSchema.safeParse(field(formData, "productId"));
  const quantity = quantitySchema(settings.maxLineQuantity).safeParse(field(formData, "quantity") || "1");
  if (!productId.success) return { status: "error", message: t.errors.generic };
  if (!quantity.success || quantity.data < 1) {
    const key = quantity.success ? "quantityWhole" : quantity.error.issues[0].message;
    return { status: "error", fieldErrors: { quantity: t.errors[key as keyof typeof t.errors] ?? t.errors.generic } };
  }
  const prescriptionId = field(formData, "prescriptionId") || null;

  const supabase = await createSupabaseServerClient();
  // Adding more of something already in the cart adds to the existing line.
  const { data: existing } = await supabase
    .from("cart_items")
    .select("quantity")
    .eq("profile_id", user.id)
    .eq("product_id", productId.data)
    .maybeSingle();
  const newQuantity = (existing?.quantity ?? 0) + quantity.data;

  const { error } = await supabase.rpc("set_cart_quantity", {
    p_product: productId.data,
    p_quantity: newQuantity,
    p_prescription: prescriptionId ?? undefined,
  });
  if (error) return { status: "error", message: dbErrorMessage(t, error) };

  refreshCartPages();
  return { status: "success", message: t.shop.addedToCart };
}

/** Set a cart line to an exact quantity (0 removes it). */
export async function updateCartLineAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(SHOPPERS);
  const { t } = await getDictionary();
  const settings = await getStoreSettings();

  const productId = productIdSchema.safeParse(field(formData, "productId"));
  const quantity = quantitySchema(settings.maxLineQuantity).safeParse(field(formData, "quantity"));
  if (!productId.success) return { status: "error", message: t.errors.generic };
  if (!quantity.success) {
    const key = quantity.error.issues[0].message as keyof typeof t.errors;
    return { status: "error", fieldErrors: { quantity: t.errors[key] ?? t.errors.generic } };
  }

  const supabase = await createSupabaseServerClient();
  const { data: line } = await supabase
    .from("cart_items")
    .select("prescription_id")
    .eq("product_id", productId.data)
    .maybeSingle();
  const { error } = await supabase.rpc("set_cart_quantity", {
    p_product: productId.data,
    p_quantity: quantity.data,
    p_prescription: line?.prescription_id ?? undefined,
  });
  if (error) return { status: "error", message: dbErrorMessage(t, error) };

  refreshCartPages();
  return { status: "success", message: t.cart.updated };
}

/** Remove a line from the cart. */
export async function removeCartLineAction(formData: FormData): Promise<void> {
  await requireRole(SHOPPERS);
  const productId = productIdSchema.safeParse(field(formData, "productId"));
  if (!productId.success) return;
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("set_cart_quantity", { p_product: productId.data, p_quantity: 0 });
  refreshCartPages();
}

/** Save or clear the spending limit (whole dollars, $1–$1,000). */
export async function saveBudgetAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireRole(SHOPPERS);
  const { t } = await getDictionary();
  const clearing = field(formData, "intent") === "clear";

  let limitCents: number | null = null;
  if (!clearing) {
    const amount = z
      .string()
      .trim()
      .regex(/^\d{1,4}(\.\d{1,2})?$/)
      .transform(Number)
      .refine((n) => n >= 1 && n <= 1000)
      .safeParse(field(formData, "amount").replace(/[$,]/g, ""));
    if (!amount.success) return { status: "error", fieldErrors: { amount: t.errors.budgetAmount } };
    limitCents = Math.round(amount.data * 100);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("user_preferences")
    .update({ budget_limit_cents: limitCents })
    .eq("profile_id", user.id);
  if (error) return { status: "error", message: t.errors.generic };

  revalidatePath("/cart");
  return { status: "success", message: clearing ? t.cart.budgetCleared : t.cart.budgetSaved };
}
