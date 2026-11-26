"use server";

/**
 * Doctor actions. requireRole(["doctor"]) here, and the database function
 * re-checks is_doctor() — so even the owner (who can VIEW the doctor area)
 * cannot approve a prescription.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { parseDbError } from "@/lib/domain/db-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { field, type ActionResult } from "./result";

const DECISION_MESSAGES: Record<string, string> = {
  NOT_ALLOWED: "Only the doctor account can make this decision.",
  ALREADY_DECIDED: "This request has already been decided or is waiting on the patient.",
  NOTE_REQUIRED: "Add a note for the patient (at least 3 characters).",
  RX_PRODUCT_REQUIRED: "Choose a prescription item from the list.",
  DIRECTIONS_REQUIRED: "Write the directions (at least 5 characters).",
  REFILLS_RANGE: "Refills must be between 0 and 5.",
  VALID_DAYS_RANGE: "Valid days must be between 7 and 365.",
  ALLERGY_BLOCK: "Blocked: this patient is allergic to {0}.",
};

const decisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approve"),
    note: z.string().trim().min(3, "NOTE_REQUIRED").max(1000),
    productId: z.uuid("RX_PRODUCT_REQUIRED"),
    directions: z.string().trim().min(5, "DIRECTIONS_REQUIRED").max(300),
    refills: z.coerce.number().int("REFILLS_RANGE").min(0, "REFILLS_RANGE").max(5, "REFILLS_RANGE"),
    validDays: z.coerce.number().int("VALID_DAYS_RANGE").min(7, "VALID_DAYS_RANGE").max(365, "VALID_DAYS_RANGE"),
  }),
  z.object({ decision: z.literal("deny"), note: z.string().trim().min(3, "NOTE_REQUIRED").max(1000) }),
  z.object({ decision: z.literal("needs_info"), note: z.string().trim().min(3, "NOTE_REQUIRED").max(500) }),
]);

/** Approve, deny or ask for more information. */
export async function decideConsultAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["doctor"]);
  const consultId = field(formData, "consultId");
  const parsed = decisionSchema.safeParse({
    decision: field(formData, "decision"),
    note: field(formData, "note"),
    productId: field(formData, "productId"),
    directions: field(formData, "directions"),
    refills: field(formData, "refills") || "0",
    validDays: field(formData, "validDays") || "180",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] ??= DECISION_MESSAGES[issue.message] ?? "Check this field.";
    }
    return { status: "error", fieldErrors };
  }
  const input = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("doctor_decide_consult", {
    p_consult: consultId,
    p_decision: input.decision,
    p_note: input.note,
    ...(input.decision === "approve"
      ? { p_product: input.productId, p_directions: input.directions, p_refills: input.refills, p_valid_days: input.validDays }
      : {}),
  });
  if (error) {
    const parsedError = parseDbError(error.message);
    const raw = error.message.split(":")[0];
    const template = DECISION_MESSAGES[raw] ?? "Something went wrong. Please try again.";
    return { status: "error", message: template.replace("{0}", parsedError.details[0] ?? "") };
  }

  revalidatePath("/doctor");
  revalidatePath(`/doctor/consults/${consultId}`);
  const result = data as { status: string; rx_number?: string };
  return {
    status: "success",
    message:
      result.status === "approved"
        ? `Approved. Prescription ${result.rx_number} is now active for this patient.`
        : result.status === "denied"
          ? "Denied. The item stays locked for this patient."
          : "Question sent to the patient.",
  };
}

/** Mark a new request as being reviewed (the patient sees "Doctor reviewing"). */
export async function startReviewAction(formData: FormData): Promise<void> {
  await requireRole(["doctor"]);
  const consultId = field(formData, "consultId");
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("doctor_open_consult", { p_consult: consultId });
  revalidatePath(`/doctor/consults/${consultId}`);
  revalidatePath("/doctor");
}
