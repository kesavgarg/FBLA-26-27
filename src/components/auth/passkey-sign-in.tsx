"use client";

import { Fingerprint } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ErrorKey } from "@/lib/validation/auth";
import { passkeyErrorKey } from "./passkey-errors";

/**
 * "Sign in with passkey" button.
 *
 * How it works:
 *   1. Supabase Auth sends a one-time challenge.
 *   2. The browser shows the operating system's passkey prompt
 *      (Touch ID on a Mac). The fingerprint is checked by the Mac itself.
 *   3. The device signs the challenge with its private key; Supabase checks
 *      the signature against the public key saved at registration, and
 *      starts a session.
 * We never see or store any biometric information.
 */
export function PasskeySignIn({ next }: { next?: string }) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);

  async function handleClick() {
    setErrorKey(null);
    if (!window.PublicKeyCredential) {
      setErrorKey("passkeyUnsupported");
      return;
    }
    setPending(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPasskey();
      if (error || !data?.session) throw error ?? new Error("No session returned");
      const target = next ? `/auth/continue?next=${encodeURIComponent(next)}` : "/auth/continue";
      window.location.assign(target); // full navigation so the server sees the new cookie
    } catch (error) {
      setErrorKey(passkeyErrorKey(error));
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        size="lg"
        className="w-full"
        onClick={handleClick}
        pending={pending}
        icon={<Fingerprint className="size-5" aria-hidden="true" />}
      >
        {pending ? t.auth.passkeyWorking : t.auth.passkeyButton}
      </Button>
      <p className="text-center text-sm text-muted">{t.auth.passkeyHint}</p>
      <div aria-live="polite">{errorKey && <Alert tone="danger">{t.errors[errorKey]}</Alert>}</div>
    </div>
  );
}
