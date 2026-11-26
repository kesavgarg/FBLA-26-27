import "server-only";
import type { TriageOutcome } from "@/lib/domain/triage";
import type { WearableSnapshot } from "@/lib/domain/wearable";
import type { ConsultStatus } from "@/lib/domain/workflow";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Reads for the health area. RLS limits customers to their own records. */

export type HealthProfile = {
  allergies: Array<{ id: string; substance: string; reaction: string | null }>;
  medications: Array<{ id: string; name: string; ingredient: string | null }>;
};

export async function getHealthProfile(userId: string): Promise<HealthProfile> {
  const supabase = await createSupabaseServerClient();
  const [allergies, meds] = await Promise.all([
    supabase.from("allergies").select("id, substance, reaction").eq("profile_id", userId).order("created_at"),
    supabase.from("current_medications").select("id, name, ingredient").eq("profile_id", userId).order("created_at"),
  ]);
  return { allergies: allergies.data ?? [], medications: meds.data ?? [] };
}

export type SymptomLog = {
  id: string;
  symptoms: string[];
  redFlags: string[];
  severity: number;
  startedOn: string;
  notes: string | null;
  temperatureF: number | null;
  triageResult: TriageOutcome | null;
  wearable: WearableSnapshot | null;
  loggedAt: string;
};

export async function listSymptomLogs(patientId: string, limit = 30): Promise<SymptomLog[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("symptom_logs")
    .select("id, symptoms, red_flags, severity, started_on, notes, temperature_f, triage_result, wearable_snapshot, logged_at")
    .eq("patient_id", patientId)
    .order("logged_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => ({
    id: row.id,
    symptoms: row.symptoms,
    redFlags: row.red_flags,
    severity: row.severity,
    startedOn: row.started_on,
    notes: row.notes,
    temperatureF: row.temperature_f,
    triageResult: row.triage_result,
    wearable: (row.wearable_snapshot as WearableSnapshot | null) ?? null,
    loggedAt: row.logged_at,
  }));
}

export type ConsultView = {
  id: string;
  status: ConsultStatus;
  summary: string;
  infoRequest: string | null;
  patientReply: string | null;
  doctorNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  prescription: { rxNumber: string; productSlug: string; productName: string; firstFilled: boolean } | null;
};

export async function listMyConsults(patientId: string, locale: "en" | "es"): Promise<ConsultView[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("consult_requests")
    .select(
      "id, status, summary, info_request, patient_reply, doctor_note, created_at, decided_at, prescriptions(rx_number, first_filled_at, products(slug, name, name_es))",
    )
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => {
    const rx = row.prescriptions[0];
    return {
      id: row.id,
      status: row.status,
      summary: row.summary,
      infoRequest: row.info_request,
      patientReply: row.patient_reply,
      doctorNote: row.doctor_note,
      createdAt: row.created_at,
      decidedAt: row.decided_at,
      prescription: rx
        ? {
            rxNumber: rx.rx_number,
            productSlug: rx.products?.slug ?? "",
            productName: (locale === "es" ? rx.products?.name_es : rx.products?.name) ?? "",
            firstFilled: Boolean(rx.first_filled_at),
          }
        : null,
    };
  });
}
