# Feature map — where each feature lives

Updated at the end of every phase. Use it to answer "show us the code for X" in Q&A.

## Phase 2 — Foundation

| Feature | Files | Key functions / objects |
|---|---|---|
| Design tokens (white + baby blue, accessibility modes) | `src/app/globals.css` | `@theme` tokens, `html[data-text="large"]`, `html[data-contrast="high"]`, `html[data-motion="reduce"]` |
| Reusable UI | `src/components/ui/*` | `Button`, `ButtonLink`, `Field`, `Input`, `Alert`, `Card`, `Badge`, `StatTile` |
| Site layout | `src/app/layout.tsx`, `src/components/layout/*` | `RootLayout`, `SiteHeader`, `navLinksFor`, `MobileMenu`, `SiteFooter`, `DemoBanner`, `WorkspaceHeader` |
| English / Spanish | `src/lib/i18n/en.ts`, `es.ts`, `index.ts`, `server.ts`, `provider.tsx` | `Dictionary` type, `toLocale`, `getDictionary`, `useI18n`, `LanguageSwitch` |
| Accessibility settings | `src/lib/preferences/display.ts`, `actions.ts`, `components/layout/preferences-menu.tsx` | `encodeDisplay`, `decodeDisplay`, `displayAttributes`, `setDisplayPrefsAction`, `AccessibilityMenu` |
| Database schema | `supabase/migrations/20261125000001_schema.sql` | 19 tables, 9 enums, CHECK constraints, indexes |
| Database security | `supabase/migrations/20261125000002_security.sql` | `current_user_role`, `is_staff`, `is_doctor`, `is_owner`, `handle_new_user`, `guard_profile_role`, `set_user_role`, `log_audit`, RLS policies, column grants |
| Demo data + reset | `supabase/migrations/20261125000003_demo_data.sql`, `scripts/seed-demo-users.mjs` | `demo_user_id`, `ensure_pickup_slots`, `reset_demo_data` |
| Supabase clients | `src/lib/supabase/server.ts`, `browser.ts`, `admin.ts`, `env.ts` | `createSupabaseServerClient`, `getSupabaseBrowserClient`, `createSupabaseAdminClient` (server-only) |
| Session + roles | `src/lib/auth/session.ts`, `roles.ts`, `src/proxy.ts` | `getSessionUser`, `requireRole`, `canAccessPath`, `homePathForRole`, `safeNextPath`, `proxy` |
| Passkey sign-in (Touch ID) | `src/components/auth/passkey-sign-in.tsx`, `src/app/auth/continue/route.ts` | `PasskeySignIn` → `supabase.auth.signInWithPasskey()` |
| Passkey management | `src/components/auth/passkey-manager.tsx`, `src/app/account/security/page.tsx` | `PasskeyManager` → `registerPasskey`, `passkey.list`, `passkey.delete` |
| Password sign-in, registration, recovery | `src/lib/auth/actions.ts`, `src/components/auth/forms.tsx`, `src/app/(auth)/*`, `src/app/auth/callback/route.ts` | `signInWithPasswordAction`, `registerAction`, `recoverAction`, `signOutAction` |
| Input validation (auth) | `src/lib/validation/auth.ts` | `registerSchema`, `dateOfBirthSchema`, `phoneSchema`, `ageOn`, `toFieldErrors` |
| Role workspaces | `src/app/account`, `staff`, `doctor`, `owner` (each `layout.tsx` calls `requireRole`) | |
| Unit tests | `tests/unit/roles.test.ts`, `tests/unit/validation-auth.test.ts` | |
