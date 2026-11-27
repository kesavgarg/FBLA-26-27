# Testing

Results below are from real runs. Nothing is filled in ahead of time.

## How to run

```bash
npx supabase start        # local database (tests never touch the hosted project)
npm run seed:users        # demo accounts + demo data
npm run dev               # in another terminal
npm test                  # unit tests (Vitest)
npm run test:e2e          # browser + database tests (Playwright)
```

## Automated tests

### Unit tests — `tests/unit/`

| File | What it proves |
|---|---|
| `roles.test.ts` | Each role can open only its own areas; owner can open all; look-alike paths aren't protected areas; redirects can't leave the site |
| `validation-auth.test.ts` | Empty fields, invalid emails, short/long passwords, long or symbol-filled names (incl. SQL-injection-style text), malformed phones, impossible dates (Feb 30), future birth dates, under-13 and over-120 ages, missing consent |

### Browser tests — `tests/e2e/auth.spec.ts`

| Brief scenario | Test |
|---|---|
| 1. Customer registration and login | `registration validates input, then creates a customer account`, `wrong password shows a clear error` |
| 2. Passkey authentication | `a customer can add a passkey and sign in with it` (Chrome virtual authenticator) |
| 3–4. Customer cannot access staff / doctor pages | `a customer cannot open staff, doctor or owner pages` |
| 16. Spanish switching | `language switch changes the sign-in page to Spanish and persists` |
| 17. Accessibility mode | `accessibility mode enlarges text and persists after reload` |
| — | `signed-out visitors are sent to sign in`, `each role lands in its own workspace` |

### Checklist tests — `tests/e2e/checklist.spec.ts`

Added in Phase 6 to cover the guide's remaining checklist items: duplicate email, empty-cart checkout, cancel after preparing and status order, quotes / HTML / SQL-style text stored as plain text (and over-long text refused by the database itself), keyboard-only shopping, and a 320 px window.

### Database security tests — `tests/e2e/database-security.spec.ts`

These call Supabase directly with the public key, as an attacker could from a browser console:

- A customer cannot change their own role (column grant blocks it; `set_user_role` refuses).
- A customer sees only their own profile, orders and prescriptions, and no audit log.
- A customer cannot run the demo reset or insert a prescription.
- A signed-out visitor can read products but no private table.

## Build guide checklist (section 11) → tests

| Area | Case | Covered by |
|---|---|---|
| Accounts | Duplicate email | `checklist.spec.ts` › registering with an email that already has an account |
| | Wrong password, empty fields | `auth.spec.ts` › wrong password…, registration validates input… |
| | Role access | `auth.spec.ts` › a customer cannot open staff, doctor or owner pages; `owner-and-info.spec.ts` › customers cannot open owner pages |
| Cart and pricing | Empty cart checkout | `checklist.spec.ts` › checkout with an empty cart… |
| | Quantity 0 / negative / above stock | `ordering-rules.spec.ts` › negative or huge quantity, quantity above stock; `shopping.spec.ts` › full order |
| | Tax and rounding, delivery fee threshold | `ordering-rules.test.ts` (unit); `shopping.spec.ts` › cart totals |
| Orders | Double-click on submit | `ordering-rules.spec.ts` › repeat submit returns the same order |
| | Cancel after preparing, status order | `checklist.spec.ts` › orders move through statuses in order… |
| | Stock reduced exactly once | `ordering-rules.spec.ts` › checkout lowers stock exactly once |
| Rx gate | No approval, another patient's Rx, expired, no refills | `ordering-rules.spec.ts` › prescription item…, expired prescription… |
| Health flow | Each triage outcome, red flag | `health-rules.test.ts` (unit); `workflow.spec.ts` › red-flag answer shows the emergency screen |
| | Doctor denies, asks for info | `workflow.spec.ts` › alternative demo |
| | Patient allergic to item | `ordering-rules.spec.ts` › allergy match is blocked; `workflow.spec.ts` › main demo (penicillin class) |
| Input safety | Long text, quotes, special characters, SQL-style input | `validation-auth.test.ts` (unit); `checklist.spec.ts` › quotes, HTML and SQL-style text… |
| Usability | Text-size mode | `auth.spec.ts` › accessibility mode enlarges text; Large Text visual sweep below |
| | Keyboard only | `checklist.spec.ts` › keyboard only: skip link, then add to cart |
| | Small window | `checklist.spec.ts` › a very small window (320 px)…; visual sweeps below |
| | Clear error messages | checked in every form test above (each asserts the exact message) |
| Persistence | Reload keeps data; reset restores demo | `shopping.spec.ts` › persists after a refresh; `owner-and-info.spec.ts` › demo reset works |
| Demo | "Demo runs cleanly three times in a row" | `workflow.spec.ts` › main demo, run with `--repeat-each=3` (results below) |

