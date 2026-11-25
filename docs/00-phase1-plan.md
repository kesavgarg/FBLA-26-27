# Phase 1 — Architecture and Implementation Plan

Goodson Drug Co. Digital Pharmacy Ordering Platform
FBLA Introduction to Programming 2026–27 · Topic: Local Business Digital Ordering System

> Independent student project. Not affiliated with, endorsed by, or used by Goodson Drug Co.
> All patients, prescriptions, doctors, products and prices are fictional.

---

## 1. Inputs reviewed

| Source | What it gave us |
|---|---|
| `Introduction-to-Programming.pdf` (FBLA national guidelines, Aug 2026) | Topic, 7-min presentation + 3-min Q&A, max 3 devices, unreliable internet warning, rating sheet (130 pts) |
| `Goodson_Drugs_Ordering_System_Build_Guide.pdf` | Business facts, roles, tiered features, data model, workflow states, business rules, test checklist, judge questions |
| tasteskill 2.5.1 (`.claude/skills/design-taste-frontend`) | Anti-template design rules: one system, equal edges, 16px+ body text, sentence case, no violet, hover micro-interactions, plain copy, copy-lint + browser gate |
| Vercel `web-design-guidelines` (`.claude/skills/web-design-guidelines`) | UI review checklist (a11y, forms, focus, motion, i18n) run against our components |
| awesome-design-md (`design-reference/apple-DESIGN.md`, `claude`, `stripe`, `supabase`) | Reference tokens for Apple-style spacing, pill buttons, hairlines, frosted nav |
| Playwright CLI (`.claude/skills/playwright-cli`, `playwright-cli` 0.1.25 installed) | Browser checks and screenshots during the build |

### Where the skills conflict with this brief (the brief wins)

- tasteskill is written for static marketing pages and asks Next.js to use `output: 'export'`. This app needs a server (auth, checkout, RLS), so we **do not** static-export. Its rules apply to the public pages (Home, About, Heritage, Catalog) and the design system; the gate runs against the dev server URL.
- tasteskill hides house numbers and phone formats. The brief requires the real public address **116 W. Maple St., Cumming, GA 30040**, so we show it on About/footer (public business info).

---

## 2. Rubric → feature map (130 points)

| Rating-sheet item | Pts | How we earn "Exceeds" |
|---|---|---|
| Comments, naming, formatting | 10 | Every module starts with a purpose header; JSDoc on every exported function; ESLint + Prettier; `docs/feature-map.md` links each feature to its files/functions |
| Modular, readable structure | 10 | Business logic in `src/lib/domain/*` (pure, unit-tested: `pricing`, `triage`, `safety`, `refills`, `inventory`, `validation`) separate from UI and from data access (`src/lib/data/*`) |
| Intuitive UI / clear instructions | 10 | Inline step instructions on every flow, empty states that say what to do next, consistent layout |
| Navigation + help menu | 10 | Role-aware nav, breadcrumbs, `/help` center **plus an interactive Help Assistant** (rule-based Q&A that answers "How do I refill?" and links to the page) — the rubric's "intelligent feature such as an interactive Q&A" |
| Input validation (syntactic + semantic) | 5 | Zod schemas shared client/server for format; semantic checks on the server (stock, store hours, refill eligibility, Rx gate, allergy, budget, dates not in future) |
| Addresses all parts of prompt | 10 | Browse → cart → totals → checkout → manage/cancel orders → review history; unavailable items, inventory limits, invalid entries, **customer budget limit** (topic names "budget constraints") |
| Presentable report | 10 | Owner Reports: date range, group by day/week/category, choose columns, CSV export, print-to-PDF view |
| Data storage | 5 | Normalized Postgres schema, typed TS models, arrays/lists (cart lines, symptom lists, timeline arrays), enums for statuses |
| Documentation | 20 | README, setup, user guide, schema docs, testing docs, libraries list, attribution, limitations, privacy-by-design |
| Presentation delivery / Q&A / protocols | 40 | Built-in **Presenter Guide** page (13-step script, alternate failure demos), one-click demo reset, offline backup plan |

