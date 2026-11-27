# User guide

A short guide for each kind of user. Everything in the app is fictional demo data.
Live site: https://goodson-ordering.vercel.app · Help inside the app: **Help** in the top menu (it has a question box that answers in English or Spanish).

## Everyone

- **Language:** the EN / ES switch in the header (in the ☰ menu on phones). Your choice is remembered.
- **Accessibility:** the person icon in the header turns on **Large text**, **High contrast** and **Reduce motion**. These are remembered too.
- **Keyboard:** press Tab once on any page to show **Skip to content**. Every button and link can be reached with Tab and used with Enter.
- **Signing in:** use **Sign in with passkey** (Touch ID) if you've added one, or your email and password. **Can’t sign in?** sends a one-time sign-in link to your email.

## Customers

| I want to… | Where | What happens |
|---|---|---|
| Find a product | **Shop** | Search, filter by category, sort by price or name. Sold-out items say so; items you're allergic to are marked "Blocked for your safety". |
| Buy something | Product → **Add to cart** → **Cart** → **Go to checkout** | Choose **Pickup** (pick a time) or **Delivery** (Cumming-area ZIP codes 30040, 30041, 30028). Tax applies to non-prescription items only. Payment is simulated; no card is asked for. |
| Set a spending limit | **Cart** → Spending limit | Checkout is blocked if the cart is over your limit. |
| Track or cancel an order | **My account → Orders** | The tracker shows each step. You can cancel until the pharmacy starts preparing it. |
| Refill a prescription | **My account → Prescriptions** | Each card says whether a refill is possible and, if not, why (expired, no refills left, already in progress). |
| Check a symptom | **Health → Start a symptom check** | Answer a few questions. You'll see one of three results: *call 911 / Poison Control*, *a clinician should look at this* (send it to the doctor), or *self-care ideas*. The optional Apple Watch step uses **simulated sample data**, clearly labelled. |
| Follow a doctor request | **Health → Doctor requests** | Shows where your request is. If the doctor asks a question, reply there. When approved, the prescription item unlocks for you only. |
| Add a passkey | **My account → Security** | Touch ID adds a passkey. You can have several and remove old ones. |

## Pharmacy staff

- **Orders** (staff home): filter by status or search by order number or name. Open an order to see the items, the safety check (allergies and interactions) and messages. Move it forward one step at a time: *Being prepared → Ready for pickup / Out for delivery → Completed*. The customer sees each change.
- **Refills:** move each request forward or reject it.
- **Inventory:** change price or stock, mark an item unavailable, or add a new product. Low-stock items are highlighted. Every change is written to the audit log.

## Doctor (simulated prescriber)

- **Inbox:** new requests first. Open one to see the symptoms, the watch sample if any, allergies and current medicines. Items that would clash with an allergy are greyed out.
- Choose **Approve** (pick the item, directions and refills), **Ask for information**, or **Deny**. Each needs a short note for the patient. Only an approval creates a prescription.

## Owner

| Page | Use |
|---|---|
| **Overview** | Orders, revenue, top products, pickup vs delivery, consult and refill timing for a date range. Demo data is labelled simulated. |
| **Reports** | Group by day, week, category or product; choose columns; **Download CSV** or **Print**. |
| **Audit log** | Who did what and when (orders, approvals, stock, role changes, resets). |
| **Users** | Give or remove staff / doctor / owner access. |
| **Settings** | Tax rate, delivery fee, free-delivery threshold. |
| **Usability tests** | Record real test sessions with a participant code (never a name) and consent. Starts empty. |
| **Presenter guide** | The step-by-step demo script, alternate failure demos, and **Reset demo data**. |
