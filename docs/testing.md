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

### Database security tests — `tests/e2e/database-security.spec.ts`

These call Supabase directly with the public key, as an attacker could from a browser console:

- A customer cannot change their own role (column grant blocks it; `set_user_role` refuses).
- A customer sees only their own profile, orders and prescriptions, and no audit log.
- A customer cannot run the demo reset or insert a prescription.
- A signed-out visitor can read products but no private table.

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

## Manual checks still to do

- **Real Touch ID** on the presentation Mac (Safari and Chrome). Automation uses a virtual authenticator because a real fingerprint prompt can't be scripted.
- Passkey sign-in on the deployed Vercel site (passkeys are tied to each domain) — needs passkeys switched on in the hosted Supabase dashboard first.
- Password sign-in for each role on the live site (done by the team, not automated against production).
