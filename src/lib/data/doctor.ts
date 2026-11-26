import "server-only";
import { findAllergyConflict, findInteractions, type InteractionWarning } from "@/lib/domain/safety";
import type { TriageOutcome } from "@/lib/domain/triage";
import type { WearableSnapshot } from "@/lib/domain/wearable";
import type { ConsultStatus } from "@/lib/domain/workflow";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Reads for the doctor's screens. RLS lets the doctor role read consults,
 * symptom logs, profiles, allergies and medicines (minimum necessary for
 * the review); customers can never reach these queries' rows.
 */

export type QueueItem = {
  id: string;
  patientName: string;
  status: ConsultStatus;
  triage: TriageOutcome | null;
  summary: string;
  createdAt: string;
  decidedAt: string | null;
};

export async function listConsultQueue(): Promise<QueueItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("consult_requests")
    .select("id, status, triage_result, summary, created_at, decided_at, patient:profiles!consult_requests_patient_id_fkey(full_name)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    patientName: row.patient?.full_name ?? "—",
    status: row.status,
    triage: row.triage_result,
    summary: row.summary,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  }));
}

export type RxOption = { id: string; name: string; ingredient: string | null; allergyConflict: string | null; interactions: InteractionWarning[] };

export type ConsultReview = {
  id: string;
  status: ConsultStatus;
  summary: string;
  triage: TriageOutcome | null;
  infoRequest: string | null;
  patientReply: string | null;
  doctorNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  allergiesSnapshot: string[];
  medicationsSnapshot: string[];
  wearable: WearableSnapshot | null;
  patient: { id: string; name: string; age: number | null; phone: string | null };
  currentAllergies: string[];
  currentMedications: Array<{ name: string; ingredient: string | null }>;
  symptomLog: { symptoms: string[]; severity: number; startedOn: string; temperatureF: number | null; notes: string | null } | null;
  history: Array<{ id: string; symptoms: string[]; severity: number; triage: TriageOutcome | null; loggedAt: string }>;
  rxOptions: RxOption[];
  prescription: { rxNumber: string; product: string } | null;
};

function ageFrom(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(`${dob}T00:00:00Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  if (now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

export async function getConsultReview(id: string): Promise<ConsultReview | null> {
  const supabase = await createSupabaseServerClient();
  const { data: c } = await supabase
    .from("consult_requests")
    .select(
      "id, status, summary, triage_result, info_request, patient_reply, doctor_note, created_at, decided_at, allergies_snapshot, medications_snapshot, wearable_snapshot, patient_id, symptom_log_id, prescriptions(rx_number, products(name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!c) return null;

  const [patient, allergies, meds, log, history, rxProducts] = await Promise.all([
    supabase.from("profiles").select("id, full_name, date_of_birth, phone").eq("id", c.patient_id).single(),
    supabase.from("allergies").select("substance").eq("profile_id", c.patient_id),
    supabase.from("current_medications").select("name, ingredient").eq("profile_id", c.patient_id),
    c.symptom_log_id
      ? supabase.from("symptom_logs").select("symptoms, severity, started_on, temperature_f, notes").eq("id", c.symptom_log_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("symptom_logs")
      .select("id, symptoms, severity, triage_result, logged_at")
      .eq("patient_id", c.patient_id)
      .order("logged_at", { ascending: false })
      .limit(6),
    supabase.from("products").select("id, name, active_ingredient").eq("requires_rx", true).eq("is_active", true).order("name"),
  ]);

  const currentAllergies = (allergies.data ?? []).map((a) => a.substance);
  const currentMedications = meds.data ?? [];
  const medIngredients = currentMedications.map((m) => m.ingredient ?? m.name.split(" ")[0]);

  // Pre-check every prescription option against this patient (demo tables).
  const rxOptions: RxOption[] = (rxProducts.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    ingredient: p.active_ingredient,
    allergyConflict: findAllergyConflict(p.active_ingredient, currentAllergies),
    interactions: p.active_ingredient ? findInteractions([p.active_ingredient, ...medIngredients]).filter((w) => w.between.includes(p.active_ingredient!.toLowerCase())) : [],
  }));

  const rx = c.prescriptions[0];
  return {
    id: c.id,
    status: c.status,
    summary: c.summary,
    triage: c.triage_result,
    infoRequest: c.info_request,
    patientReply: c.patient_reply,
    doctorNote: c.doctor_note,
    createdAt: c.created_at,
    decidedAt: c.decided_at,
    allergiesSnapshot: c.allergies_snapshot,
    medicationsSnapshot: c.medications_snapshot,
    wearable: (c.wearable_snapshot as WearableSnapshot | null) ?? null,
    patient: {
      id: patient.data?.id ?? c.patient_id,
      name: patient.data?.full_name ?? "—",
      age: ageFrom(patient.data?.date_of_birth ?? null),
      phone: patient.data?.phone ?? null,
    },
    currentAllergies,
    currentMedications,
    symptomLog: log.data
      ? { symptoms: log.data.symptoms, severity: log.data.severity, startedOn: log.data.started_on, temperatureF: log.data.temperature_f, notes: log.data.notes }
      : null,
    history: (history.data ?? []).map((h) => ({ id: h.id, symptoms: h.symptoms, severity: h.severity, triage: h.triage_result, loggedAt: h.logged_at })),
    rxOptions,
    prescription: rx ? { rxNumber: rx.rx_number, product: rx.products?.name ?? "" } : null,
  };
}
