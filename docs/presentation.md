# Presentation notes

FBLA Introduction to Programming: 7-minute presentation, then 3 minutes of questions. Up to 3 devices. Plan for poor Wi-Fi.
The click-by-click demo script lives in the app: **Owner → Presenter guide** (`/owner/demo`). This file is the talk around it.

## Before you present

1. Sign in as the owner → **Presenter guide** → **Reset demo data**. Every run starts from the same state.
2. Check that Touch ID passkeys are saved for Margaret, the doctor and the pharmacist on the presentation Mac. Passkeys belong to one website address, so add them on the **same** address you'll present from (live site or `localhost`).
3. Open tabs in this order: Home, Margaret's account, the doctor's inbox, the staff queue, the owner overview.
4. Have the backup ready (see the end of this file).

## 7-minute plan

| Time | Part | What to show |
|---|---|---|
| 0:00 | Hook | Goodson Drug has served Cumming since 1959 under the motto "We Serve to Serve Again." This system carries that service online. Show the home page and the **About** timeline. |
| 0:30 | Problem | Customers want easy refills and ordering. Pharmacists want fewer phone calls and safer handoffs to doctors. |
| 1:00 | Live demo | Presenter guide steps 1–13: Touch ID sign-in → symptom check with the simulated watch sample → doctor approves (amoxicillin greyed out for the penicillin allergy) → item unlocks → checkout → pharmacist prepares → "Ready for pickup". |
| 4:30 | Safety moment | Pick one or two alternates from the guide: the **Emergency screen** (red-flag answer) and the **Allergy block**. |
| 5:30 | Under the hood | The data model (`docs/database.md`), the server-side Rx gate in `place_order`, and one function you're proud of (`triageSymptoms` or `calculateOrderTotals`). |
| 6:30 | Close | Limitations (fictional data, simulated payment, simulated doctor, no real HealthKit), future work (`docs/future-healthkit.md`), what you learned. |

## Judge questions: honest answers with code to point at

**Why did you design the doctor approval this way?**
A prescription item can only be bought if a doctor approved it for that patient. The check isn't just a hidden button: the database function `place_order` re-checks for an active, unexpired prescription for the same patient before it takes stock (`supabase/migrations/20261126000006_ordering.sql`, `rx_first_fill_ok`). Only `doctor_decide_consult` with "approve" creates a prescription (`…000007_health_workflow.sql`).

**What if the doctor never responds?**
The request stays "Sent" (or "Doctor reviewing") and the customer can see that on their Doctor requests page. Nothing is approved by default; silence never unlocks an item. In this version there are no automatic reminders. A real system would add a time limit that alerts the pharmacist and sends the request to another prescriber. That is listed as future work.

**How do you protect patient information?**
- **Three layers:** role checks in server code (`requireRole`), Row Level Security in Postgres so each customer can read only their own rows, and database functions that re-check the caller's role.
- **Passkeys:** they store only a public key. Fingerprints never leave the device.
- **Secrets:** the service key is used only on the server.
- **Audit log:** every important action is written to it.
- **Tested like an attacker:** `tests/e2e/database-security.spec.ts` calls the database directly the way someone at a browser console could.
- **What would change in a real deployment:** a HIPAA review and business-associate agreements, encryption and retention policies, real prescriber identity checks, and no demo accounts. This project is not HIPAA compliant and says so.

**How does the triage logic work, and how do you know it's safe?**
`src/lib/domain/triage.ts` checks red flags first. Chest pain, trouble breathing, stroke signs, a severe allergic reaction, fainting or swallowing something by accident go straight to the emergency screen (911 / Poison Control) and skip the shop. After that, severity ≥ 7, 7 or more days, or a temperature ≥ 103 °F means "a clinician should look at this". Anything else gets self-care ideas. It never names a prescription medicine or a dose. The server runs triage again, so a changed browser can't skip it. The unit tests cover every outcome and every boundary (`tests/unit/health-rules.test.ts`). It is simplified demo logic, not medical advice. A real version would need clinical review.

**What happens if two customers order the last item at the same time?**
`place_order` locks each product row (`SELECT … FOR UPDATE`) inside one transaction, so the second order waits, then sees the new stock and is refused. Stock can never go below zero, because of a database CHECK constraint. Tested in `tests/e2e/ordering-rules.spec.ts` ("two customers racing for the last 2 thermometers").

**Which part was hardest, and how did you solve it?**
Pick your own true answer. Good candidates:
- Passkeys working both locally and on the live site: each needs its own domain.
- Making one checkout atomic: stock, prescription, allergy, pickup slot and double-click protection all in one database transaction.
- Keeping every page usable at phone width and in Large Text mode.

**Walk us through this function.**
Be ready for `calculateOrderTotals` (`src/lib/domain/pricing.ts`), `triageSymptoms`, `getRefillEligibility` (`refills.ts`), `answerQuestion` (`help.ts`) and `place_order`. `docs/feature-map.md` lists where every feature lives.

## Backup plan

- **No Wi-Fi:** run everything on the laptop. Start Docker → `npx supabase start` → `npm run dev` → open `http://localhost:3000`. Local passkeys must be added on `localhost` ahead of time.
- **Laptop trouble:** a screen recording of the full demo plus screenshots of each step on a second device. *(To do: record this after the final rehearsal. It does not exist yet.)*
- **Something breaks mid-demo:** Reset demo data from the Presenter guide (takes a few seconds), then continue from the current step.
