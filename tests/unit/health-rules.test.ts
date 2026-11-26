import { describe, expect, it } from "vitest";
import { findAllergyConflict, findInteractions } from "@/lib/domain/safety";
import { triageSymptoms } from "@/lib/domain/triage";
import { sampleWearableData, validateWearableImport } from "@/lib/domain/wearable";
import { doctorCanDecide, journeyProgress, nextOrderStatus, nextRefillStatus, staffCanCancelOrder, staffCanRejectRefill } from "@/lib/domain/workflow";

const mild = { symptoms: ["cough", "sore_throat"] as const, redFlags: [] as const, severity: 3, daysSinceStart: 2, temperatureF: 99.1 };

describe("triage — three outcomes", () => {
  it("sends any red flag to EMERGENCY, even with mild answers", () => {
    const result = triageSymptoms({ ...mild, symptoms: [...mild.symptoms], redFlags: ["chest_pain"] });
    expect(result.outcome).toBe("EMERGENCY");
    expect(result.suggestedCategories).toEqual([]);
    expect(result.poisonControl).toBe(false);
  });

  it("shows Poison Control for accidental ingestion", () => {
    expect(triageSymptoms({ ...mild, symptoms: [], redFlags: ["accidental_ingestion"] }).poisonControl).toBe(true);
  });

  it("sends high severity, long duration or high fever to CONSULT with the reasons", () => {
    expect(triageSymptoms({ ...mild, symptoms: [...mild.symptoms], redFlags: [], severity: 7 }).reasons).toEqual(["severity"]);
    expect(triageSymptoms({ ...mild, symptoms: [...mild.symptoms], redFlags: [], daysSinceStart: 7 }).reasons).toEqual(["duration"]);
    expect(triageSymptoms({ ...mild, symptoms: [...mild.symptoms], redFlags: [], temperatureF: 103 }).reasons).toEqual(["temperature"]);
    expect(triageSymptoms({ ...mild, symptoms: [...mild.symptoms], redFlags: [], severity: 9, daysSinceStart: 10 }).outcome).toBe("CONSULT");
  });

  it("suggests OTC categories (never medicines) for mild symptoms, without duplicates", () => {
    const result = triageSymptoms({ ...mild, symptoms: ["cough", "sore_throat", "headache"], redFlags: [] });
    expect(result.outcome).toBe("SELF_CARE");
    expect(result.suggestedCategories).toEqual(["cold_flu", "pain_relief"]);
    expect(JSON.stringify(result)).not.toMatch(/prescription|mg|dose/i);
  });

  it("treats severity 6 and 6 days as self-care (boundary)", () => {
    expect(triageSymptoms({ ...mild, symptoms: [...mild.symptoms], redFlags: [], severity: 6, daysSinceStart: 6 }).outcome).toBe("SELF_CARE");
  });
});

describe("safety checks (fictional demo table)", () => {
  it("matches an allergy by ingredient or by drug class", () => {
    expect(findAllergyConflict("aspirin", ["Aspirin"])).toBe("Aspirin");
    expect(findAllergyConflict("amoxicillin", ["penicillin", "latex"])).toBe("penicillin");
    expect(findAllergyConflict("acetaminophen", ["penicillin"])).toBeNull();
    expect(findAllergyConflict(null, ["penicillin"])).toBeNull();
  });

  it("warns about interacting pairs once each", () => {
    const warnings = findInteractions(["ibuprofen", "lisinopril", "naproxen"]);
    expect(warnings.map((w) => w.between.join("+"))).toEqual(["ibuprofen+lisinopril", "ibuprofen+naproxen", "lisinopril+naproxen"]);
    expect(findInteractions(["acetaminophen", "loratadine"])).toEqual([]);
  });
});

describe("Apple Watch sample import — brief scenario 18", () => {
  const today = "2026-11-26";

  it("accepts the labelled simulated sample", () => {
    const result = validateWearableImport(sampleWearableData(today), today);
    expect(result.ok).toBe(true);
  });

  it("rejects out-of-range values, wrong types and future dates", () => {
    const sample = sampleWearableData(today);
    expect(validateWearableImport({ ...sample, heartRateAvgBpm: 400 }, today).ok).toBe(false);
    expect(validateWearableImport({ ...sample, steps: -10 }, today).ok).toBe(false);
    expect(validateWearableImport({ ...sample, sleepHours: "eight" }, today).ok).toBe(false);
    expect(validateWearableImport({ ...sample, collectedOn: "2027-01-01" }, today).ok).toBe(false);
    expect(validateWearableImport({ ...sample, restingTrend: [60, 61] }, today).ok).toBe(false);
  });

  it("refuses anything not labelled as simulated", () => {
    expect(validateWearableImport({ ...sampleWearableData(today), simulated: false }, today).ok).toBe(false);
    expect(validateWearableImport({ ...sampleWearableData(today), source: "Apple Watch" }, today).ok).toBe(false);
  });
});

describe("workflow steps", () => {
  it("moves orders one step at a time, differently for pickup and delivery", () => {
    expect(nextOrderStatus("received", "pickup")).toBe("preparing");
    expect(nextOrderStatus("preparing", "pickup")).toBe("ready_for_pickup");
    expect(nextOrderStatus("preparing", "delivery")).toBe("out_for_delivery");
    expect(nextOrderStatus("ready_for_pickup", "pickup")).toBe("completed");
    expect(nextOrderStatus("completed", "pickup")).toBeNull();
    expect(staffCanCancelOrder("completed")).toBe(false);
  });

  it("moves refills one step at a time and only rejects early", () => {
    expect(nextRefillStatus("requested")).toBe("verified");
    expect(nextRefillStatus("ready")).toBe("completed");
    expect(nextRefillStatus("completed")).toBeNull();
    expect(staffCanRejectRefill("preparing")).toBe(false);
  });

  it("lets the doctor decide only open requests and tracks the journey", () => {
    expect(doctorCanDecide("submitted")).toBe(true);
    expect(doctorCanDecide("needs_info")).toBe(false);
    expect(journeyProgress("approved", false)).toBe(4);
    expect(journeyProgress("approved", true)).toBe(5);
  });
});
