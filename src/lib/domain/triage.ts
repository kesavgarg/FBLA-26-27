/**
 * Guided symptom check — SIMPLIFIED DEMONSTRATION RULES.
 * ===================================================================
 * Demo only. Not medical advice. These thresholds were chosen for a
 * school project to show rule-based decision support; they are NOT
 * clinical guidance and were not written or reviewed by a clinician.
 *
 * The check never names a prescription medicine and never gives a dose.
 * It returns one of three possible next steps:
 *
 *   EMERGENCY  any red-flag answer → stop shopping, show "Call 911"
 *              (and Poison Control for accidental ingestion)
 *   CONSULT    severity 7+, symptoms 7+ days, or temperature 103°F+
 *              → offer to send a consult request to a doctor
 *   SELF_CARE  otherwise → show over-the-counter product categories and
 *              "ask your pharmacist"
 *
 * Rules are checked in that order, so an emergency always wins.
 * ===================================================================
 */

/** Red-flag symptoms that skip everything else. */
export const RED_FLAGS = [
  "chest_pain",
  "trouble_breathing",
  "stroke_signs",
  "severe_allergic_reaction",
  "accidental_ingestion",
  "fainting",
] as const;
export type RedFlag = (typeof RED_FLAGS)[number];

/** Everyday symptoms the survey offers. */
export const SYMPTOMS = [
  "headache",
  "fever",
  "cough",
  "sore_throat",
  "congestion",
  "body_aches",
  "allergies",
  "minor_cut",
  "upset_stomach",
  "trouble_sleeping",
  "dry_skin",
  "other",
] as const;
export type Symptom = (typeof SYMPTOMS)[number];

export type TriageOutcome = "EMERGENCY" | "CONSULT" | "SELF_CARE";

/** Demo thresholds (named so they're easy to point at and change). */
export const THRESHOLDS = {
  consultSeverity: 7, // 1–10 scale
  consultDays: 7,
  consultTemperatureF: 103,
} as const;

export type TriageInput = {
  symptoms: Symptom[];
  redFlags: RedFlag[];
  severity: number;
  /** How many days ago the symptoms started (0 = today). */
  daysSinceStart: number;
  temperatureF?: number | null;
};

export type TriageResult = {
  outcome: TriageOutcome;
  /** Why this outcome, as short reason codes the page translates. */
  reasons: Array<"red_flag" | "severity" | "duration" | "temperature" | "mild">;
  /** Over-the-counter categories to suggest (SELF_CARE only). */
  suggestedCategories: Array<"pain_relief" | "cold_flu" | "first_aid" | "personal_care" | "health_essentials">;
  /** True when Poison Control should be shown. */
  poisonControl: boolean;
};

/** Which shop category may help with each everyday symptom (no medicines named). */
const SELF_CARE_CATEGORY: Partial<Record<Symptom, TriageResult["suggestedCategories"][number]>> = {
  headache: "pain_relief",
  fever: "health_essentials",
  body_aches: "pain_relief",
  cough: "cold_flu",
  sore_throat: "cold_flu",
  congestion: "cold_flu",
  allergies: "cold_flu",
  minor_cut: "first_aid",
  dry_skin: "personal_care",
};

export function triageSymptoms(input: TriageInput): TriageResult {
  // 1. Red flags: emergency, no matter what else was answered.
  if (input.redFlags.length > 0) {
    return {
      outcome: "EMERGENCY",
      reasons: ["red_flag"],
      suggestedCategories: [],
      poisonControl: input.redFlags.includes("accidental_ingestion"),
    };
  }

  // 2. Reasons to involve a clinician.
  const reasons: TriageResult["reasons"] = [];
  if (input.severity >= THRESHOLDS.consultSeverity) reasons.push("severity");
  if (input.daysSinceStart >= THRESHOLDS.consultDays) reasons.push("duration");
  if ((input.temperatureF ?? 0) >= THRESHOLDS.consultTemperatureF) reasons.push("temperature");
  if (reasons.length > 0) {
    return { outcome: "CONSULT", reasons, suggestedCategories: [], poisonControl: false };
  }

  // 3. Self-care: collect the matching categories without duplicates.
  const categories = new Set<TriageResult["suggestedCategories"][number]>();
  for (const symptom of input.symptoms) {
    const category = SELF_CARE_CATEGORY[symptom];
    if (category) categories.add(category);
  }
  return { outcome: "SELF_CARE", reasons: ["mild"], suggestedCategories: [...categories], poisonControl: false };
}
