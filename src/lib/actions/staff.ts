"use server";

/**
 * Pharmacy staff actions. Each one: requireRole(staff/owner) → validate →
 * database function (re-checks the role, applies the rule, writes the
 * audit log) → refresh the affected pages.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { CATEGORIES } from "@/lib/domain/catalog";
import { ORDER_STATUSES } from "@/lib/domain/orders";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { field, type ActionResult } from "./result";

const STAFF = ["staff", "owner"] as const;

const MESSAGES: Record<string, string> = {
  NOT_ALLOWED: "Only pharmacy staff can do this.",
  BAD_TRANSITION: "That status change isn’t allowed from the current status.",
  REASON_REQUIRED: "Give a reason (at least 3 characters).",
  ORDER_NOT_FOUND: "Order not found.",
  RX_INACTIVE: "This prescription is no longer active, so the refill can’t be verified.",
  RX_EXPIRED: "This prescription has expired, so the refill can’t be verified.",
  RX_NO_REFILLS: "No refills remain on this prescription.",
  QUANTITY_RANGE: "Stock must be a whole number from 0 to 9,999.",
  PRICE_RANGE: "Price must be between $0.00 and $1,000.00.",
  NAME_REQUIRED: "Enter a product name.",
  NO_NEW_RX_PRODUCTS: "Prescription items can’t be added here.",
  MESSAGE_REQUIRED: "Write a message first.",
};

function dbMessage(message: string): string {
  return MESSAGES[message.split(":")[0]] ?? "Something went wrong. Please try again.";
}

/** Move an order to its next status, or cancel it with a reason. */
export async function setOrderStatusAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(STAFF);
  const orderId = field(formData, "orderId");
  const status = z.enum(ORDER_STATUSES).safeParse(field(formData, "status"));
  if (!status.success) return { status: "error", message: "Choose a valid status." };
  const reason = field(formData, "reason").trim();
  if (status.data === "cancelled" && reason.length < 3) return { status: "error", fieldErrors: { reason: MESSAGES.REASON_REQUIRED } };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("staff_set_order_status", { p_order: orderId, p_status: status.data, p_reason: reason || undefined });
  if (error) return { status: "error", message: dbMessage(error.message) };
  revalidatePath("/staff");
  revalidatePath(`/staff/orders/${orderId}`);
  return { status: "success", message: "Status updated. The customer can see it now." };
}

/** Send a message on an order (the customer sees it on their order page). */
export async function sendOrderMessageAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(STAFF);
  const orderId = field(formData, "orderId");
  const body = z.string().trim().min(1).max(1000).safeParse(field(formData, "body"));
  if (!body.success) return { status: "error", fieldErrors: { body: "Write a message of 1 to 1,000 characters." } };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("staff_message_order", { p_order: orderId, p_body: body.data });
  if (error) return { status: "error", message: dbMessage(error.message) };
  revalidatePath(`/staff/orders/${orderId}`);
  return { status: "success", message: "Message sent." };
}

/** Move a refill to its next status, or reject it with a note. */
export async function setRefillStatusAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(STAFF);
  const refillId = field(formData, "refillId");
  const status = z.enum(["verified", "preparing", "ready", "completed", "rejected"]).safeParse(field(formData, "status"));
  if (!status.success) return { status: "error", message: "Choose a valid status." };
  const note = field(formData, "note").trim();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("staff_set_refill_status", { p_refill: refillId, p_status: status.data, p_note: note || undefined });
  if (error) return { status: "error", message: dbMessage(error.message) };
  revalidatePath("/staff/refills");
  return { status: "success", message: "Refill updated." };
}

/** Dollars typed by staff ("12.99" or "$12.99") → whole cents. */
const priceSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[$,]/g, ""))
  .pipe(z.string().regex(/^\d{1,4}(\.\d{1,2})?$/, "PRICE_RANGE"))
  .transform((v) => Math.round(Number(v) * 100))
  .refine((cents) => cents <= 100_000, "PRICE_RANGE");
const quantitySchema = z.string().trim().regex(/^\d{1,4}$/, "QUANTITY_RANGE").transform(Number);

/** Change stock, price, low-stock level and availability of one product. */
export async function updateProductAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(STAFF);
  const parsed = z
    .object({ quantity: quantitySchema, price: priceSchema, threshold: quantitySchema })
    .safeParse({ quantity: field(formData, "quantity"), price: field(formData, "price"), threshold: field(formData, "threshold") || "5" });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= MESSAGES[issue.message] ?? "Check this value.";
    return { status: "error", fieldErrors };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("staff_update_product", {
    p_product: field(formData, "productId"),
    p_quantity: parsed.data.quantity,
    p_price_cents: parsed.data.price,
    p_is_active: field(formData, "active") === "on",
    p_low_stock_threshold: parsed.data.threshold,
  });
  if (error) return { status: "error", message: dbMessage(error.message) };
  revalidatePath("/staff/inventory");
  revalidatePath("/shop", "layout");
  return { status: "success", message: "Saved." };
}

/** Add a new over-the-counter product. */
export async function addProductAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(STAFF);
  const parsed = z
    .object({
      name: z.string().trim().min(2, "NAME_REQUIRED").max(80, "NAME_REQUIRED"),
      nameEs: z.string().trim().max(80),
      description: z.string().trim().min(5, "Describe the product (at least 5 characters).").max(600),
      descriptionEs: z.string().trim().max(600),
      category: z.enum(CATEGORIES).refine((c) => c !== "prescription", "NO_NEW_RX_PRODUCTS"),
      price: priceSchema,
      quantity: quantitySchema,
      ingredient: z.string().trim().max(60),
    })
    .safeParse({
      name: field(formData, "name"),
      nameEs: field(formData, "nameEs"),
      description: field(formData, "description"),
      descriptionEs: field(formData, "descriptionEs"),
      category: field(formData, "category"),
      price: field(formData, "price"),
      quantity: field(formData, "quantity"),
      ingredient: field(formData, "ingredient"),
    });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= MESSAGES[issue.message] ?? issue.message;
    return { status: "error", fieldErrors };
  }
  const p = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("staff_add_product", {
    p_name: p.name,
    p_name_es: p.nameEs,
    p_description: p.description,
    p_description_es: p.descriptionEs,
    p_category: p.category,
    p_price_cents: p.price,
    p_quantity: p.quantity,
    p_active_ingredient: p.ingredient || undefined,
  });
  if (error) return { status: "error", message: dbMessage(error.message) };
  revalidatePath("/staff/inventory");
  revalidatePath("/shop", "layout");
  return { status: "success", message: `Added “${p.name}”. It’s now in the shop.` };
}
