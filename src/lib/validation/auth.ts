/**
 * Validation rules for sign-in, registration and recovery.
 *
 * Two levels, as the FBLA rubric asks:
 *   - Syntactic: is it the right format? (an email shape, a real date)
 *   - Semantic:  does it make sense? (birth date not in the future, account
 *                holder at least 13, name made of real name characters)
 *
 * Messages are dictionary KEYS (for example "email"), not sentences, so the
 * same rule shows English or Spanish text depending on the visitor.
 * These schemas run on the server; the forms also use them for instant
 * feedback, but the server never trusts the browser's result.
 */
import { z } from "zod";
import type { Dictionary } from "@/lib/i18n";

/** Keys of the `errors` section of the dictionary. */
export type ErrorKey = keyof Dictionary["errors"];

const NAME_PATTERN = /^[\p{L}][\p{L} .'’-]*$/u;
const PHONE_PATTERN = /^\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})$/;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "required" satisfies ErrorKey)
  .max(254, "email" satisfies ErrorKey)
  .pipe(z.email("email" satisfies ErrorKey));

export const passwordSchema = z
  .string()
  .min(1, "required" satisfies ErrorKey)
  .min(10, "passwordShort" satisfies ErrorKey)
  .max(72, "passwordLong" satisfies ErrorKey);

export const fullNameSchema = z
  .string()
  .trim()
  .min(1, "required" satisfies ErrorKey)
  .min(2, "nameShort" satisfies ErrorKey)
  .max(80, "nameLong" satisfies ErrorKey)
  .regex(NAME_PATTERN, "nameChars" satisfies ErrorKey);

/**
 * Age in whole years on `today`. Exported so it can be unit-tested.
 */
export function ageOn(birth: Date, today: Date): number {
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const hadBirthday =
    today.getUTCMonth() > birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() >= birth.getUTCDate());
  if (!hadBirthday) age -= 1;
  return age;
}

/** Build the date-of-birth rule for a given "today" (injectable for tests). */
export function dateOfBirthSchema(today: Date = new Date()) {
  return z
    .string()
    .trim()
    .min(1, "required" satisfies ErrorKey)
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dobInvalid" satisfies ErrorKey)
    .refine((value) => {
      // Reject impossible dates such as 2026-02-30 (JS would roll them over).
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, "dobInvalid" satisfies ErrorKey)
    .refine((value) => new Date(`${value}T00:00:00Z`) <= today, "dobFuture" satisfies ErrorKey)
    .refine((value) => ageOn(new Date(`${value}T00:00:00Z`), today) <= 120, "dobTooOld" satisfies ErrorKey)
    .refine((value) => ageOn(new Date(`${value}T00:00:00Z`), today) >= 13, "dobTooYoung" satisfies ErrorKey);
}

/** Optional US phone. Normalised to 770-555-0123 so the database check passes. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^\+?1[\s.-]?/, ""))
  .refine((value) => value === "" || PHONE_PATTERN.test(value), "phone" satisfies ErrorKey)
  .transform((value) => {
    if (value === "") return null;
    const [, a, b, c] = PHONE_PATTERN.exec(value)!;
    return `${a}-${b}-${c}`;
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "required" satisfies ErrorKey).max(72, "passwordLong" satisfies ErrorKey),
});

export function registerSchema(today: Date = new Date()) {
  return z.object({
    fullName: fullNameSchema,
    email: emailSchema,
    password: passwordSchema,
    dateOfBirth: dateOfBirthSchema(today),
    phone: phoneSchema,
    agree: z.literal("on", { error: "agree" satisfies ErrorKey }),
  });
}

export const recoverSchema = z.object({ email: emailSchema });

/** Field name → error key, ready to send back to a form. */
export type FieldErrors = Partial<Record<string, ErrorKey>>;

/** Turn a Zod failure into one error key per field (the first problem wins). */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (!result[field]) result[field] = issue.message as ErrorKey;
  }
  return result;
}
