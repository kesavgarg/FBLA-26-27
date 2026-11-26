"use server";

/**
 * Checkout, cancellation and refill actions.
 * The website validates first (so people see which field to fix), then the
 * database functions place_order / cancel_my_order / request_refill repeat
 * every check inside one transaction and do the actual work.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getBudgetLimit, getCart } from "@/lib/data/cart";
import { getStoreSettings } from "@/lib/data/catalog";
import { checkBudget } from "@/lib/domain/budget";
import { fillTemplate } from "@/lib/domain/db-errors";
import { calculateOrderTotals } from "@/lib/domain/pricing";
import { formatCents } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkoutSchema, refillSchema } from "@/lib/validation/ordering";
import { dbErrorMessage, field, type ActionResult } from "./result";

const SHOPPERS = ["customer", "staff", "doctor", "owner"] as const;

/** Zod issues → { field: message } in the visitor's language. */
function fieldMessages(t: Dictionary, issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const name = String(issue.path[0] ?? "form");
    if (!out[name]) out[name] = t.errors[issue.message as keyof Dictionary["errors"]] ?? t.errors.generic;
  }
  return out;
}

/** Place the order in the cart. On success, go to the order's page. */
export async function placeOrderAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(SHOPPERS, "/checkout");
  const { t, locale } = await getDictionary();
  const settings = await getStoreSettings();

  const parsed = checkoutSchema(settings.deliveryZips).safeParse({
    fulfillment: field(formData, "fulfillment"),
    slotId: field(formData, "slotId"),
    line1: field(formData, "line1"),
    city: field(formData, "city") || "Cumming",
    zip: field(formData, "zip"),
    notes: field(formData, "notes"),
    idempotencyKey: field(formData, "idempotencyKey"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldMessages(t, parsed.error.issues) };
  const input = parsed.data;

  // Semantic check the database doesn't know about: the customer's own budget.
  const user = await requireRole(SHOPPERS);
  const [cart, limit] = await Promise.all([getCart(locale), getBudgetLimit(user.id)]);
  const totals = calculateOrderTotals(
    cart.map((line) => ({ unitPriceCents: line.priceCents, quantity: line.quantity, taxable: !line.requiresRx })),
    input.fulfillment,
    settings,
  );
  const budget = checkBudget(totals.totalCents, limit);
  if (budget.status === "over") {
    return {
      status: "error",
      message: fillTemplate(t.cart.budgetOver, [formatCents(budget.overByCents), formatCents(limit ?? 0)]),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_fulfillment: input.fulfillment,
    p_slot: input.fulfillment === "pickup" ? input.slotId : undefined,
    p_line1: input.fulfillment === "delivery" ? input.line1 : undefined,
    p_city: input.fulfillment === "delivery" ? input.city : undefined,
    p_zip: input.fulfillment === "delivery" ? input.zip : undefined,
    p_notes: input.fulfillment === "delivery" ? input.notes : undefined,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) return { status: "error", message: dbErrorMessage(t, error) };

  const orderId = (data as { order_id: string }).order_id;
  revalidatePath("/", "layout");
  redirect(`/account/orders/${orderId}?placed=1`);
}

/** Customer cancels an order that hasn't started being prepared. */
export async function cancelOrderAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(SHOPPERS);
  const { t } = await getDictionary();
  const orderId = field(formData, "orderId");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("cancel_my_order", { p_order: orderId });
  if (error) return { status: "error", message: dbErrorMessage(t, error) };
  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/account/orders");
  return { status: "success", message: t.orders.cancelled };
}

/** Request a refill of an existing prescription. */
export async function requestRefillAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(SHOPPERS, "/account/prescriptions");
  const { t } = await getDictionary();
  const parsed = refillSchema.safeParse({
    fulfillment: field(formData, "fulfillment"),
    slotId: field(formData, "slotId"),
    prescriptionId: field(formData, "prescriptionId"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldMessages(t, parsed.error.issues) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("request_refill", {
    p_prescription: parsed.data.prescriptionId,
    p_fulfillment: parsed.data.fulfillment,
    p_slot: parsed.data.fulfillment === "pickup" ? parsed.data.slotId : undefined,
  });
  if (error) return { status: "error", message: dbErrorMessage(t, error) };
  revalidatePath("/account/prescriptions");
  revalidatePath("/account");
  return { status: "success", message: t.refills.requested };
}
