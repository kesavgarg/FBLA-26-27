/**
 * Apple Watch import — HONEST DEMONSTRATION.
 * ===================================================================
 * A website cannot read Apple Health (HealthKit). Only a native iOS app,
 * with the user's explicit permission, can. So this feature imports a
 * FICTIONAL SAMPLE that shows what a future iOS companion app could share.
 * Nothing here connects to a real watch, and every value is labelled
 * "Simulated" wherever it appears. See docs/future-healthkit.md.
 *
 * The sample is validated like real input would be: each metric must be a
 * number inside a believable range, and dates must not be in the future.
 * The values are not used to diagnose anything.
 * ===================================================================
 */
import { z } from "zod";

export const WEARABLE_SOURCE = "Apple Watch (simulated sample)";

/** Believable ranges a real import would also be checked against. */
export const wearableSnapshotSchema = z.object({
  source: z.literal(WEARABLE_SOURCE),
  simulated: z.literal(true),
  collectedOn: z.iso.date(),
  heartRateAvgBpm: z.number().int().min(30).max(220),
  restingHeartRateBpm: z.number().int().min(30).max(150),
  steps: z.number().int().min(0).max(100_000),
  sleepHours: z.number().min(0).max(24),
  activeMinutes: z.number().int().min(0).max(1440),
  /** Seven days of resting heart rate for the small trend line. */
  restingTrend: z.array(z.number().int().min(30).max(150)).length(7),
});
export type WearableSnapshot = z.infer<typeof wearableSnapshotSchema>;

/** The fictional sample the demo imports. */
export function sampleWearableData(today: string): WearableSnapshot {
  return {
    source: WEARABLE_SOURCE,
    simulated: true,
    collectedOn: today,
    heartRateAvgBpm: 82,
    restingHeartRateBpm: 68,
    steps: 3_420,
    sleepHours: 5.5,
    activeMinutes: 18,
    restingTrend: [62, 63, 61, 64, 66, 69, 68],
  };
}

/**
 * Validate an import (semantic check included: not dated in the future).
 * Returns the clean data or the first problem found.
 */
export function validateWearableImport(
  raw: unknown,
  today: string,
): { ok: true; data: WearableSnapshot } | { ok: false; problem: string } {
  const parsed = wearableSnapshotSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, problem: `${String(issue.path[0] ?? "data")}: ${issue.message}` };
  }
  if (parsed.data.collectedOn > today) return { ok: false, problem: "collectedOn: date is in the future" };
  if (parsed.data.restingHeartRateBpm > parsed.data.heartRateAvgBpm + 40) {
    return { ok: false, problem: "restingHeartRateBpm: higher than plausible for this average" };
  }
  return { ok: true, data: parsed.data };
}
