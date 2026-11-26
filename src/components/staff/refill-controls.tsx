"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { setRefillStatusAction } from "@/lib/actions/staff";
import { nextRefillStatus, staffCanRejectRefill, type RefillStatus } from "@/lib/domain/workflow";
import { en } from "@/lib/i18n/en";
import { ActionForm } from "./action-form";

/** Next-step button for a refill, plus reject with a note. */
export function RefillControls({ refillId, status, eligible }: { refillId: string; status: RefillStatus; eligible: boolean }) {
  const next = nextRefillStatus(status);
  const [rejecting, setRejecting] = useState(false);
  const blockedVerify = next === "verified" && !eligible;

  return (
    <div className="flex flex-col gap-2">
      {next && (
        <ActionForm action={setRefillStatusAction} hidden={{ refillId, status: next }}>
          {(_, pending) => (
            <Button type="submit" pending={pending} disabled={blockedVerify} title={blockedVerify ? "Not eligible — reject instead" : undefined}>
              {en.refills.requestStatus[next]}
            </Button>
          )}
        </ActionForm>
      )}
      {staffCanRejectRefill(status) &&
        (rejecting ? (
          <ActionForm action={setRefillStatusAction} hidden={{ refillId, status: "rejected" }} className="flex flex-col gap-2">
            {(_, pending) => (
              <>
                <label className="text-sm font-semibold" htmlFor={`note-${refillId}`}>
                  Reason for the patient
                </label>
                <Input id={`note-${refillId}`} name="note" maxLength={300} />
                <Button type="submit" variant="danger" pending={pending}>
                  Reject refill
                </Button>
              </>
            )}
          </ActionForm>
        ) : (
          <Button variant="quiet" className="text-danger" onClick={() => setRejecting(true)}>
            Reject…
          </Button>
        ))}
    </div>
  );
}
