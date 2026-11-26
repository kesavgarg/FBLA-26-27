# Future work: a real Apple Watch connection (HealthKit)

## Why the website uses a simulated sample

Apple Health data (including Apple Watch heart rate, steps and sleep) is stored on the iPhone and is available only through **HealthKit**, a framework for **native iOS apps**. A website — including this Next.js site — has no API to read it. So the "Import Apple Watch data" button in the symptom check imports a **fictional sample** that is labelled "Simulated" everywhere it appears. Nothing connects to a real watch, and no real health data is uploaded or stored.

## How a real version could work

A small **Goodson iPhone companion app** (Swift / SwiftUI) would:

1. **Ask permission per data type.** Using `HKHealthStore.requestAuthorization(toShare:read:)`, the app asks only for read access to the types the pharmacy needs: `heartRate`, `restingHeartRate`, `stepCount`, `sleepAnalysis`, `appleExerciseTime`. iOS shows its own permission sheet; the person can allow some and deny others, and change it later in Settings.
2. **Read only what the person chooses to share.** When the customer starts a symptom check, the app queries the last 24 hours (and a 7-day resting heart-rate trend) with `HKStatisticsQuery` / `HKSampleQuery`.
3. **Show a preview and ask again.** Exactly like the web demo: the person sees the numbers and taps "Share with my pharmacist" or "Don't share".
4. **Send a minimal summary, not raw data.** Only the five summary numbers and the date go to the server over HTTPS, attached to that one symptom check — never a continuous feed.
5. **Validate on the server.** The same `validateWearableImport()` rules in `src/lib/domain/wearable.ts` (ranges, no future dates) check the data before it is saved; the `simulated` flag would be `false` and the source would name the device.

## Safeguards a real deployment would need

- HIPAA-grade hosting, a business associate agreement, encryption at rest and a retention policy — **this student project is not HIPAA compliant**.
- Apple's App Store rules for health data (no advertising use, clear privacy policy).
- Clinical review of how, or whether, the numbers are shown to pharmacists and prescribers. In this project they are **context only** and are never used to diagnose or to decide anything automatically.

## Where the demo lives in the code

| Piece | File |
|---|---|
| Sample data + validation rules | `src/lib/domain/wearable.ts` (`sampleWearableData`, `validateWearableImport`) |
| Import screen (explain → preview → confirm) | `src/components/health/watch-import.tsx` |
| Server re-validation before saving | `src/lib/actions/health.ts` (`submitSymptomCheckAction`) |
| Storage (only simulated data allowed) | `symptom_logs.wearable_snapshot` + CHECK `is_simulated_wearable` (migration 1) |
| Doctor's view of the sample | `src/app/doctor/consults/[id]/page.tsx` |
| Tests | `tests/unit/health-rules.test.ts` ("Apple Watch sample import") |
