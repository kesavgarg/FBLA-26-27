import { CheckCircle2, ListChecks, Presentation, RotateCcw, Users } from "lucide-react";
import Link from "next/link";
import { ResetDemoForm } from "@/components/owner/owner-forms";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Owner · Presenter guide" };

const ACCOUNTS = [
  { role: "Customer", email: "margaret@goodson-demo.example", who: "Margaret Ellis, 68 — refills, aspirin and penicillin allergies" },
  { role: "Customer", email: "daniel@goodson-demo.example", who: "Daniel Ortiz — pending consult for the deny demo" },
  { role: "Pharmacy staff", email: "pharmacist@goodson-demo.example", who: "Dana Whitfield, PharmD" },
  { role: "Doctor (simulated)", email: "doctor@goodson-demo.example", who: "Dr. Priya Raman" },
  { role: "Owner", email: "owner@goodson-demo.example", who: "Lee Hartwell" },
];

const MAIN_DEMO: Array<{ who: string; step: string; href?: string }> = [
  { who: "Customer", step: "Sign in with a passkey (Touch ID) as Margaret.", href: "/login" },
  { who: "Customer", step: "Browse the shop: search “cough”, open a product.", href: "/shop" },
  { who: "Customer", step: "Health → Start a symptom check: Cough, “None of these”, severity 8.", href: "/account/health/check" },
  { who: "Customer", step: "Watch data step: Preview sample data → Import this sample (point out “Simulated”)." },
  { who: "Customer", step: "Result: “A clinician should look at this” → Send to the doctor." },
  { who: "Doctor", step: "Sign in as the doctor; open Margaret’s request in the inbox.", href: "/doctor" },
  { who: "Doctor", step: "Show amoxicillin is greyed out (penicillin allergy). Approve Benzonatate with directions." },
  { who: "Customer", step: "As Margaret: Doctor requests → Go to the prescription item (now unlocked).", href: "/account/consults" },
  { who: "Customer", step: "Add to cart → Checkout → choose a pickup time → Place order." },
  { who: "Staff", step: "Sign in as the pharmacist; the order is at the top of the queue.", href: "/staff" },
  { who: "Staff", step: "Mark “Being prepared”, then “Ready for pickup” (safety check is green)." },
  { who: "Customer", step: "As Margaret: the order says Ready for pickup, with the pharmacist’s name.", href: "/account/orders" },
  { who: "Owner", step: "Overview: the new order appears in today’s chart; Audit log shows every step.", href: "/owner" },
];

const ALTERNATIVES = [
  { title: "Denied consultation", steps: "Doctor opens Daniel’s request → Deny with a note. As Daniel: Doctor requests shows “Not approved”; the antibiotic stays locked." },
  { title: "Allergy block", steps: "As Margaret open Low-Dose Aspirin: “Blocked for your safety”. The database refuses it too." },
  { title: "Out of stock", steps: "Open Loratadine: “Sold out right now”, no Add to cart. Staff can restock it in Inventory." },
  { title: "Emergency screen", steps: "Symptom check with “Chest pain or pressure” → full-screen Call 911." },
  { title: "Invalid refill", steps: "As Margaret: Refills shows Atorvastatin expired and Levothyroxine with no refills left." },
  { title: "Insufficient inventory / bad input", steps: "Cart: set the thermometer to 5 (“Only 2 left”). Checkout: ZIP 90210 is refused; no pickup time shows an error." },
  { title: "Budget limit", steps: "Cart → set a $20 spending limit with a $34.99 basket: checkout is blocked with the amount over." },
];

/** Everything needed to present: accounts, the 13-step demo, alternatives, reset. */
export default async function PresenterGuidePage() {
  await requireRole(["owner"], "/owner/demo");

  return (
    <>
      <div>
        <h1 className="flex items-center gap-3 text-[2rem] font-semibold tracking-tight">
          <Presentation className="size-7 text-action" aria-hidden="true" />
          Presenter guide
        </h1>
        <p className="text-lg text-ink/80">A repeatable 7-minute demonstration. Reset before each rehearsal so every run starts the same way.</p>
      </div>

      <Card className="flex flex-col gap-4 p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <RotateCcw className="size-5 text-danger" aria-hidden="true" />
          Reset the demo
        </h2>
        <p className="text-ink/85">
          Restores the fictional products, stock, prescriptions, the pending consult and two weeks of sample orders, and clears carts, new orders, consults and the audit log. Accounts and usability results are kept.
        </p>
        <ResetDemoForm />
      </Card>

      <Card className="flex flex-col gap-4 p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Users className="size-5 text-action" aria-hidden="true" />
          Demo accounts
        </h2>
        <p className="text-sm text-muted">All five share the demo password kept in the project’s .env.local (DEMO_USER_PASSWORD). Register a Touch ID passkey for each on the presentation Mac beforehand.</p>
        <ul className="divide-y divide-line">
          {ACCOUNTS.map((a) => (
            <li key={a.email} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-6">
              <span className="w-40 font-semibold">{a.role}</span>
              <span className="tabular text-sm">{a.email}</span>
              <span className="text-sm text-muted">{a.who}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="flex flex-col gap-4 p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ListChecks className="size-5 text-action" aria-hidden="true" />
          Main demonstration (13 steps)
        </h2>
        <ol className="flex flex-col gap-3">
          {MAIN_DEMO.map((s, i) => (
            <li key={i} className="flex gap-4">
              <span className="tabular flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-100 font-semibold text-action">{i + 1}</span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-muted">{s.who}</span>
                <span>
                  {s.step}{" "}
                  {s.href && (
                    <Link href={s.href} className="font-semibold text-action hover:underline">
                      Open
                    </Link>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="flex flex-col gap-4 p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
          Alternative demonstrations
        </h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {ALTERNATIVES.map((a) => (
            <li key={a.title} className="rounded-[var(--radius-field)] border border-line p-4">
              <p className="font-semibold">{a.title}</p>
              <p className="text-ink/85">{a.steps}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Alert tone="warning" title="If the Wi-Fi fails">
        Run the app locally on the laptop (npx supabase start, npm run seed:users, npm run dev) and keep a screen recording of this demo as a backup.
      </Alert>
    </>
  );
}
