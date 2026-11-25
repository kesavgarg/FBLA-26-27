"use server";

/**
 * Server Actions for accounts: sign in, register, recover, sign out.
 *
 * Every action follows the same order:
 *   1. Validate the form with Zod (format + meaning)
 *   2. Talk to Supabase Auth
 *   3. Return field errors to the form, or redirect on success
 * Passkey sign-in itself happens in the browser (it needs Touch ID) — see
 * components/auth/passkey-sign-in.tsx — and then lands on /auth/continue.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  recoverSchema,
  registerSchema,
  signInSchema,
  toFieldErrors,
  type ErrorKey,
  type FieldErrors,
} from "@/lib/validation/auth";
import { homePathForRole, safeNextPath } from "./roles";

/** What a form action sends back to its form. */
export type FormState = {
  status: "idle" | "error" | "success";
  /** One error message key per field. */
  fieldErrors?: FieldErrors;
  /** A form-level error message key (shown above the button). */
  formError?: ErrorKey;
  /** Submitted values, so the form can keep what the user typed. */
  values?: Record<string, string>;
};

/** Read a text field from FormData without trusting its type. */
function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** The site's own origin, used to build links in recovery emails. */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Look up the signed-in user's role to choose where they land. */
async function landingPathFor(userId: string, next: string | null): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return next ?? homePathForRole(data?.role ?? "customer");
}

// ---------------------------------------------------------------------------

/** Email + password sign-in (the fallback to passkeys). */
export async function signInWithPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: text(formData, "email") };
  const parsed = signInSchema.safeParse({ email: values.email, password: text(formData, "password") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error), values };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    const formError: ErrorKey = error?.status === 429 ? "tooManyRequests" : "badCredentials";
    return { status: "error", formError, values };
  }

  redirect(await landingPathFor(data.user.id, safeNextPath(text(formData, "next"))));
}

/**
 * Create a customer account.
 * The account is created by the server (service role) with the email marked
 * confirmed, because this demo has no real mailbox to confirm against. The
 * role is always "customer": the database trigger ignores anything else.
 */
export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    fullName: text(formData, "fullName"),
    email: text(formData, "email"),
    dateOfBirth: text(formData, "dateOfBirth"),
    phone: text(formData, "phone"),
  };

  // Honeypot: a hidden field real people never fill in. Bots usually do.
  if (text(formData, "company") !== "") {
    return { status: "error", formError: "generic", values };
  }

  const parsed = registerSchema().safeParse({
    ...values,
    password: text(formData, "password"),
    agree: text(formData, "agree"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error), values };
  }
  const input = parsed.data;

  const admin = createSupabaseAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, date_of_birth: input.dateOfBirth },
  });
  if (createError) {
    const taken = createError.code === "email_exists" || /already/i.test(createError.message);
    return taken
      ? { status: "error", fieldErrors: { email: "emailTaken" }, values }
      : { status: "error", formError: "generic", values };
  }

  // Sign the new user in on this browser.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
  if (error || !data.user) {
    return { status: "error", formError: "generic", values };
  }

  if (input.phone) {
    // Allowed by the column-level grant on profiles (users may edit their phone).
    await supabase.from("profiles").update({ phone: input.phone }).eq("id", data.user.id);
  }

  // Step two of registration: offer to add a Touch ID passkey.
  redirect("/account/security?setup=1");
}

/**
 * Account recovery: email a one-time sign-in link. The reply is the same
 * whether or not the email has an account, so nobody can use this form to
 * discover who is a customer.
 */
export async function recoverAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: text(formData, "email") };
  const parsed = recoverSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error), values };
  }

  const supabase = await createSupabaseServerClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/account/security?recovered=1")}`,
    },
  });
  if (error?.status === 429) {
    return { status: "error", formError: "tooManyRequests", values };
  }
  return { status: "success", values };
}

/** Sign out on this device and return to the sign-in page. */
export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?signedOut=1");
}
