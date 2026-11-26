import "server-only";
import { fillTemplate, parseDbError } from "@/lib/domain/db-errors";
import type { Dictionary } from "@/lib/i18n";

/** What every shopping action returns to its form. */
export type ActionResult = {
  status: "idle" | "success" | "error";
  /** Ready-to-show message in the visitor's language. */
  message?: string;
  /** Per-field messages for form validation errors. */
  fieldErrors?: Record<string, string>;
};

export const IDLE: ActionResult = { status: "idle" };

/** Turn a database error ("OUT_OF_STOCK:Thermometer") into a friendly message. */
export function dbErrorMessage(t: Dictionary, error: { message?: string } | null | undefined): string {
  const parsed = parseDbError(error?.message);
  return fillTemplate(t.dbErrors[parsed.key], parsed.details);
}

/** Read one text field from a form submission. */
export function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