## Results log

| Date | Suite | Result | Notes |
|---|---|---|---|
| 2026-11-25 | Unit (Vitest) | 22 / 22 passed | |
| 2026-11-25 | Browser auth (Playwright) | 6 / 8 → fixed → 8 / 8 passed | Found 2 real bugs: forms cleared after a server error (password and checkbox lost); Large Text setting lost on an immediate reload. Both fixed. |
| 2026-11-25 | Database security (Playwright) | 4 / 4 passed | |
| 2026-11-25 | Production build | passed | 13 routes, all dynamic |
| 2026-11-25 | Visual check | fixed | Header overflowed on narrow screens (Sign in button ignored `hidden`); skip link visible before focus. Both fixed; 375px and 1440px checked. |
| 2026-11-25 | Hosted deploy | found + fixed | Live sign-in bounced back to /login. Hosted Supabase gives the API no table access by default (local did), so the profile lookup failed. Added explicit GRANTs (migration 5) and made the local stack match the cloud (`auto_expose_new_tables: false`). Also granted the service role the admin functions (migration 4). |
| 2026-11-25 | Full suite after fixes (local, cloud-matching grants) | 22 unit + 12 browser/security passed | |
| 2026-11-25 | Redesign visual check | passed | Home + sign-in at 1440, 375 and 320 px (local and live): no sideways scroll. Wordmark sizing and glass contrast tuned after screenshots. |
| 2026-11-26 | Phase 3 unit tests | 44 / 44 passed | Pricing, tax rounding, delivery threshold, stock, budget, refill eligibility, tracker, error parsing, checkout/quantity validation |
| 2026-11-26 | Phase 3 database rules | 9 / 9 passed | Out of stock, quantity above stock, negative/huge quantity, allergy block, Rx gate (none + someone else's), expired / no-refill / duplicate refill, stock drops once + idempotent resubmit + cancel restores, ZIP outside area, **two buyers racing for the last 2 units: one wins, stock never negative** |
| 2026-11-26 | Phase 3 customer journey (browser) | found 2 + fixed → 6 / 6 passed | Bugs found: cart error showed a raw `{1}` placeholder (database sent too little detail; fixed in `set_cart_quantity`); refill confirmation disappeared on refresh (now shown on the card). |
| 2026-11-26 | Full suite | 44 unit + 27 browser/database passed | |
| 2026-11-26 | Visual check | fixed | Checkout overflowed by 391 px on phones (fieldsets grow to fit the pickup-day row; added `min-w-0`). Dashboard, product, cart, checkout, prescriptions, orders checked at 1440 and 390 px. |
| 2026-11-26 | Phase 4 unit tests | 57 / 57 passed | Triage (3 outcomes, red-flag priority, boundaries, no medicine names), allergy by ingredient and class, interactions, Apple Watch sample validation (ranges, types, future date, must be labelled simulated), workflow steps |
| 2026-11-26 | Phase 4 workflow (browser) | found 3 + fixed → 6 / 6 passed | **Full FBLA demo sequence passes**: survey + watch sample → consult → doctor approves (penicillin-class item blocked for Margaret) → Rx unlocked → checkout → staff prepares → ready → customer sees pharmacist's name. Also: emergency screen, ask-info → reply → deny (item stays locked), staff stock change, customers can't call doctor/staff functions, owner can view but not approve. Fixed: confirmations vanished after re-render (approval, reply); now shown in the page's own state. |
| 2026-11-26 | Full suite | 57 unit + 33 browser/database passed | One run under heavy load had timeouts (auth server 504 while build + dev + Docker competed); reran clean. Test timeouts raised for first-visit compiles on the dev server. |
| 2026-11-26 | Visual check | fixed | Staff queue overflowed by 379 px on phones (a screen-reader-only header label escaped the table's scroll box; made the box `relative`). Health, watch import, consults, doctor review, staff queue, refills, inventory checked at 1440 and 390 px. |
| 2026-11-26 | Phase 5 unit tests | 72 / 72 passed | Dashboard totals (cancelled orders excluded from revenue), empty days filled, top products, pickup/delivery split, consult and refill timing, no data without divide-by-zero, date ranges (impossible, reversed, future, too long), weekly and category reports, safe CSV (quotes, no spreadsheet formulas), help matching (accents, Spanish, plurals, admits when it doesn't know) |
| 2026-11-26 | Phase 5 owner + info (browser) | found 2 + fixed → 9 / 9 passed | Dashboard + date validation, reports + CSV download, demo reset (audited), grant/remove staff role takes effect, settings change the tax in the cart, usability log needs consent + code, customer blocked from owner pages and CSV, help assistant in both languages, About timeline in both languages. Fixed: owner dashboard crashed (a function was passed from the server to a client chart; now passed by name); help assistant missed "cancelo" and "refills" (added plural/verb matching). |
| 2026-11-26 | Full suite | 72 unit + 41 / 42 → fixed → 42 / 42 browser/database passed | The passkey test caught a regression from the header fix below: on 1280 px laptops "Sign out" had moved into the menu. Sign in / Sign out now stay in the header from 1024 px; rechecked 1280 and 1024 px with no overflow. Production build passed (37 routes). |
| 2026-11-26 | Visual check | fixed | Swept every public and role page at 1440, 1280, 390 and 320 px. Fixed: owner's header links overflowed at 1280 px (full menu now from 1536 px, menu button below); help and owner pages overflowed on phones (grid items now allowed to shrink); signed-in header +21 px at 320 px (wordmark text hidden under 360 px, still read by screen readers); Security page +42 px at 320 px (buttons may now wrap). After fixes no page scrolls sideways at any of the four widths. |
| 2026-11-26 | Phase 6 checklist tests | 6 / 6 passed | First run passed. Tightened the long-text test to check the exact database constraint that refuses it. |
| 2026-11-26 | Main demo three times in a row | 3 / 3 passed | `npx playwright test workflow.spec.ts -g "main demo" --repeat-each=3` |
| 2026-11-26 | Accessibility scan (axe-core 4.14, WCAG 2.1 A/AA + best practices) | found 5 + fixed → 0 issues | 29 pages across all four roles, in normal mode and with High Contrast + Large Text on. Fixed: logo link's spoken name didn't match its text; demo banner sat outside any landmark; skipped heading levels (shop, Security); chart bars used a label not allowed on that element; order-list links hid the date, status and total from screen readers. |
| 2026-11-26 | Large Text visual check | found 2 + fixed | Every page at 1280 and 390 px in Large Text mode. Fixed: signed-in header 6 px too wide on phones (wordmark words now hidden there, still read aloud); health page 47 px too wide (a screen-reader table ignored its 1 px width; wrapped it). After fixes: no sideways scroll. |
| 2026-11-26 | Phase 6 full suite | 72 unit + 47 / 48 → fixed → 48 / 48 browser/database passed | The one failure was the test itself: the owner chart became a labelled group of bars (accessibility fix), so the test now looks for a group, not an image. Lint, typecheck and production build passed. |

## Manual checks still to do

These can't be automated honestly, so the team does them by hand and records the result here:

- **Real Touch ID** on the presentation Mac, in Safari and Chrome. Automation uses a virtual authenticator because a real fingerprint prompt can't be scripted.
- **Passkey sign-in on the live site** for each demo account (passkeys are tied to each website address).
- **Password sign-in for each role on the live site**, and a click through every owner page (Claude did not sign in to the live site).
- **VoiceOver spot check** (Cmd + F5 on a Mac): sign in, add to cart, check out. The axe scan finds code problems, not how it feels to listen to.
- **Usability sessions** with real people, recorded in Owner → Usability tests. It starts empty; nothing is filled in ahead of time.
- **Rehearse the demo 3+ times with a timer** and record the backup video (see `docs/presentation.md`).