---

## 3. Technology

| Layer | Choice (current version) | Why |
|---|---|---|
| App | Next.js 16 (App Router) + React 19 + TypeScript (strict) | Server Components + Server Actions keep sensitive logic on the server |
| Styling | Tailwind CSS 4 with CSS-variable design tokens | One token file = one system |
| Database | Supabase Postgres, SQL migrations in `supabase/migrations` | RLS, transactions, functions |
| Auth | Supabase Auth: built-in passkeys (WebAuthn) + email/password fallback + email recovery link | See §6 |
| Validation | Zod 4 | Same schema on client and server |
| Charts | Recharts 3 | Symptom trends and owner analytics |
| Icons | lucide-react | Consistent stroke icon set, MIT |
| Tests | Vitest (unit), Playwright (E2E, incl. virtual WebAuthn authenticator) | |
| Hosting | Vercel (already logged in as `kesavgarg-9850`) + GitHub (logged in as `kesavgarg`) | |

No other runtime dependencies unless a later phase proves a need. i18n is a small typed dictionary module (no library).

---

## 4. Architecture

```
src/
  app/
    (public)/            home, catalog, product/[slug], about, heritage, help, privacy
    (auth)/              login, register, recover
    (customer)/account/  dashboard, cart, checkout, orders, orders/[id], prescriptions,
                         health (survey, journal, symptom-check), consults, family, settings
    staff/               orders, refills, inventory, messages
    doctor/              consults, consults/[id], history
    owner/               analytics, reports, audit-log, users, usability-tests, demo
    api/passkey/         register-options, register-verify, login-options, login-verify
  components/
    ui/                  Button, Card, Input, Badge, Dialog, Toast, EmptyState, Skeleton, Stepper…
    layout/              SiteHeader, RoleNav, Footer, DemoBanner, AccessibilityMenu, LanguageSwitch
    feature/             ProductCard, CartLine, OrderTimeline, WorkflowTracker, AppleWatchImport…
  lib/
    domain/              PURE business rules (no I/O) — unit tested
      pricing.ts         calculateOrderTotals(lines, fulfillment, settings)
      triage.ts          triageSymptoms(answers) → EMERGENCY | CONSULT | SELF_CARE (demo rules)
      safety.ts          checkAllergyConflicts(), checkInteractions() (fictional table)
      refills.ts         getRefillEligibility(prescription, patientId, today)
      inventory.ts       getStockStatus(), LOW_STOCK_THRESHOLD
      store-hours.ts     buildPickupSlots(date, hours, capacity)
      budget.ts          checkBudget(total, limit)
      wearable.ts        validateWearableSample() (Apple Watch demo)
    data/                Supabase queries per table (server-only)
    actions/             Server Actions: auth checks → Zod → domain rules → DB/RPC → audit log
    auth/                getSessionUser(), requireRole(), passkey helpers
    i18n/                en.ts, es.ts, t() helper, cookie-based locale
    validation/          Zod schemas
  proxy.ts               route protection by role (defence in depth; real checks in actions + RLS)
supabase/
  migrations/            schema, RLS, functions (place_order, request_refill, decide_consult, reset_demo)
  seed.sql               fictional demo data
tests/unit, tests/e2e
docs/
```

**Request path for any sensitive action** (example: checkout)

1. Server Action `placeOrder` → `requireRole('customer')`
2. Zod parse (syntax) → `calculateOrderTotals` from **database prices**, never client prices
3. Postgres function `place_order()` in one transaction: `SELECT … FOR UPDATE` on each product, re-check stock, Rx gate (active, unexpired, same patient), allergy block, slot capacity, store hours; insert order + items; decrement stock; write audit row
4. Any failure raises a coded error → translated, friendly message in the UI

Two customers buying the last item: the row lock serializes them; the second sees "Only 0 left".

---

## 5. Database (Supabase Postgres)

