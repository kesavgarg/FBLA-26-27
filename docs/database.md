# Database schema

Supabase Postgres 17. Source of truth: `supabase/migrations/`. All data is fictional.

## Design choices

- **Money in integer cents** (`price_cents`, `total_cents`) — no floating-point rounding errors. `orders.total_cents` has a CHECK that it equals subtotal + tax + fee.
- **Enums for every status** (`order_status`, `consult_status`, …) — the database refuses an invalid state.
- **CHECK constraints for semantic rules** — severity 1–10, quantity 1–20, stock ≥ 0, prescription expiry after written date, a pickup order must have a slot and a delivery order an address.
- **Snapshots** — a consult stores the allergies and medications the patient had *when they asked*, so the doctor reviews exactly what was submitted.
- **Insert-only audit log** — no update or delete permission exists on `audit_logs`.

## Tables

| Table | Purpose | Key relationships |
|---|---|---|
| `profiles` | One row per user: name, role, contact | `id` → `auth.users.id` |
| `user_preferences` | Language, accessibility, budget limit | `profile_id` → profiles |
| `family_members` | People a caregiver orders for | `owner_id` → profiles |
| `allergies` | Substance + reaction + severity | profile **or** family member (exactly one) |
| `current_medications` | What the patient already takes | `profile_id` → profiles |
| `products` | Catalog (EN + ES text), price, Rx flag, active ingredient | — |
| `inventory` | Stock count + low-stock threshold | `product_id` → products (1:1) |
| `store_settings` | Tax rate, delivery fee, free-delivery threshold, hours, slot size | single row (`id = 1`) |
| `pickup_slots` | 30-minute pickup windows with capacity | — |
| `symptom_logs` | Symptom journal + triage result + simulated wearable data | `patient_id` → profiles |
| `consult_requests` | Customer → doctor request; decision and notes | patient, doctor → profiles; symptom log; requested product |
| `prescriptions` | Created only by doctor approval (or demo seed) | patient, prescriber → profiles; product; consult |
| `orders` | Order header, totals, fulfillment, status | customer → profiles; pickup slot |
| `order_items` | Lines: product, qty, unit price, linked prescription | order, product, prescription |
| `refill_requests` | Refill of an existing prescription | prescription, patient, order |
| `messages` | Notes on an order, refill or consult thread | exactly one thread; sender → profiles |
| `audit_logs` | Who did what, when | actor → profiles |
| `usability_sessions` | Real usability test results (starts empty) | recorded_by → profiles |

## Who can see what (Row Level Security)

| Data | Customer | Staff | Doctor | Owner |
|---|---|---|---|---|
| Own profile, family, allergies, medications | read/write | read | read | read |
| Products, stock, store hours, slots | read | read/write | read | read/write |
| Symptom logs | own | — | read | read |
| Consult requests | own (create, read) | — | read; decide via function | read |
| Prescriptions | own (read) | read | read | read |
| Orders + items | own (read) | read; status via function | — | read |
| Messages | threads they're part of | order/refill threads | consult threads | — |
| Audit log | — | — | — | read |
| Usability sessions | — | — | — | read/write |

Customers can update only `full_name`, `phone`, `date_of_birth` on their profile (column-level grant). A trigger blocks any role change unless an owner makes it through `set_user_role()`, and owners cannot change their own role.

## Database functions

| Function | What it does | Who may call |
|---|---|---|
| `current_user_role()`, `is_staff()`, `is_doctor()`, `is_owner()`, `is_care_team()` | Role lookups used by policies | everyone (they only read the caller's own role) |
| `handle_new_user()` | Trigger: creates a `customer` profile for each new Auth user | trigger only |
| `guard_profile_role()` | Trigger: blocks unauthorised role changes | trigger only |
| `set_user_role(user, role)` | Owner changes someone's role; audit-logged | owner |
| `log_audit(action, type, id, details)` | Write an audit entry as the current user | signed-in users |
| `ensure_pickup_slots(days)` | Build slots inside store hours (Sunday closed) | signed-in users |
| `reset_demo_data()` | Restore the fictional demo state (keeps usability results) | owner / server |

Phases 3–4 add `place_order()` (atomic checkout with row locks), refill, consult-decision and order-status functions.
