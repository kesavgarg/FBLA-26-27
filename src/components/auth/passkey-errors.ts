import type { ErrorKey } from "@/lib/validation/auth";

/**
 * Turn whatever the passkey ceremony throws into one friendly message key.
 * Browsers report a cancelled Touch ID prompt as "NotAllowedError" or as a
 * ceremony-aborted WebAuthn error; the server reports unknown credentials and
 * a disabled feature with its own error codes.
 */
export function passkeyErrorKey(error: unknown): ErrorKey {
  const err = (error ?? {}) as { name?: string; code?: string; message?: string; status?: number };
  const text = `${err.name ?? ""} ${err.code ?? ""} ${err.message ?? ""}`.toLowerCase();

  if (typeof window !== "undefined" && !window.PublicKeyCredential) return "passkeyUnsupported";
  if (text.includes("passkey_disabled") || text.includes("passkeys are disabled")) return "passkeyDisabled";
  if (err.status === 429 || text.includes("rate")) return "tooManyRequests";
  if (text.includes("notallowed") || text.includes("ceremony_aborted") || text.includes("abort")) {
    return "passkeyCancelled";
  }
  if (text.includes("not found") || text.includes("credential") || text.includes("webauthn")) return "passkeyUnknown";
  return "generic";
}
