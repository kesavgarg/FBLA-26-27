"use server";

/**
 * Owner actions: change a user's role, edit store settings, reset the demo,
 * and record a usability-test session. Each checks the owner role here and
 * again in the database, and each is written to the audit log.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { field, type ActionResult } from "./result";

/** Make someone a customer, staff member, doctor or owner (never yourself). */
export async function setUserRoleAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const owner = await requireRole(["owner"]);
  const userId = field(formData, "userId");
  const role = z.enum(ROLES).safeParse(field(formData, "role"));
  if (!role.success) return { status: "error", message: "Choose a valid role." };
  if (userId === owner.id) return { status: "error", message: "You can’t change your own role." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_user_role", { target_user: userId, new_role: role.data });
  if (error) return { status: "error", message: error.message.includes("own role") ? "You can’t change your own role." : "Couldn’t change the role." };
  revalidatePath("/owner/users");
  return { status: "success", message: "Role updated." };
}

const settingsSchema = z.object({
  taxRate: z.coerce.number().min(0, "Tax rate must be 0–20%.").max(20, "Tax rate must be 0–20%."),
  deliveryFee: z.coerce.number().min(0, "Fee must be $0–$50.").max(50, "Fee must be $0–$50."),
  freeThreshold: z.coerce.number().min(0, "Threshold must be $0–$500.").max(500, "Threshold must be $0–$500."),
  slotCapacity: z.coerce.number().int("Use a whole number.").min(1, "Capacity must be 1–50.").max(50, "Capacity must be 1–50."),
  maxLineQuantity: z.coerce.number().int("Use a whole number.").min(1, "Limit must be 1–20.").max(20, "Limit must be 1–20."),
  pharmacistName: z.string().trim().min(3, "Enter the pharmacist’s name.").max(80, "Use 80 characters or fewer."),
});

/** Save the business rules the whole site uses (tax, fees, capacity). */
export async function saveStoreSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["owner"]);
  const parsed = settingsSchema.safeParse({
    taxRate: field(formData, "taxRate"),
    deliveryFee: field(formData, "deliveryFee"),
    freeThreshold: field(formData, "freeThreshold"),
    slotCapacity: field(formData, "slotCapacity"),
    maxLineQuantity: field(formData, "maxLineQuantity"),
    pharmacistName: field(formData, "pharmacistName"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message.startsWith("Invalid") ? "Enter a number." : issue.message;
    return { status: "error", fieldErrors };
  }
  const s = parsed.data;
  const values = {
    tax_rate_bps: Math.round(s.taxRate * 100),
    delivery_fee_cents: Math.round(s.deliveryFee * 100),
    free_delivery_threshold_cents: Math.round(s.freeThreshold * 100),
    slot_capacity: s.slotCapacity,
    max_line_quantity: s.maxLineQuantity,
    pharmacist_name: s.pharmacistName,
  };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("store_settings").update(values).eq("id", 1);
  if (error) return { status: "error", message: "Couldn’t save the settings." };
  await supabase.rpc("log_audit", { p_action: "settings.updated", p_target_type: "store_settings", p_target_id: "1", p_details: values });
  revalidatePath("/", "layout");
  return { status: "success", message: "Settings saved. New orders use them right away." };
}

/** One-click demo reset (owner only; the database checks again). */
export async function resetDemoAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["owner"]);
  if (field(formData, "confirm") !== "RESET") return { status: "error", fieldErrors: { confirm: "Type RESET to confirm." } };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("reset_demo_data");
  if (error) return { status: "error", message: "Reset failed. Check that the demo accounts exist (npm run seed:users)." };
  revalidatePath("/", "layout");
  const result = data as { products: number; orders: number; prescriptions: number };
  return {
    status: "success",
    message: `Demo restored: ${result.products} products, ${result.orders} sample orders, ${result.prescriptions} prescriptions. Usability results were kept.`,
  };
}

const sessionSchema = z.object({
  participantCode: z.string().trim().regex(/^P\d{2,3}$/, "Use a code like P01 (no names)."),
  consent: z.literal("on", { error: "Record a test only after the participant agrees." }),
  task: z.enum(["find_product", "request_refill", "complete_checkout", "find_order_status", "other"]),
  method: z.enum(["previous_process", "digital"]),
  seconds: z.coerce.number().int("Use whole seconds.").min(1, "Enter 1–3600 seconds.").max(3600, "Enter 1–3600 seconds."),
  clicks: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 500), "Clicks must be 0–500."),
  completed: z.enum(["yes", "no"]),
  feedback: z.string().trim().max(1000, "Use 1,000 characters or fewer."),
});

/** Record one real usability-test session. No names: a participant code only. */
export async function recordUsabilitySessionAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const owner = await requireRole(["owner"]);
  const parsed = sessionSchema.safeParse({
    participantCode: field(formData, "participantCode").toUpperCase(),
    consent: field(formData, "consent"),
    task: field(formData, "task"),
    method: field(formData, "method"),
    seconds: field(formData, "seconds"),
    clicks: field(formData, "clicks"),
    completed: field(formData, "completed"),
    feedback: field(formData, "feedback"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message.startsWith("Invalid") ? "Check this value." : issue.message;
    return { status: "error", fieldErrors };
  }
  const p = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("usability_sessions").insert({
    participant_code: p.participantCode,
    consent_given: true,
    task: p.task,
    method: p.method,
    seconds_taken: p.seconds,
    click_count: p.clicks,
    completed: p.completed === "yes",
    feedback: p.feedback || null,
    recorded_by: owner.id,
  });
  if (error) return { status: "error", message: "Couldn’t save the session." };
  revalidatePath("/owner/usability");
  return { status: "success", message: "Session recorded." };
}
