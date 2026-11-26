/**
 * Validation for cart, checkout and refill forms.
 * Syntactic: right types and formats (whole numbers, UUIDs, 5-digit ZIP).
 * Semantic:  values that make sense (quantity within limits, ZIP inside
 *            the delivery area, an address only when delivering).
 * Messages are dictionary keys (see ErrorKey in ./auth).
 */
import { z } from "zod";
import type { ErrorKey } from "./auth";

/** A cart quantity typed by a person: digits only, 0 removes the line. */
export function quantitySchema(max: number) {
  return z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, "quantityWhole" satisfies ErrorKey)
    .transform(Number)
    .refine((n) => n >= 0, "quantityNegative" satisfies ErrorKey)
    .refine((n) => n <= max, "quantityTooMany" satisfies ErrorKey);
}

export const productIdSchema = z.uuid("generic" satisfies ErrorKey);

/** Build the checkout schema with the store's current delivery ZIP codes. */
export function checkoutSchema(deliveryZips: readonly string[]) {
  return z
    .discriminatedUnion("fulfillment", [
      z.object({
        fulfillment: z.literal("pickup"),
        slotId: z.uuid("slotRequired" satisfies ErrorKey),
      }),
      z.object({
        fulfillment: z.literal("delivery"),
        line1: z
          .string()
          .trim()
          .min(1, "required" satisfies ErrorKey)
          .min(5, "addressShort" satisfies ErrorKey)
          .max(120, "addressLong" satisfies ErrorKey),
        city: z.string().trim().max(60, "addressLong" satisfies ErrorKey).default("Cumming"),
        zip: z
          .string()
          .trim()
          .regex(/^\d{5}$/, "zipFormat" satisfies ErrorKey)
          .refine((zip) => deliveryZips.includes(zip), "zipOutOfArea" satisfies ErrorKey),
        notes: z.string().trim().max(300, "notesLong" satisfies ErrorKey).default(""),
      }),
    ])
    .and(z.object({ idempotencyKey: z.uuid("generic" satisfies ErrorKey) }));
}

export const refillSchema = z.discriminatedUnion("fulfillment", [
  z.object({ fulfillment: z.literal("pickup"), slotId: z.uuid("slotRequired" satisfies ErrorKey), prescriptionId: z.uuid() }),
  z.object({ fulfillment: z.literal("delivery"), prescriptionId: z.uuid() }),
]);
