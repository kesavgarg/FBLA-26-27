"use server";

/**
 * Health actions: symptom check, consult request, reply to the doctor, and
 * the allergy / medicine list. The SERVER runs the triage rules on the
 * validated answers — the browser never decides the outcome.
 */
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { fillTemplate } from "@/lib/domain/db-errors";
import { storeToday } from "@/lib/domain/refills";
import { triageSymptoms, type TriageResult } from "@/lib/domain/triage";
import { validateWearableImport, type WearableSnapshot } from "@/lib/domain/wearable";
import type { Dictionary } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { allergySchema, consultSummarySchema, daysBetween, medicationSchema, replySchema, symptomCheckSchema } from "@/lib/validation/health";
import { field, type ActionResult } from "./result";

const PATIENTS = ["customer", "staff", "doctor", "owner"] as const;

function messageFor(t: Dictionary, key: string): string {
  return t.errors[key as keyof Dictionary["errors"]] ?? t.errors.generic;
}

export type SymptomCheckResult = ActionResult & {
  triage?: TriageResult;
  symptomLogId?: string;
};

/** Save a symptom check and return the suggested next step. */
export async function submitSymptomCheckAction(_prev: SymptomCheckResult, formData: FormData): Promise<SymptomCheckResult> {
  const user = await requireRole(PATIENTS, "/account/health/check");
  const { t } = await getDictionary();
  const today = storeToday();

  const parsed = symptomCheckSchema(today).safeParse({
    symptoms: formData.getAll("symptoms"),
    redFlags: formData.getAll("redFlags"),
    severity: field(formData, "severity"),
    startedOn: field(formData, "startedOn"),
    temperatureF: field(formData, "temperatureF"),
    notes: field(formData, "notes"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const name = String(issue.path[0]);
      fieldErrors[name] ??= messageFor(t, issue.message);
    }
    return { status: "error", fieldErrors };
  }
  const input = parsed.data;

  // Optional simulated watch data: validated again on the server.
  let wearable: WearableSnapshot | null = null;
  const rawWearable = field(formData, "wearable");
  if (rawWearable) {
    let json: unknown = null;
    try {
      json = JSON.parse(rawWearable);
    } catch {
      json = null;
    }
    const checked = validateWearableImport(json, today);
    if (!checked.ok) return { status: "error", message: fillTemplate(t.watch.invalid, [checked.problem]) };
    wearable = checked.data;
  }

  const triage = triageSymptoms({
    symptoms: input.symptoms,
    redFlags: input.redFlags,
    severity: input.severity,
    daysSinceStart: daysBetween(input.startedOn, today),
    temperatureF: input.temperatureF,
  });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("symptom_logs")
    .insert({
      patient_id: user.id,
      symptoms: input.symptoms,
      red_flags: input.redFlags,
      severity: input.severity,
      started_on: input.startedOn,
      notes: input.notes || null,
      temperature_f: input.temperatureF,
      triage_result: triage.outcome,
      wearable_snapshot: wearable,
      is_simulated_wearable: wearable !== null,
    })
    .select("id")
    .single();
  if (error || !data) return { status: "error", message: t.errors.generic };

  revalidatePath("/account/health");
  return { status: "success", triage, symptomLogId: data.id };
}

/** Send a CONSULT-level symptom check to the doctor. */
export async function submitConsultAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(PATIENTS, "/account/health");
  const { t } = await getDictionary();
  const summary = consultSummarySchema.safeParse(field(formData, "summary"));
  if (!summary.success) return { status: "error", fieldErrors: { summary: messageFor(t, summary.error.issues[0].message) } };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("submit_consult", { p_symptom_log: field(formData, "symptomLogId"), p_summary: summary.data });
  if (error) {
    const key = error.message === "CONSULT_OPEN" ? "consultOpen" : error.message === "SUMMARY_SHORT" ? "summaryShort" : "generic";
    return { status: "error", message: messageFor(t, key) };
  }
  revalidatePath("/account/consults");
  return { status: "success", message: t.result.consultSent };
}

/** Answer the doctor's "need more information" question. */
export async function replyToConsultAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(PATIENTS, "/account/consults");
  const { t } = await getDictionary();
  const reply = replySchema.safeParse(field(formData, "reply"));
  if (!reply.success) return { status: "error", fieldErrors: { reply: messageFor(t, reply.error.issues[0].message) } };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reply_to_consult", { p_consult: field(formData, "consultId"), p_reply: reply.data });
  if (error) return { status: "error", message: t.errors.generic };
  revalidatePath("/account/consults");
  return { status: "success", message: t.consults.replySent };
}

/** Add an allergy to the signed-in customer's list. */
export async function addAllergyAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireRole(PATIENTS, "/account/health");
  const { t } = await getDictionary();
  const parsed = allergySchema.safeParse({ substance: field(formData, "substance"), reaction: field(formData, "reaction") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: { [String(parsed.error.issues[0].path[0])]: messageFor(t, parsed.error.issues[0].message) } };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("allergies")
    .insert({ profile_id: user.id, substance: parsed.data.substance.toLowerCase(), reaction: parsed.data.reaction || null });
  if (error) return { status: "error", message: t.errors.generic };
  revalidatePath("/account/health");
  return { status: "success", message: t.health.saved };
}

/** Add a current medicine. */
export async function addMedicationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireRole(PATIENTS, "/account/health");
  const { t } = await getDictionary();
  const parsed = medicationSchema.safeParse({ name: field(formData, "name") });
  if (!parsed.success) return { status: "error", fieldErrors: { name: messageFor(t, parsed.error.issues[0].message) } };
  const supabase = await createSupabaseServerClient();
  // The first word is used as the ingredient for the demo interaction check.
  const ingredient = parsed.data.name.split(/\s+/)[0].toLowerCase();
  const { error } = await supabase.from("current_medications").insert({ profile_id: user.id, name: parsed.data.name, ingredient });
  if (error) return { status: "error", message: t.errors.generic };
  revalidatePath("/account/health");
  return { status: "success", message: t.health.saved };
}

/** Remove an allergy or medicine (RLS makes sure it's the user's own). */
export async function removeHealthItemAction(formData: FormData): Promise<void> {
  await requireRole(PATIENTS, "/account/health");
  const supabase = await createSupabaseServerClient();
  const id = field(formData, "id");
  if (field(formData, "kind") === "allergy") await supabase.from("allergies").delete().eq("id", id);
  else await supabase.from("current_medications").delete().eq("id", id);
  revalidatePath("/account/health");
}
