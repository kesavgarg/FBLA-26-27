# Goodson Drug Co. — Digital Pharmacy Ordering Platform

FBLA Introduction to Programming 2026–27 · Topic: **Local Business Digital Ordering System**

> **Independent student project.** Goodson Drug Co. (116 W. Maple St., Cumming, GA) does not use, sponsor or endorse this software. All patients, doctors, prescriptions, products and prices are **fictional**. This is not a real pharmacy system, is not HIPAA compliant, and gives no medical advice.

Goodson Drug Co. has served Cumming since 1959 under the motto *"We Serve to Serve Again."* This platform carries that service online: customers browse and order, request refills, log symptoms and request a consult, and a (simulated) doctor must approve before any prescription item can be bought.

**Build status:** Phase 2 (foundation) complete and deployed at https://goodson-ordering.vercel.app — accounts, passkeys, roles, database, security, redesigned home and sign-in. Ordering, health workflow and analytics arrive in Phases 3–5. See [docs/00-phase1-plan.md](docs/00-phase1-plan.md).

---

## Quick start (local development)

Requirements: Node.js 20+, Docker Desktop (running), a Mac with Safari or Chrome for Touch ID.

```bash
npm install
npx supabase start          # local database + auth in Docker (first run downloads images)
npm run seed:users          # creates the 5 demo accounts and loads demo data
npm run dev                 # http://localhost:3000
```

`.env.local` must point at the local stack (values printed by `npx supabase status`):

| Variable | Where it's used | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server (limited by Row Level Security) | no |
| `SUPABASE_SERVICE_ROLE_KEY` | server only: account creation | **yes** |
| `DEMO_USER_PASSWORD` | seed script + tests | **yes** |

Never commit `.env*.local`. `.gitignore` already excludes them.

## Demo accounts

All share the password in `DEMO_USER_PASSWORD`. Add a Touch ID passkey to each under **My account → Security**, then the passkey picker switches roles with one touch.

| Role | Email | Who |
|---|---|---|
| Customer | `margaret@goodson-demo.example` | Margaret Ellis, 68 — refills, aspirin allergy |
| Customer | `daniel@goodson-demo.example` | Daniel Ortiz — parent, pending consult (deny demo) |
| Pharmacy staff | `pharmacist@goodson-demo.example` | Dana Whitfield, PharmD |
| Doctor (simulated) | `doctor@goodson-demo.example` | Dr. Priya Raman |
| Owner | `owner@goodson-demo.example` | Lee Hartwell |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the app on localhost:3000 |
| `npm run build` / `npm start` | Production build / serve it |
| `npm test` | Unit tests (Vitest) — pure business rules |
| `npm run test:e2e` | Browser tests (Playwright) against localhost + local Supabase |
| `npm run lint` / `npm run typecheck` | Code quality checks |
| `npm run seed:users` | Create demo accounts + run `reset_demo_data()` |
| `npm run db:types` | Regenerate TypeScript types from the local database |

## How it's built

- **Next.js 16 + React 19 + TypeScript** — Server Components render pages; Server Actions handle forms. Business rules live in `src/lib`, separate from UI.
- **Supabase Postgres** — schema, Row Level Security and functions in `supabase/migrations`.
- **Supabase Auth with passkeys** — Touch ID sign-in via WebAuthn. Biometrics never leave the device; only a public key is stored.
- **Three layers of protection** — role checks in server code (`requireRole`), Row Level Security in the database, and transactional database functions for multi-step changes.

Where each feature lives: [docs/feature-map.md](docs/feature-map.md).

## Libraries

| Library | Purpose | License |
|---|---|---|
| Next.js, React | Web framework, UI | MIT |
| Tailwind CSS | Styling | MIT |
| @supabase/supabase-js, @supabase/ssr | Database, auth, session cookies | MIT |
| Zod | Input validation | MIT |
| lucide-react | Icons | ISC |
| Vitest, Playwright | Testing | MIT, Apache-2.0 |
| Inter, Fraunces (Google Fonts via next/font) | Typefaces | SIL Open Font License |

## Credits and outside resources

- Business facts: public reporting (Forsyth County News; business listings) as summarized in the project's research guide. Facts may change and were not confirmed with the business.
- Design references: [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) (MIT) Apple/Stripe/Supabase notes in `design-reference/`; [tasteskill](https://www.tasteskill.dev/) and Vercel's [web-design-guidelines](https://github.com/vercel-labs/agent-skills) review rules.
- Visual effects (adapted, see file headers): **Prismatic Liquid Glass** shader generated with [Shader Studio](https://shaderstudio.com) → `src/components/effects/liquid-glass.tsx`; **Vector Wordmark** by Originkit → `src/components/effects/vector-wordmark.tsx`. Both supplied by the team, changed to be decorative-only, respect reduced motion, and fall back to CSS without WebGL.
- Design process skills: [image-to-code](https://github.com/Leonxlnx/imagegen-skills) (used with the team's template screenshots as the reference image), tasteskill, web-design-guidelines, Playwright CLI.
- Development assistance: built with help from an AI coding assistant (Claude Code). The student team reviewed the code and must be able to explain every part of it.
- No Goodson Drug Co. logos or photographs are used. The "G" mark is an original design for this project.

## Limitations

See the plan's §11. Short version: fictional data only, simulated payments, simulated doctor, no HealthKit access from a website, passkeys bound to one domain per Supabase project.
