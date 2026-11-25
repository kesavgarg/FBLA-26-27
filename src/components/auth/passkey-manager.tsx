"use client";

import { Fingerprint, KeyRound, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ErrorKey } from "@/lib/validation/auth";
import { passkeyErrorKey } from "./passkey-errors";

type Passkey = { id: string; friendly_name?: string; created_at: string; last_used_at?: string };

/**
 * Lists the signed-in user's passkeys and lets them add or remove one.
 * Adding a passkey triggers the browser's Touch ID prompt; Supabase stores
 * only the resulting PUBLIC key. Several passkeys per person are allowed, so
 * losing one device never locks anyone out.
 */
export function PasskeyManager({ setupMode = false }: { setupMode?: boolean }) {
  const { t, locale } = useI18n();
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<"added" | "removed" | null>(null);
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);

  const loadPasskeys = useCallback(async () => {
    const { data, error } = await getSupabaseBrowserClient().auth.passkey.list();
    if (error) {
      setErrorKey(passkeyErrorKey(error));
      setPasskeys([]);
      return;
    }
    setPasskeys(data ?? []);
  }, []);

  useEffect(() => {
    // Initial load of the user's passkeys from Supabase Auth.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPasskeys();
  }, [loadPasskeys]);

  async function addPasskey() {
    setErrorKey(null);
    setNotice(null);
    if (!window.PublicKeyCredential) {
      setErrorKey("passkeyUnsupported");
      return;
    }
    setAdding(true);
    try {
      const { error } = await getSupabaseBrowserClient().auth.registerPasskey();
      if (error) throw error;
      setNotice("added");
      await loadPasskeys();
    } catch (error) {
      setErrorKey(passkeyErrorKey(error));
    } finally {
      setAdding(false);
    }
  }

  async function removePasskey(id: string) {
    setErrorKey(null);
    setNotice(null);
    setRemovingId(id);
    const { error } = await getSupabaseBrowserClient().auth.passkey.delete({ passkeyId: id });
    setRemovingId(null);
    if (error) {
      setErrorKey("generic");
      return;
    }
    setNotice("removed");
    await loadPasskeys();
  }

  const formatDate = (iso?: string) =>
    iso
      ? new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { dateStyle: "medium" }).format(new Date(iso))
      : t.auth.passkeyNever;

  return (
    <div className="flex flex-col gap-6">
      {setupMode && (
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">{t.auth.passkeySetupTitle}</h2>
          <p className="max-w-prose text-ink/85">{t.auth.passkeySetupBody}</p>
        </div>
      )}

      <div aria-live="polite" className="empty:hidden">
        {notice === "added" && <Alert tone="success">{t.auth.passkeyAdded}</Alert>}
        {notice === "removed" && <Alert tone="success">{t.auth.passkeyRemoved}</Alert>}
        {errorKey && <Alert tone="danger">{t.errors[errorKey]}</Alert>}
      </div>

      <div>
        <h3 className="mb-3 text-base font-semibold">{t.auth.passkeyList}</h3>
        {passkeys === null ? (
          <div className="h-16 animate-pulse rounded-[var(--radius-field)] bg-sky-50" aria-hidden="true" />
        ) : passkeys.length === 0 ? (
          <p className="rounded-[var(--radius-field)] border border-dashed border-line-strong px-4 py-4 text-muted">
            {t.auth.passkeyNone}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-[var(--radius-field)] border border-line">
            {passkeys.map((key) => (
              <li key={key.id} className="flex items-center gap-4 px-4 py-3">
                <KeyRound className="size-5 shrink-0 text-action" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{key.friendly_name || "Passkey"}</p>
                  <p className="text-sm text-muted">
                    {t.auth.passkeyCreated} {formatDate(key.created_at)} · {t.auth.passkeyLastUsed}{" "}
                    {formatDate(key.last_used_at)}
                  </p>
                </div>
                <Button
                  variant="danger"
                  onClick={() => removePasskey(key.id)}
                  pending={removingId === key.id}
                  icon={<Trash2 className="size-4" aria-hidden="true" />}
                  aria-label={`${t.auth.passkeyRemove}: ${key.friendly_name || "Passkey"}`}
                >
                  {t.auth.passkeyRemove}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={addPasskey} pending={adding} icon={<Fingerprint className="size-5" aria-hidden="true" />}>
          {t.auth.passkeySetupButton}
        </Button>
      </div>
    </div>
  );
}