| Table | Key columns / notes |
|---|---|
| `profiles` | id → auth.users, full_name, phone, role enum (`customer`,`staff`,`doctor`,`owner`), date_of_birth, is_demo |
| `family_members` | owner_id → profiles, name, birth_year, relationship |
| `allergies` | patient_profile_id / family_member_id, substance, reaction, severity |
| `products` | slug, name, name_es, description(_es), category enum, price_cents int, requires_rx bool, is_active, image_path, active_ingredient |
| `inventory` | product_id PK, quantity int CHECK ≥ 0, low_stock_threshold, updated_by |
| `prescriptions` | rx_number, patient_id, product_id, prescriber_id, directions, refills_remaining, status enum (`pending_approval`,`active`,`inactive`,`denied`), expires_on, consult_id |
| `symptom_logs` | patient_id, symptoms text[], severity 1–10, started_on, notes ≤1000, temperature_f, wearable_snapshot jsonb, is_simulated_wearable |
| `consult_requests` | patient_id, symptom_log_id, requested_product_id, summary, status enum (`submitted`,`under_review`,`needs_info`,`approved`,`denied`), doctor_id, doctor_note, patient_reply, decided_at |
| `orders` | order_number `GD-YYYYMMDD-####`, customer_id, patient (self/family), fulfillment enum, pickup_slot_id, delivery address fields, status enum (6 statuses), subtotal/tax/fee/total cents, idempotency_key UNIQUE (stops double-submit), cancel_reason |
| `order_items` | order_id, product_id, prescription_id nullable, quantity > 0, unit_price_cents, taxable |
| `refill_requests` | prescription_id, patient_id, fulfillment, status, order_id |
| `messages` | order_id / refill_id / consult_id, sender_id, body ≤1000, kind (`message`,`status_update`,`pickup_ready`) |
| `audit_logs` | actor_id, actor_role, action, target_type, target_id, details jsonb, created_at — insert-only |
| `pickup_slots` | slot_date, starts_at, capacity, booked_count |
| `store_settings` | tax_rate, delivery_fee, free_delivery_threshold, hours jsonb (Sunday closed), slot_minutes |
| `user_preferences` | locale, text_size, high_contrast, reduced_motion, budget_limit_cents |
| `passkey_credentials` | user_id, credential_id UNIQUE, public_key bytea, counter, transports, device_label — **public keys only; no biometric data ever exists on our side** |
| `webauthn_challenges` | challenge, user_id nullable, purpose, expires_at (5 min), used_at — single-use |
| `usability_sessions` | task, participant_code, consent_given, seconds, clicks, completed, feedback, method (`old`/`digital`) — **starts empty** |

**Security**
- RLS on every table. Customers see only their own rows (`auth.uid()`); staff/doctor/owner policies via a `current_role()` SQL helper.
- `profiles.role` cannot be changed by the user: a trigger rejects role changes unless made by an owner through a server action. Registration always creates `customer`.
- Writes that must be atomic go through `SECURITY DEFINER` functions that re-check the caller's role.
- `SUPABASE_SERVICE_ROLE_KEY` used only in `server-only` modules (passkey session minting, demo reset). Never in client bundles.
- Money stored as integer cents (no float rounding errors).

**Tax rule (documented setting, not hard-coded):** Georgia generally exempts prescription drugs; OTC items taxable. Default rate 7.0% (GA 4% + Forsyth local 3%) — to be verified with the Georgia Department of Revenue before presenting.

---

## 6. Authentication and passkeys (Touch ID)

> **Updated in Phase 2.** While building, I checked the installed `@supabase/auth-js` and the hosted Auth server: Supabase Auth now supports passkeys natively (`signInWithPasskey`, `registerPasskey`, `/auth/v1/passkeys/*`). It is switched off on the hosted project (`passkey_disabled`). Using the built-in feature is safer than writing our own WebAuthn verification, so the SimpleWebAuthn plan below was replaced.

1. **Register** (signed-in user): `supabase.auth.registerPasskey()` → Supabase issues a challenge → browser calls `navigator.credentials.create()` → macOS shows **Touch ID** → Supabase verifies and stores the **public key**.
2. **Sign in**: `supabase.auth.signInWithPasskey()` → challenge → Touch ID → Supabase verifies the signature, origin and RP ID server-side and starts a normal Supabase session.
3. **Recovery**: email one-time sign-in link (or password fallback) → Security settings → add a new passkey. Users can hold several passkeys and remove old ones.
4. **Never** touch fingerprints: the OS keeps biometrics; we receive only a signed assertion.

