/**
 * Translate the short error codes raised by database functions
 * (for example "NOT_ENOUGH_STOCK:Thermometer|2") into a dictionary key plus
 * values to fill into the message. PURE function.
 */

export type DbErrorKey =
  | "SIGN_IN_REQUIRED"
  | "PRODUCT_UNAVAILABLE"
  | "QUANTITY_LIMIT"
  | "OUT_OF_STOCK"
  | "NOT_ENOUGH_STOCK"
  | "ALLERGY_BLOCK"
  | "RX_REQUIRED"
  | "RX_QUANTITY_ONE"
  | "CART_EMPTY"
  | "SLOT_UNAVAILABLE"
  | "SLOT_FULL"
  | "ADDRESS_REQUIRED"
  | "ZIP_OUT_OF_AREA"
  | "DUPLICATE_REQUEST"
  | "ORDER_NOT_FOUND"
  | "CANNOT_CANCEL"
  | "RX_NOT_FOUND"
  | "RX_INACTIVE"
  | "RX_EXPIRED"
  | "RX_NO_REFILLS"
  | "REFILL_IN_PROGRESS"
  | "UNKNOWN";

const KNOWN = new Set<string>([
  "SIGN_IN_REQUIRED", "PRODUCT_UNAVAILABLE", "QUANTITY_LIMIT", "OUT_OF_STOCK", "NOT_ENOUGH_STOCK",
  "ALLERGY_BLOCK", "RX_REQUIRED", "RX_QUANTITY_ONE", "CART_EMPTY", "SLOT_UNAVAILABLE", "SLOT_FULL",
  "ADDRESS_REQUIRED", "ZIP_OUT_OF_AREA", "DUPLICATE_REQUEST", "ORDER_NOT_FOUND", "CANNOT_CANCEL",
  "RX_NOT_FOUND", "RX_INACTIVE", "RX_EXPIRED", "RX_NO_REFILLS", "REFILL_IN_PROGRESS",
]);

export type ParsedDbError = { key: DbErrorKey; details: string[] };

/** "NOT_ENOUGH_STOCK:Thermometer|2" → { key: "NOT_ENOUGH_STOCK", details: ["Thermometer", "2"] } */
export function parseDbError(message: string | undefined | null): ParsedDbError {
  const text = (message ?? "").trim();
  const colon = text.indexOf(":");
  const code = colon === -1 ? text : text.slice(0, colon);
  if (!KNOWN.has(code)) return { key: "UNKNOWN", details: [] };
  const details = colon === -1 ? [] : text.slice(colon + 1).split("|");
  return { key: code as DbErrorKey, details };
}

/** Fill {0}, {1} … placeholders in a message with values. */
export function fillTemplate(template: string, values: readonly string[]): string {
  return template.replace(/\{(\d+)\}/g, (match, index: string) => values[Number(index)] ?? match);
}
