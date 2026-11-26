/**
 * Validation for the symptom check, health profile and consult forms.
 * Syntactic: known symptom names, whole-number severity, real dates.
 * Semantic:  start date not in the future and within a year, temperature
 *            in a human range, text lengths that fit the database.
 */
import { z } from "zod";
import { RED_FLAGS, SYMPTOMS } from "@/lib/domain/triage";
import type { ErrorKey } from "./auth";

/** Whole days between two YYYY-MM-DD dates (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function symptomCheckSchema(today: string) {
  return z.object({
    symptoms: z.array(z.enum(SYMPTOMS)).min(1, "symptomsRequired" satisfies ErrorKey).max(12),
    redFlags: z.array(z.enum(RED_FLAGS)).max(6),
    severity: z.coerce
      .number("severityRange" satisfies ErrorKey)
      .int("severityRange" satisfies ErrorKey)
      .min(1, "severityRange" satisfies ErrorKey)
      .max(10, "severityRange" satisfies ErrorKey),
    startedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "dobInvalid" satisfies ErrorKey)
      .refine((date) => !Number.isNaN(Date.parse(date)), "dobInvalid" satisfies ErrorKey)
      .refine((date) => date <= today, "startedFuture" satisfies ErrorKey)
      .refine((date) => daysBetween(date, today) <= 365, "startedTooOld" satisfies ErrorKey),
    temperatureF: z
      .string()
      .trim()
      .transform((value) => (value === "" ? null : Number(value)))
      .refine((value) => value === null || (Number.isFinite(value) && value >= 90 && value <= 110), "temperatureRange" satisfies ErrorKey),
    notes: z.string().trim().max(1000, "textTooLong" satisfies ErrorKey),
  });
}

export const consultSummarySchema = z
  .string()
  .trim()
  .min(10, "summaryShort" satisfies ErrorKey)
  .max(1000, "textTooLong" satisfies ErrorKey);

export const allergySchema = z.object({
  substance: z.string().trim().min(2, "substanceRequired" satisfies ErrorKey).max(60, "substanceRequired" satisfies ErrorKey),
  reaction: z.string().trim().max(120, "textTooLong" satisfies ErrorKey),
});

export const medicationSchema = z.object({
  name: z.string().trim().min(2, "medicationRequired" satisfies ErrorKey).max(80, "medicationRequired" satisfies ErrorKey),
});

export const replySchema = z.string().trim().min(2, "replyRequired" satisfies ErrorKey).max(1000, "textTooLong" satisfies ErrorKey);