Constraints to know: each Supabase project has **one** RP ID (domain). So development uses a **local Supabase** (Docker, RP ID `localhost`) and production uses the **hosted project** with the Vercel domain as RP ID. Turning passkeys on for the hosted project is an Auth setting change, done at deployment with your OK. Safari and Chrome on macOS both support platform passkeys. Supabase's built-in email sender is rate-limited (a few emails/hour); fine for demos, a custom SMTP is listed as future work.

**Demo accounts** (seeded, fictional, `.example` emails): customer, staff pharmacist, doctor (labelled "Simulated prescriber"), owner. Each has a password from seed config for first sign-in; before competition you register a Touch ID passkey for all four on the presentation Mac so the passkey picker switches roles in one touch.

---

## 7. Page list

| Area | Pages |
|---|---|
| Public | Home, Catalog (search/filter/sort), Product detail, About Goodson, Heritage timeline, Help center + assistant, Privacy by design, Login, Register, Recover |
| Customer | Dashboard, Cart (with budget limit), Checkout (pickup slots / delivery), Confirmation, Orders + tracker, Prescriptions + refill, Health survey (+ Apple Watch demo import), Symptom journal (charts), Symptom check (triage + emergency screen), Consults (reply to "need more info"), Family profiles, Settings (language, accessibility, passkeys, allergies) |
| Staff | Order queue (filter/search), Order detail + safety results + messages, Refill queue, Inventory (add/edit/price/stock/unavailable, low-stock alerts) |
| Doctor | Consult inbox, Consult detail (profile, symptoms, history, allergies, meds) → Approve / Deny / Ask for info, Decision history |
| Owner | Analytics, Reports (filters, CSV, print), Audit log, Users & roles, Usability tests, Presenter guide + demo reset, Store settings |

---

## 8. Design system

Identity: white + baby blue, Apple-calm, built for older readers.

| Token | Value | Use |
|---|---|---|
| `--canvas` | `#FFFFFF` | page ground |
| `--sky-50` | `#F1F8FC` | alternate sections, table stripes |
| `--sky-100` | `#D9EEFB` | chips, selected rows, soft fills |
| `--sky-300` | `#A9D8F5` | brand band, illustrations, focus halo |
| `--action` | `#1F6FA8` | primary buttons/links (baby blue is 1.5:1 on white, too faint for text, so actions use a deeper blue of the same hue: 5.4:1) |
| `--ink` | `#18324B` | text (13.2:1) |
| `--muted` | `#5B6B7F` | labels/meta (≥4.5:1) |
| `--line` | `#E5EDF3` | hairlines |
| status | green `#1E7A4F`, amber `#9A6200`, red `#B42318` | always paired with icon + text, never colour alone |

- Type: **Inter** for UI/body, **Fraunces** (or Source Serif 4) for a few heritage headings only; body 17px default, 20px in Large Text mode; line height 1.6; sentence case.
- Spacing scale 4/8/12/16/24/32/48/64/96; radius 12 (inputs) / 20 (cards) / pill (buttons); one soft shadow; 44px min tap targets.
- Motion: 150–250 ms ease-out on hover/press, card lift 2px; `prefers-reduced-motion` and the in-app toggle stop it all. No scroll fades, no parallax, no gradients beyond one subtle hero wash.
- Layout: max 1280 content width, equal side gutters, 12-col grid; dashboards use a left rail on desktop, bottom tabs on phones.
- Product images: one consistent frame (4:3, light sky ground, `object-fit: contain`) so nothing stretches. Source: licensed stand-in photographs (Unsplash/Pexels licence) of unbranded items, credited in the footer line and `docs/attribution.md`. No photos of the real Goodson store are used.
- Accessibility mode: Large Text, High Contrast, Reduced Motion, visible 3px focus ring, skip link, labelled fields, errors announced via `aria-live`.

---

## 9. Key workflows

**Doctor gate:** Survey → triage `CONSULT` → consult request (snapshot of symptoms, allergies, meds) → doctor inbox → Approve creates `prescriptions` row (`active`, linked patient, refills, expiry) → product unlocks **for that patient only** → cart → `place_order()` re-checks Rx. Deny → product stays locked, decision shown. Need info → customer replies → back to `under_review`. Every decision audit-logged.

**Triage (demo rules, `lib/domain/triage.ts`):** red flags (chest pain, trouble breathing, stroke signs, severe allergic reaction, accidental ingestion → Poison Control 1-800-222-1222) → `EMERGENCY` screen, shop bypassed; severity ≥ 7 or ≥ 7 days → `CONSULT`; else `SELF_CARE` (OTC links, "ask the pharmacist"). Never recommends Rx, never doses. Banner: "Demo only. Not medical advice."

**Apple Watch import (honest demo):** A website cannot read HealthKit. The button opens a polished sheet: what would be shared → preview of a **fictional sample** (heart rate, resting HR, steps, sleep, activity minutes) → confirm → Zod validation (ranges, dates) → values attached to the survey, badged "Simulated sample data". `docs/future-healthkit.md` describes a native iOS companion app using HealthKit with explicit permission.

**Failure demos (all live, all reset-able):** denied consult, allergy block (customer allergic to an ingredient), out-of-stock item, expired-prescription refill, quantity above stock, invalid checkout input, over-budget cart.

---

## 10. Testing

- **Unit (Vitest):** pricing/tax/fees/rounding, triage outcomes, allergy + interaction checks, refill eligibility (expired, no refills, wrong patient, inactive), slot generation (Sunday closed), budget, wearable validation, Zod schemas (empty, bad email, negative qty, long text, future dates).
- **E2E (Playwright, against local Supabase):** all 18 scenarios in the brief, including passkey registration/sign-in with Chrome's virtual authenticator, role blocking, doctor approve/deny, checkout totals, stock decrement, persistence after reload, Spanish switch, accessibility mode.
- **Concurrency test:** two parallel `place_order` calls for the last unit → exactly one succeeds.
- **Design checks:** tasteskill copy-lint and gate on public pages, Vercel guideline review, Playwright screenshots at 1440 / 1024 / 768 / 390.
- Real Touch ID can't be automated; I'll verify it by hand with you on your Mac and say so in the test docs.

---

## 11. Technical limitations (stated in docs and UI)

- Apple Health/HealthKit is not reachable from a website → simulated sample import only.
- Payment is simulated; no card numbers are collected or stored.
- Not HIPAA compliant; fictional data only; no controlled substances.
- Triage and interaction rules are simplified demo logic, not medical guidance.
- Passkeys are per-domain; email recovery limited by Supabase's default email rate limit.
- Conference Wi-Fi may fail → backup: run the app locally against local Supabase (Docker) on the laptop, plus a screen recording.

---

## 12. What I need from you

1. **Supabase:** create a free project at supabase.com (region US East), then in a terminal run `npx supabase login` yourself (it opens your browser). After that I can link the project, push migrations and seed data, and write the keys into `.env.local` without printing them.
2. **Docker Desktop:** start it, so tests run against a local Supabase copy instead of your live data.
3. **GitHub:** OK to create a **private** repo `goodson-ordering` under `kesavgarg`?
4. **Vercel:** you're logged in; I'll create the project and set env vars when we reach deployment.
5. **Competition rules:** check your Georgia FBLA AI-use policy for this event. You must be able to explain every file; `docs/` will credit the tools used.

---

## 13. Build order

Phase 2 foundation (scaffold, tokens, Supabase schema + RLS + seed, auth + passkeys + roles, Vercel config) → Phase 3 customer ordering → Phase 4 pharmacy/health workflow → Phase 5 analytics, Spanish, accessibility, audit, heritage, reports, demo mode → Phase 6 tests, fixes, deploy, verify production. Each phase ends with tests run and screenshots checked before the next starts.
